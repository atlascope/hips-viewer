import { ref } from 'vue';

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

export const selectedColor = ref('#0f0')
export const colorBy = ref('classification')
export const attributeOptions = ref(['classification'])
export const colormap = ref<string | undefined>('Paired')
