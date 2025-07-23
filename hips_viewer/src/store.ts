import { ref, watch } from 'vue';
import { updateColors } from '@/map';


// Store variables
export const map = ref();
export const maxZoom = ref();
export const status = ref();
export const fetchProgress = ref(0);

export const cells = ref();
export const cellColumns = ref();
export const cellFeature = ref()
export const pointFeature = ref()
export const cellDrawerHeight = ref(0);
export const cellDrawerResizing = ref(false)

export const tooltipEnabled = ref(false)
export const tooltipContent = ref()
export const tooltipPosition = ref()

export const colorLegend = ref()
export const selectedColor = ref('#0f0')
export const colorBy = ref('classification')
export const colormapType = ref<
    'qualitative' | 'sequential' | 'diverging'
>('qualitative')
export const colormapName = ref<string | undefined>('Paired')
export const attributeOptions = ref()


// Store watchers
watch(colormapType, () => colormapName.value = undefined)
watch([selectedColor, colorBy, colormapName], () => {
    status.value = 'Updating colors...'
    setTimeout(() => {
        updateColors()
        status.value = undefined
    }, 1)
})
