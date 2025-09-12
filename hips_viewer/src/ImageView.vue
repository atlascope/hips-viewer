<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue'
import { addHoverCallback, addMouseOffCallback, addZoomCallback, createFeatures, createMap, updateColors } from '@/map'
import { processCellVectors, cellDistribution } from '@/utils'
import { fetchCellColumns, fetchImageCells } from '@/api'
import type { Image } from '@/types'
import {
  status, cells, cellFeature, pointFeature,
  cellDrawerHeight, cellDrawerResizing,
  tooltipEnabled, tooltipContent, tooltipPosition,
  colormapName, map, statusProgress,
  attributeOptions, cellColumns,
  colorBy, colorLegend,
  annotationLayer, annotationMode,
  cellVectorsProcessed, clusterIds,
  showDensityHeatmap,
  heatmapFeature,
} from '@/store'
import { colormaps } from '@/colors'

import CellDrawer from '@/CellDrawer.vue'
import ColorOptions from '@/ColorOptions.vue'
import HistogramMenu from '@/HistogramMenu.vue'
import FilterMenu from '@/FilterMenu.vue'
import TransformMenu from '@/TransformMenu.vue'

import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Tooltip, Legend, ArcElement } from 'chart.js'

ChartJS.register(Tooltip, Legend, ArcElement)

const chartOptions = {
  responsive: true,
}
const chartData = ref()

const props = defineProps<{
  id: number
  image: Image
}>()

const cellsVisible = ref(false)
const ZOOM_THRESHOLD = 7
const defaultColor = '#00ff00'
const defaultAttributes = [
  'classification', 'orientation', 'width', 'height', 'x', 'y',
]
const tooltipExclude = computed(() => ['id', 'vector', ...(cellColumns.value || [])])
const mapId = computed(() => 'map-' + props.id)
const colorLegendShown = computed(() =>
  cells.value && colorBy.value && colormapName.value
  && colorLegend.value && colorLegend.value.categories().length,
)

function init() {
  createMap(mapId.value, props.image.tile_url).then(() => {
    createFeatures(defaultColor, ZOOM_THRESHOLD)
    addZoomCallback(onZoom)
    addHoverCallback(onHoverOver, cellFeature.value)
    addHoverCallback(onHoverCluster, pointFeature.value)
    addMouseOffCallback(() => {
      tooltipPosition.value = undefined
    }, pointFeature.value)
  })
}

async function getCells() {
  status.value = 'Fetching cell data...'
  const columnData = await fetchCellColumns()
  cellColumns.value = columnData
  attributeOptions.value = [...defaultAttributes, ...columnData]

  const cellData = await fetchImageCells(props.image.id)
  cells.value = cellData

  await new Promise(r => setTimeout(r, 1000))
  await processCellVectors(cellData, columnData)
}

function drawCells() {
  if (cellFeature.value && pointFeature.value && heatmapFeature.value) {
    cellFeature.value.data(cells.value).draw()
    pointFeature.value.data(cells.value).draw()
    heatmapFeature.value.data(cells.value).draw()
    updateColors()
    cellDrawerHeight.value = 80
    status.value = undefined
  }
}

function onZoom({ zoomLevel }: any) {
  cellsVisible.value = zoomLevel > ZOOM_THRESHOLD
  cellFeature.value.visible(cellsVisible.value)
  pointFeature.value.visible(!cellsVisible.value)
  map.value.draw()
}

function onHoverCluster({ data, mouse }: any) {
  if (!cellsVisible.value) {
    let cellIds = []
    const cluster = data.obj
    if (cluster) {
      cellIds = clusterIds.value ? clusterIds.value[cluster._leaflet_id] : []
    }
    else {
      cellIds = [data.id]
    }

    const cellData = cellDistribution(new Set(cellIds), 'classification')

    const colormap = colormaps.find(cmap => cmap.name === colormapName.value)
    if (!colormap) return console.error('colormap not found:', colormapName.value)

    const labels = cellData.map(c => c.key)
    const colors = cellData.map(c => c.color(colormap))
    const counts = cellData.map(c => c.cellIds ? c.cellIds.size : 0)

    chartData.value = {
      labels,
      datasets: [{
        label: 'Count',
        data: counts,
        backgroundColor: colors,
      }],
    }

    tooltipPosition.value = mouse.map
  }
}

function onHoverOver({ data, mouse }: any) {
  if (cellsVisible.value) {
    tooltipContent.value = Object.fromEntries(
      Object.entries(data).filter(([k]) => !tooltipExclude.value.includes(k)),
    )
    if (colorBy.value && !tooltipContent.value[colorBy.value]) {
      tooltipContent.value[colorBy.value] = data[colorBy.value]
    }
    tooltipPosition.value = mouse.map
  }
}

function resizeCellDrawer(e: MouseEvent) {
  if (cellDrawerResizing.value) {
    cellDrawerHeight.value = window.innerHeight - e.y
    if (map.value) {
      const node = map.value.node()
      map.value.size({ width: node.width(), height: node.height() })
    }
  }
}

function toggleTooltip() {
  tooltipEnabled.value = !tooltipEnabled.value
  tooltipPosition.value = undefined
}

onMounted(init)
watch(() => props.id, init)
watch(cells, drawCells)
</script>

<template>
  <div
    class="map-container"
    @mousemove="resizeCellDrawer"
  >
    <div
      :id="mapId"
      class="map"
      :style="{height: `calc(100% - ${cellDrawerHeight}px) !important`}"
    />
    <div
      class="status"
      :style="{bottom: cellDrawerHeight + (colorLegendShown ? 110 : 10) + 'px'}"
    >
      <v-card
        v-if="status"
        class="px-4 py-2"
      >
        {{ status }}
        <v-progress-linear
          v-if="statusProgress"
          :model-value="statusProgress"
        />
      </v-card>
      <v-btn
        v-else-if="!cells"
        color="black"
        @click="getCells"
      >
        Fetch Cell Data
      </v-btn>
    </div>
    <span
      class="material-symbols-outlined cell-drawer-resize"
      :style="{bottom: cellDrawerHeight - 15 + 'px'}"
      @mousedown="cellDrawerResizing = true"
      @mouseup="cellDrawerResizing = false"
    >
      unfold_more
    </span>
    <v-card
      class="cell-drawer"
      :style="{height: cellDrawerHeight + 'px'}"
    >
      <CellDrawer
        v-if="cells?.length"
        :cells="cells"
        :height="cellDrawerHeight"
        :tile-url="props.image.tile_url"
      />
    </v-card>
    <div
      v-if="cells"
      class="actions"
    >
      <v-tooltip>
        <template #activator="{ props: tooltipProps }">
          <v-btn
            icon
            v-bind="tooltipProps"
          >
            <span class="material-symbols-outlined">transform</span>
            <v-menu
              activator="parent"
              location="end"
              :close-on-content-click="false"
            >
              <TransformMenu />
            </v-menu>
          </v-btn>
        </template>
        <span>UMAP Transforms</span>
      </v-tooltip>
      <v-tooltip>
        <template #activator="{ props: tooltipProps }">
          <div
            v-bind="tooltipProps"
          >
            <v-btn
              icon
              :disabled="cellVectorsProcessed === false"
            >
              <span class="material-symbols-outlined">filter_alt</span>
              <v-menu
                activator="parent"
                location="end"
                :close-on-content-click="false"
              >
                <FilterMenu />
              </v-menu>
            </v-btn>
          </div>
        </template>
        <span v-if="cellVectorsProcessed">
          Filter/Select by Attribute
        </span>
        <span v-else>
          Filter unavailable until vector data is processed
        </span>
      </v-tooltip>
      <v-tooltip>
        <template #activator="{ props: tooltipProps }">
          <v-btn
            icon
            v-bind="tooltipProps"
          >
            <span class="material-symbols-outlined">bar_chart_4_bars</span>
            <v-menu
              activator="parent"
              location="end"
              :close-on-content-click="false"
            >
              <HistogramMenu />
            </v-menu>
          </v-btn>
        </template>
        <span>Cell Histogram</span>
      </v-tooltip>
      <v-tooltip>
        <template #activator="{ props: tooltipProps }">
          <v-btn
            icon
            v-bind="tooltipProps"
          >
            <span class="material-symbols-outlined">palette</span>
            <v-menu
              activator="parent"
              location="end"
              :close-on-content-click="false"
            >
              <ColorOptions />
            </v-menu>
          </v-btn>
        </template>
        <span>Color Options</span>
      </v-tooltip>
      <v-btn
        v-tooltip="'Toggle Tooltip'"
        icon
        @click="toggleTooltip"
      >
        <span class="material-symbols-outlined">
          {{ tooltipEnabled ? 'subtitles' : 'subtitles_off' }}
        </span>
      </v-btn>
      <v-btn
        v-tooltip="'Select Mode'"
        icon
        :color="annotationMode ? 'black' : 'white'"
        @click="() => annotationLayer.mode('polygon')"
      >
        <span class="material-symbols-outlined"> lasso_select </span>
      </v-btn>
      <v-btn
        v-tooltip="'Toggle Density Heatmap'"
        icon
        @click="showDensityHeatmap = !showDensityHeatmap"
      >
        <span class="material-symbols-outlined">
          {{ showDensityHeatmap ? 'grid_on' : 'grid_off' }}
        </span>
      </v-btn>
    </div>
    <v-card
      v-if="tooltipEnabled && tooltipPosition"
      :style="{top: tooltipPosition.y + 'px', left: tooltipPosition.x + 'px'}"
      class="tooltip"
    >
      <div v-if="cellsVisible && tooltipContent">
        <div
          v-for="[key, value] in Object.entries(tooltipContent)"
          :key="key"
        >
          <strong>{{ key }}:</strong> {{ value }}
        </div>
      </div>
      <div v-else>
        <Doughnut
          :options="chartOptions"
          :data="chartData"
        />
      </div>
    </v-card>
  </div>
</template>

<style>
.status, .cell-drawer, .cell-drawer-resize {
    padding: 2px 8px !important;
    position: absolute !important;
}
.status {
    right: 10px;
    width: fit-content;
    z-index: 3;
}
.cell-drawer {
    width: 100%;
    bottom: 0px;
    border-top: 2px solid black !important;
    z-index: 3;
}
.cell-drawer-resize {
    width: 100%;
    text-align: center;
    z-index: 2;
    cursor: ns-resize;
    user-select: none;
}
.actions {
    position: absolute;
    top: 65px;
    left: 10px;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    z-index: 3;
}
.tooltip {
    position: absolute !important;
    width: fit-content;
    padding: 10px !important;
    z-index: 3;
}
.menu-title {
    background-color: #ddd;
    padding: 5px 10px;
    width: 100%
}
</style>
