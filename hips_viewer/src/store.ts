import { ref, watch } from 'vue';
import { updateColors } from '@/map';


// Store variables
export const map = ref();
export const maxZoom = ref();
export const status = ref();

export const cells = ref();
export const cellFeature = ref()
export const pointFeature = ref()
export const cellDrawerHeight = ref(100);
export const cellDrawerResizing = ref(false)

export const tooltipEnabled = ref(true)
export const tooltipContent = ref()
export const tooltipPosition = ref()

export const colorLegend = ref()
export const selectedColor = ref('#0f0')
export const colorBy = ref('classification')
export const colormapName = ref<string | undefined>('Paired')
export const attributeOptions = ref([
    'classification', 'orientation', 'width', 'height', 'x', 'y'
])


// Store watchers
watch([selectedColor, colorBy, colormapName], updateColors)
