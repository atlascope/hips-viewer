<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Cell, Thumbnail } from '@/types';
import { cellColors, selectedCellIds, selectedColor } from './store';
import { clickCell, rgbToHex, type RGB } from './utils';

const props = defineProps<{
    cells: Cell[],
    height: number,
    tile_url: string,
}>();

const pageLength = 10;
const thumbnails = ref<Thumbnail[]>([]);
const hexCellColors = computed(() => Object.fromEntries(
    Object.entries(cellColors.value).map(([cellId, rgbColor]) => [cellId, rgbToHex(rgbColor as RGB)])
))

function loadThumbnails({ done }: any) {
    if (props.cells.length === thumbnails.value.length) done('empty')
    else {
        thumbnails.value.push(...props.cells.slice(
            thumbnails.value.length, thumbnails.value.length + pageLength
        ).map((cell) => {
            const region = new URLSearchParams({
                left: (cell.x - cell.width / 2).toString(),
                right: (cell.x + cell.width / 2).toString(),
                top: (cell.y - cell.height / 2).toString(),
                bottom: (cell.y + cell.height / 2).toString(),
            })
            return {
                src: `${props.tile_url}/region/?${region}`,
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
        @load="loadThumbnails"
        empty-text="End of cell list"
    >
        <div class="cell-thumbnail-container">
            <img
                v-for="(thumbnail, index) in thumbnails"
                :key="index"
                :src="thumbnail.src"
                :width="thumbnail.width + 4"
                :height="thumbnail.height + 4"
                :style="`border-color:${
                    selectedCellIds.includes(thumbnail.id) ? selectedColor: hexCellColors[thumbnail.id]
                };border-width:${
                    cellColors[thumbnail.id] ? 4 : 0
                }px;padding:${
                    cellColors[thumbnail.id] ? 0 : 4
                }px`"
                class="cell-thumbnail"
                @click="(e) => clickCell(e, thumbnail.id)"
            />
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
