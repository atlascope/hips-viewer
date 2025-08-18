<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  colors: string[]
  type: string
}>()
const canvas = ref()

function draw() {
  const ctx = canvas.value.getContext('2d')
  const rect = [0, 0, canvas.value.width, canvas.value.height]
  ctx.clearRect(...rect)
  if (props.type === 'categorical') {
    props.colors.forEach((color: string, index: number) => {
      ctx.fillStyle = color
      const start = canvas.value.width / props.colors.length * index
      const end = canvas.value.width / props.colors.length * (index + 1)
      ctx.fillRect(start, 0, end, canvas.value.height)
    })
  }
  else if (props.type === 'sequential') {
    const gradient = ctx.createLinearGradient(0, 0, canvas.value.width, 0)
    props.colors.forEach((color: string, index: number) => {
      gradient.addColorStop(index / (props.colors.length - 1), color)
    })
    ctx.fillStyle = gradient
    ctx.fillRect(...rect)
  }
}

onMounted(draw)
</script>

<template>
  <canvas
    ref="canvas"
    class="canvas"
  />
</template>

<style scoped>
.canvas {
    border: 1px solid black;
    height: 20px;
    width: 100%;
}
</style>
