import { ref, watch } from 'vue'
import { clusterFirstPoint } from './utils'

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
export const histSelectedCells = ref<any>(new Set())
export const histSelectionType = ref<'all' | 'viewport' | 'selected'>('all')

export const colorLegend = ref()
export const selectedColor = ref('#000')
export const colorBy = ref('classification')
export const colormapType = ref<
    'qualitative' | 'sequential' | 'diverging'
>('qualitative')
export const colormapName = ref<string | undefined>('Paired')
export const attributeOptions = ref()

// Store watchers
watch(colormapType, () => colormapName.value = undefined)

watch([selectedColor, colorBy, colormapName], () => {
  unappliedColorChanges.value = !!(
    selectedColor.value && colorBy.value && colormapName.value
  )
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
    histSelectedCells.value = new Set(cells.value?.map((c: any) => c.id))
})
