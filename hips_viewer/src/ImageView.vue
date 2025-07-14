<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { addHoverCallback, addZoomCallback, createFeatures, createMap } from '@/map';
import { fetchImageCells } from '@/api';
import type { Image } from '@/types'

import CellDrawer from '@/CellDrawer.vue';
import ColorOptions from '@/ColorOptions.vue';

const props = defineProps<{
    id: number;
    image: Image
}>();

const ZOOM_THRESHOLD = 7
const defaultColor = '#00ff00'

const mapId = computed(() => 'map-' + props.id)
const map = ref();
const status = ref();

const cells = ref();
const cellFeature = ref()
const pointFeature = ref()
const cellDrawerHeight = ref(100);
const cellDrawerResizing = ref(false)

const tooltipEnabled = ref(true)
const tooltipContent = ref()
const tooltipPosition = ref()

function init() {
    status.value = 'Fetching cell data...'
    fetchImageCells(props.image.id).then((data) => {
        cells.value = data;
    })
    createMap(mapId.value, props.image.tile_url).then((result) => {
        map.value = result;
        const features = createFeatures(map.value, defaultColor)
        cellFeature.value = features.cellFeature
        pointFeature.value = features.pointFeature
        addZoomCallback(map.value, onZoom)
        addHoverCallback(cellFeature.value, onHoverOver)
    })
}

function drawCells() {
    status.value = 'Drawing cells...'
    cellFeature.value.data(cells.value).draw()
    pointFeature.value.data(cells.value).draw()
    status.value = undefined;
}

function onZoom({zoomLevel}: any) {
    cellFeature.value.visible(zoomLevel > ZOOM_THRESHOLD)
    pointFeature.value.visible(zoomLevel <= ZOOM_THRESHOLD)
}

function onHoverOver({data, mouse}: any) {
    if (tooltipEnabled.value) {
        tooltipContent.value = data
        tooltipPosition.value = mouse.map
    }
}

function resizeCellDrawer(e: MouseEvent) {
    if (cellDrawerResizing.value) cellDrawerHeight.value = window.innerHeight - e.y
}

onMounted(init)
watch(cells, drawCells)
</script>

<template>
    <div
        class="map-container"
        @mousemove="resizeCellDrawer"
    >
        <div :id="mapId" class="map" :style="{height: `calc(100% - ${cellDrawerHeight + 70}px) !important`}"></div>
        <v-card v-if="status" class="status" :style="{bottom: cellDrawerHeight + 80 + 'px'}">
            {{ status }}
        </v-card>
        <span
            class="material-symbols-outlined cell-drawer-resize"
            :style="{bottom: cellDrawerHeight + 55 + 'px'}"
            @mousedown="cellDrawerResizing = true"
            @mouseup="cellDrawerResizing = false"
        >
            unfold_more
        </span>
        <v-card class="cell-drawer" :style="{height: cellDrawerHeight + 'px'}">
            <CellDrawer v-if="cells?.length" :cells="cells" :height="cellDrawerHeight" :tile_url="props.image.tile_url"/>
        </v-card>
        <div class="actions">
            <v-btn icon>
                <span class="material-symbols-outlined">palette</span>
                <v-menu activator="parent" location="end" open-on-hover :close-on-content-click="false">
                    <ColorOptions />
                </v-menu>
            </v-btn>
            <v-btn icon v-tooltip="'Toggle Tooltip'" @click="tooltipEnabled = !tooltipEnabled">
                <span class="material-symbols-outlined">
                    {{ tooltipEnabled ? 'subtitles' : 'subtitles_off' }}
                </span>
            </v-btn>
        </div>
        <v-card
            v-if="tooltipEnabled && tooltipContent && tooltipPosition"
            :style="{top: tooltipPosition.y + 'px', left: tooltipPosition.x + 'px'}"
            class="tooltip"
        >
            <div v-for="[key, value] in Object.entries(tooltipContent)">
                {{ key }}: {{ value }}
            </div>
        </v-card>
    </div>
</template>

<style>
.status, .cell-drawer, .cell-drawer-resize {
    padding: 2px 8px !important;
    position: absolute !important;
}
.status {
    right: 10px;
    width: fit-content;
}
.cell-drawer {
    width: 100%;
    bottom: 70px;
    border-top: 2px solid black !important;
}
.cell-drawer-resize {
    width: 100%;
    text-align: center;
    z-index: 2;
    cursor: ns-resize;
    user-select: none;
}
.actions {
    position: absolute;
    top: 15px;
    left: 10px;
    display: flex;
    flex-direction: column;
    row-gap: 10px;
}
.tooltip {
    position: absolute !important;
    width: fit-content;
    padding: 10px !important;
}
.menu-title {
    background-color: #ddd;
    padding: 5px 10px;
    width: 100%
}
</style>
