<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { addHoverCallback, addZoomCallback, createFeatures, createMap, updateColors } from '@/map'
import { fetchCellColumns, fetchImageCells } from '@/api'
import type { Image } from '@/types'
import {
  status, cells, cellFeature, pointFeature,
  cellDrawerHeight, cellDrawerResizing,
  tooltipEnabled, tooltipContent, tooltipPosition,
  colormapName, map, fetchProgress,
  attributeOptions, cellColumns,
  colorBy, colorLegend,
  annotationLayer, annotationMode,
} from '@/store'

import CellDrawer from '@/CellDrawer.vue'
import ColorOptions from '@/ColorOptions.vue'
import { getCellAttribute } from '@/utils'
import HistogramMenu from '@/HistogramMenu.vue'
import FilterMenu from '@/FilterMenu.vue'
import TransformMenu from '@/TransformMenu.vue'

const props = defineProps<{
  id: number
  image: Image
}>()

const ZOOM_THRESHOLD = 7
const defaultColor = '#00ff00'
const defaultAttributes = [
  'classification', 'orientation', 'width', 'height', 'x', 'y',
]
const tooltipExclude = ['id', 'vector_text']
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
  })
}

function getCells() {
  status.value = 'Fetching cell data...'
  fetchImageCells(props.image.id).then((data) => {
    cells.value = data
  })
  fetchCellColumns().then((data) => {
    cellColumns.value = data
    attributeOptions.value = [...defaultAttributes, ...data]
  })
}

function drawCells() {
  if (cellFeature.value && pointFeature.value) {
    cellFeature.value.data(cells.value).draw()
    pointFeature.value.data(cells.value).draw()
    updateColors()
    cellDrawerHeight.value = 80
    status.value = undefined
  }
}

function onZoom({ zoomLevel }: any) {
  cellFeature.value.visible(zoomLevel > ZOOM_THRESHOLD)
  pointFeature.value.visible(zoomLevel <= ZOOM_THRESHOLD)
  map.value.draw()
}

function onHoverOver({ data, mouse }: any) {
  if (tooltipEnabled.value) {
    tooltipContent.value = Object.fromEntries(
      Object.entries(data).filter(([k]) => !tooltipExclude.includes(k)),
    )
    if (colorBy.value && !tooltipContent.value[colorBy.value]) {
      tooltipContent.value[colorBy.value] = getCellAttribute(data, colorBy.value)
    }
    tooltipPosition.value = mouse.map
  }
}

function resizeCellDrawer(e: MouseEvent) {
  if (cellDrawerResizing.value) cellDrawerHeight.value = window.innerHeight - e.y
}

onMounted(init)
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
      :style="{height: `calc(100% - ${cellDrawerHeight + 70}px) !important`}"
    />
    <div
      class="status"
      :style="{bottom: cellDrawerHeight + (colorLegendShown ? 180 : 80) + 'px'}"
    >
      <v-card
        v-if="status"
        class="px-4 py-2"
      >
        {{ status }}
        <v-progress-linear
          v-if="fetchProgress"
          :model-value="fetchProgress"
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
      :style="{bottom: cellDrawerHeight + 55 + 'px'}"
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
      <v-tooltip>
        <template #activator="{ props: tooltipProps }">
          <v-btn
            icon
            v-bind="tooltipProps"
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
        </template>
        <span>Filter/Select by Attribute</span>
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
      <v-btn
        v-tooltip="'Toggle Tooltip'"
        icon
        @click="tooltipEnabled = !tooltipEnabled"
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
    </div>
    <v-card
      v-if="tooltipEnabled && tooltipContent && tooltipPosition"
      :style="{top: tooltipPosition.y + 'px', left: tooltipPosition.x + 'px'}"
      class="tooltip"
    >
      <div
        v-for="[key, value] in Object.entries(tooltipContent)"
        :key="key"
      >
        {{ key }}: {{ value }}
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
}
.cell-drawer {
    width: 100%;
    bottom: 70px;
    border-top: 2px solid black !important;
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
    top: 15px;
    left: 10px;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
}
.tooltip {
    position: absolute !important;
    width: fit-content;
    padding: 10px !important;
}
.menu-title {
    background-color: #ddd;
    padding: 5px 10px;
    width: 100%
}
</style>
