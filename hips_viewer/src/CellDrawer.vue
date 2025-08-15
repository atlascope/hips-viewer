<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Cell, Thumbnail } from '@/types'
import { cellColors, filterMatchCellIds, selectedCellIds, selectedColor } from './store'
import { clickCellThumbnail, rgbToHex, type RGB } from './utils'

const props = defineProps<{
  cells: Cell[]
  height: number
  tileUrl: string
}>()

const pageLength = 10
const thumbnails = ref<Thumbnail[]>([])
const filteredThumbnails = computed(() => {
  return thumbnails.value.filter((t: Thumbnail) => {
    return !filterMatchCellIds.value.size || filterMatchCellIds.value.has(t.id)
  })
})
const hexCellColors = computed(() => {
  if (!cellColors.value) {
    return Object.fromEntries(
      thumbnails.value.map((t: Thumbnail) => [t.id, '#000']),
    )
  }
  return Object.fromEntries(
    Object.entries(cellColors.value).map(([cellId, rgbColor]) => [cellId, rgbToHex(rgbColor as RGB)]),
  )
})

function loadThumbnails({ done }: any) {
  if (props.cells.length === thumbnails.value.length) done('empty')
  else {
    const filteredCells = props.cells.filter(
      cell => !filterMatchCellIds.value.size || filterMatchCellIds.value.has(cell.id),
    )
    if (filteredCells.length === filteredThumbnails.value.length) done('empty')
    thumbnails.value.push(...filteredCells.slice(
      filteredThumbnails.value.length, filteredThumbnails.value.length + pageLength,
    ).map((cell) => {
      const region = new URLSearchParams({
        left: (cell.x - cell.width / 2).toString(),
        right: (cell.x + cell.width / 2).toString(),
        top: (cell.y - cell.height / 2).toString(),
        bottom: (cell.y + cell.height / 2).toString(),
      })
      return {
        src: `${props.tileUrl}/region/?${region}`,
        width: cell.width,
        height: cell.height,
        id: cell.id,
      }
    }))
    if (thumbnails.value.length) done('ok')
    else done('empty')
  }
}
</script>

<template>
  <v-infinite-scroll
    :items="thumbnails"
    :height="props.height"
    empty-text="End of cell list"
    @load="loadThumbnails"
  >
    <div class="cell-thumbnail-container">
      <img
        v-for="(thumbnail, index) in filteredThumbnails"
        :key="index"
        :src="thumbnail.src"
        :width="thumbnail.width + 4"
        :height="thumbnail.height + 4"
        :style="`border-color:${
          selectedCellIds.has(thumbnail.id) ? selectedColor: hexCellColors[thumbnail.id]
        };border-width:${
          hexCellColors[thumbnail.id] ? 4 : 0
        }px;padding:${
          hexCellColors[thumbnail.id] ? 0 : 4
        }px`"
        class="cell-thumbnail"
        @click="(e) => clickCellThumbnail(e, thumbnail.id)"
      >
    </div>
  </v-infinite-scroll>
</template>

<style>
.cell-thumbnail-container {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
}
.cell-thumbnail {
    margin: 5px;
    display: inline;
    border-width: 4px;
    border-style: solid;
}
</style>
