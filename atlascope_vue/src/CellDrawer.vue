<script setup lang="ts">
import { ref } from 'vue';
import type { Cell, Thumbnail } from '@/types';

const props = defineProps<{
    cells: Cell[],
    height: number,
    tile_url: string,
}>();

const pageLength = 10;
const thumbnails = ref<Thumbnail[]>([]);

function loadThumbnails({ done }: any) {
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
        }
    }))
    if (thumbnails.value.length) done('ok')
    else done('empty')
}
</script>

<template>
    <v-infinite-scroll
        :items="thumbnails"
        :height="props.height"
        @load="loadThumbnails"
        empty-text="End of selected cells"
    >
        <div class="cell-thumbnail-container">
            <img
                v-for="(thumbnail, index) in thumbnails"
                :key="index"
                :src="thumbnail.src"
                :width="thumbnail.width"
                :height="thumbnail.height"
                class="cell-thumbnail"
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
}
</style>
