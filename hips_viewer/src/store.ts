import { ref, watch } from 'vue'
import {
  clusterFirstPoint,
  resetCurrentFilters,
  resetFilterOptions,
  resetFilterVectorIndices,
} from './utils'
import type { FilterOption } from './types'
import { updateOpacities } from './map'

// Store variables
export const map = ref()
export const maxZoom = ref()
export const status = ref()
export const fetchProgress = ref(0)

export const cells = ref()
export const cellColumns = ref()
export const cellColors = ref()
export const selectedCellIds = ref<Set<number>>(new Set<number>())

export const cellFeature = ref()
export const pointFeature = ref()
export const annotationLayer = ref()
export const annotationMode = ref()
export const annotationBoolean = ref()
export const lastAnnotation = ref()

export const cellDrawerHeight = ref(0)
export const cellDrawerResizing = ref(false)

export const tooltipEnabled = ref(false)
export const tooltipContent = ref()
export const tooltipPosition = ref()

export const unappliedColorChanges = ref(false)

export const showHistogram = ref(false)
export const histNumBuckets = ref(50)
export const histCellIds = ref<Set<number>>(new Set<number>())
export const histSelectionType = ref<'all' | 'viewport' | 'selected'>('all')
export const histCellIdsDirty = ref(false)
export const histPrevViewport = ref()
export const histPrevSelectedCellIds = ref(new Set<number>())
export const histogramScale = ref<'linear' | 'log'>('linear')
export const histSelectedBars = ref<Set<number>>(new Set<number>())
export const cellData = ref<null | {
  key: string
  color: string
  cellIds: Set<number>
  count: number }[]>(null)
export const chartData = ref()

export const colorLegend = ref()
export const selectedColor = ref('#000')
export const colorBy = ref('classification')
export const colormapType = ref<
  'qualitative' | 'sequential' | 'diverging'
>('qualitative')
export const colormapName = ref<string | undefined>('Paired')
export const attributeOptions = ref()

export const filterOptions = ref<FilterOption[]>()
export const filterVectorIndices = ref<Record<string, number>>({})
export const currentFilters = ref<Record<string, (string | number)[]>>({})
export const filterMatchCellIds = ref<Set<number>>(new Set<number>())

// Store watchers
watch(colormapType, () => colormapName.value = undefined)

watch([selectedColor, colorBy, colormapName], () => {
  unappliedColorChanges.value = !!(
    selectedColor.value && colorBy.value && colormapName.value
  )
})

watch(colorBy, () => {
  chartData.value = null
})

watch(selectedCellIds, () => {
  if (cellFeature.value && pointFeature.value) {
    const styleCellFunction = (cell: any, i: number) => {
      if (cell.__cluster) {
        cell = clusterFirstPoint(cells.value, cell, i)
      }
      if (selectedCellIds.value.has(cell.id)) return selectedColor.value
      return cellColors.value[cell.id]
    }
    cellFeature.value.style('strokeColor', styleCellFunction)
    if (cellFeature.value.visible()) cellFeature.value.draw()
    pointFeature.value.style('fillColor', styleCellFunction)
    if (pointFeature.value.visible()) pointFeature.value.draw()
  }
})

watch(cells, () => {
  histCellIds.value = new Set(cells.value?.map((c: any) => c.id))
})

watch([cells, cellColumns], () => {
  if (cells.value && cellColumns.value && !filterOptions.value) {
    resetFilterVectorIndices()
    resetFilterOptions()
    resetCurrentFilters()
  }
})

watch(filterMatchCellIds, updateOpacities)
