<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import geo from 'geojs';
import { fetchImageCells } from '@/api';
import type { Image } from '@/types'
import CellDrawer from '@/CellDrawer.vue';

const props = defineProps<{
    id: number;
    image: Image
}>();

const ZOOM_THRESHOLD = 7
const defaultColor = '#00ff00'

const mapId = computed(() => 'map-' + props.id)
const status = ref();
const cells = ref();
const cellFeature = ref()
const pointFeature = ref()
const cellDrawerHeight = ref(100);
const cellDrawerResizing = ref(false)

function init() {
    status.value = 'Drawing image...'
    fetch(props.image.tile_url).then(response => response.json().then(tileInfo => {
        const maxZoom = tileInfo.levels - 1;
        let params = geo.util.pixelCoordinateParams(
            '#' + mapId.value, tileInfo.sizeX, tileInfo.sizeY, tileInfo.tileWidth, tileInfo.tileHeight
        );
        const map = geo.map(params.map);
        params.layer.url = `${props.image.tile_url}/zxy/{z}/{x}/{y}`;
        map.createLayer('osm', params.layer);
        const ui = map.createLayer('ui');
        ui.createWidget('slider', {position: {right: 40, top: 40}});
        const cellLayer = map.createLayer('feature', {
            features: ['marker']
        });
        cellFeature.value = cellLayer.createFeature('marker', {primitiveShape: 'triangle'}).style({
            radius: (item: any) => item.width / (2 ** (maxZoom + 1)),
            rotation: (item: any) => item.width > item.height ? item.orientation : item.orientation + Math.PI / 2,
            symbolValue: (item: any) => Math.min(item.width, item.height) / Math.max(item.width, item.height),
            symbol: geo.markerFeature.symbols.ellipse,
            scaleWithZoom: geo.markerFeature.scaleMode.fill,
            rotateWithMap: true,
            strokeColor: defaultColor,
            strokeWidth: 2,
            strokeOffset: 1,
            strokeOpacity: 1,
            fillOpacity: 0,
        })
        cellFeature.value.visible(false)

        pointFeature.value = cellLayer.createFeature('point', {
            style: {
                strokeWidth: 0,
                fillColor: defaultColor,
            }
        });
        pointFeature.value.clustering({radius: 10})

        map.geoOn(geo.event.zoom, ({zoomLevel}: any) => {
            cellFeature.value.visible(zoomLevel > ZOOM_THRESHOLD)
            pointFeature.value.visible(zoomLevel <= ZOOM_THRESHOLD)
        })

        map.draw()
        status.value = 'Fetching cell data...'
        fetchImageCells(props.image.id).then((data) => {
            cells.value = data;
        })
    }));
}

function drawCells() {
    status.value = 'Drawing cells...'
    cellFeature.value.data(cells.value).draw()
    pointFeature.value.data(cells.value).draw()
    status.value = undefined;
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
</style>
