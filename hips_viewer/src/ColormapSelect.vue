<script setup lang="ts">
import { colormaps } from '@/colors'

const props = defineProps<{
  label: string
  model: any
}>()
const emit = defineEmits(['select'])

console.log(props.model, emit, colormaps)
</script>

<template>
  {{ props.label }}
</template>
