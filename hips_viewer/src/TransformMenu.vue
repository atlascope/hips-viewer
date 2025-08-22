<script setup lang="ts">
import createScatterplot from 'regl-scatterplot'
import { onMounted, ref, computed, watch } from 'vue'
import { fetchUMAPTransformResults, fetchUMAPTransforms } from '@/api'
import {
  umapTransformResults, umapTransforms,
  selectedCellIds, cells, filterMatchCellIds,
  cellColors, selectedColor,
} from './store'
import type { UMAPTransform, UMAPResult, TreeItem, Cell, ScatterPoint } from './types'
import { normalizePoints, rgbToHex } from './utils'

const scatterCanvas = ref()
const scatterplot = ref()
const resultSelection = ref()
const selectedResult = ref<UMAPResult>()

const nestedResultOptions = computed(() => {
  const nested: TreeItem[] = []
  umapTransforms.value?.forEach((transform: UMAPTransform) => {
    const parent: TreeItem = { title: `UMAPTransform ${transform.id}`, subtitle: transform.name, children: [] }
    nested.push(parent)
    const results = umapTransformResults.value[transform.id]
    if (results?.length) {
      results.forEach((result: UMAPResult) => {
        parent.children?.push({ title: `UMAPResult ${result.id}`, value: result })
      })
    }
    else {
      parent.children?.push({
        title: 'No results exist. Create results by running the `apply_transform ' + transform.id + '` management command on the server.',
        disabled: true,
      })
    }
  })
  return nested
})

const imageCellIds = computed(() => new Set(cells.value.map((cell: Cell) => cell.id)))

const scatterData = computed(() => {
  if (!selectedResult.value) return undefined
  const currentData = selectedResult.value.scatterplot_data.filter((p: ScatterPoint) => {
    return imageCellIds.value.has(p.id) && (!filterMatchCellIds.value.size || filterMatchCellIds.value.has(p.id))
  })
  return normalizePoints(currentData)
})

const scatterSelectedIndices = computed(() => scatterData.value?.map((p, i) => {
  if (selectedCellIds.value.has(p.id)) return i
  return undefined
}).filter(i => i))

const scatterColors = computed(() => scatterData.value?.map((p) => {
  return rgbToHex(cellColors.value[p.id])
}))

function init() {
  const canvas = scatterCanvas.value
  const { width, height } = canvas.getBoundingClientRect()
  scatterplot.value = createScatterplot({
    canvas,
    width,
    height,
    pointSize: 3,
    pointSizeSelected: 0,
    lassoOnLongPress: true,
    lassoMinDist: 1,
    lassoMinDelay: 0,
    lassoColor: selectedColor.value,
  })
  scatterplot.value.subscribe('select', scatterSelect)
  scatterplot.value.subscribe('deselect', () => scatterSelect({ points: [] }))
  fetchUMAPTransforms().then((transforms) => {
    umapTransforms.value = transforms
    transforms.forEach((t: UMAPTransform) => {
      fetchUMAPTransformResults(t.id).then((results) => {
        umapTransformResults.value[t.id] = results
      })
    })
  })
}

function selectResult(selected: any) {
  if (resultSelection.value) resultSelection.value.blur()
  selectedResult.value = selected
}

function scatterSelect({ points }: any) {
  if (!scatterData.value) return
  const selected = scatterData.value.map((p, i) => {
    if (points.includes(i)) return p.id
    return undefined
  }).filter(id => id) as number[]
  selectedCellIds.value = new Set(selected)
}

function updateScatterSelection() {
  if (!scatterData.value) return
  const selectedIndexes = scatterData.value.map((p, i) => {
    if (selectedCellIds.value.has(p.id)) return i
    return undefined
  }).filter(i => i)
  scatterplot.value.select(selectedIndexes, { preventEvent: true })
}

function drawResult() {
  scatterplot.value.clear()
  if (scatterData.value) {
    const drawPoints = scatterData.value.map((p, i) => ([p.x, p.y, i]))
    scatterplot.value.draw(drawPoints, { select: scatterSelectedIndices.value })
    scatterplot.value.zoomToArea(
      { x: 0, y: 0, width: 1.2, height: 1.2 },
      { transition: true },
    )
    scatterplot.value.set({
      colorBy: 'valueA',
      pointColor: scatterColors.value,
    })
  }
}

onMounted(init)
watch(selectedResult, () => {
  setTimeout(drawResult, 10)
})
watch(selectedCellIds, updateScatterSelection)
</script>

<template>
  <v-card variant="outlined">
    <div class="menu-title">
      Transform Results
    </div>
    <v-card-text style="width: 350px">
      <div
        v-if="!umapTransforms"
      >
        <v-progress-linear
          indeterminate
          class="centered-row"
        />
        <v-label class="centered-row">
          Fetching UMAP Transforms...
        </v-label>
      </div>
      <div
        v-else-if="umapTransforms && !umapTransforms.length"
        class="centered-row"
      >
        <div class="centered-row">
          No transforms found. Create transforms by running the `create_transform` management command on the server.
        </div>
      </div>
      <div v-else>
        <v-select
          ref="resultSelection"
          v-model="selectedResult"
          label="UMAP Transform Result"
          density="compact"
          hide-details
        >
          <template #selection="{item}">
            <v-list-item
              style="width: 350px"
              class="colormap-item"
            >
              <template #title>
                UMAPResult{{ item.raw.id }}
                <v-chip
                  size="x-small"
                  style="float:right"
                >
                  {{ item.raw.scatterplot_data.length }} cells
                </v-chip>
              </template>
              <template #subtitle>
                {{ item.raw.created }}
              </template>
            </v-list-item>
          </template>
          <template #no-data>
            <v-treeview
              :model-value:selected="[selectedResult]"
              :items="nestedResultOptions"
              item-disabled="disabled"
              select-strategy="single-leaf"
              density="compact"
              open-on-click
              fluid
            >
              <template #item="{ props }">
                <v-list-item
                  :class="props.value ? '' : 'half-opacity'"
                  width="350px"
                  @click="() => { if (props.value) selectResult(props.value) }"
                >
                  {{ props.title }}
                  <v-chip
                    v-if="props.value?.scatterplot_data"
                    size="x-small"
                    style="float:right"
                  >
                    {{ props.value.scatterplot_data.length }} cells
                  </v-chip>
                  <div
                    v-if="props.value?.created"
                    class="half-opacity"
                  >
                    {{ props.value.created }}
                  </div>
                </v-list-item>
              </template>
            </v-treeview>
          </template>
        </v-select>
      </div>
      <canvas
        ref="scatterCanvas"
        class="scatter-canvas"
      />
      <div
        v-if="scatterData && selectedResult"
        class="centered-row"
      >
        Showing {{ scatterData.length }} of {{ selectedResult.scatterplot_data.length }} transformed cells
        <v-tooltip>
          <template #activator="{ props: tooltipProps }">
            <span
              class="material-symbols-outlined"
              v-bind="tooltipProps"
            >
              info
            </span>
          </template>
          <div style="width: 200px">
            Some cells that were transformed in this result are not shown if they do not belong to the current image or have been hidden by any applied filters.
          </div>
        </v-tooltip>
      </div>
    </v-card-text>
  </v-card>
</template>

<style>
.centered-row {
  display: flex;
  justify-content: center;
  column-gap: 15px;
  padding: 4px;
}
.half-opacity {
  opacity: 0.5;
}
.scatter-canvas {
  width: 320px;
  height: 500px;
}
</style>
