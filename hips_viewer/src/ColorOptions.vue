<script setup lang="ts">
import { ref, watch } from 'vue';
import colorbrewer from 'colorbrewer';
import {
    selectedColor, colorBy, attributeOptions, colormapName
} from '@/store';

const showPicker = ref(false)
const colormapType = ref<
    'qualitative' | 'sequential' | 'diverging'
>('qualitative')

watch(colormapType, () => colormapName.value = undefined)
</script>

<template>
    <v-card variant="outlined">
        <div class="menu-title">Color Options</div>
        <v-card-text>
            <v-label>Selected Cells</v-label>
            <div
                class="swatch mb-3"
                :style="{backgroundColor: selectedColor}"
                @click="showPicker = !showPicker"
            ></div>
            <v-color-picker
                v-if="showPicker"
                v-model="selectedColor"
                class="mb-3"
                mode="rgb"
                width="375px"
                hide-inputs
                flat
            ></v-color-picker>
            <v-label>All Other Cells</v-label>
            <v-select
                v-model="colorBy"
                label="Color By Attribute"
                :items="attributeOptions"
                density="compact"
                hide-details
            ></v-select>
            <v-tabs v-model="colormapType" density="compact">
                <v-tab value="qualitative">Qualitative</v-tab>
                <v-tab value="sequential">Sequential</v-tab>
                <v-tab value="diverging">Diverging</v-tab>
            </v-tabs>
            <v-select
                v-model="colormapName"
                label="Colormap"
                :items="colorbrewer.schemeGroups[colormapType]"
            ></v-select>
        </v-card-text>
    </v-card>
</template>

<style>
.swatch {
    width: 100%;
    height: 20px;
    border: 1px solid black;
}
.v-color-picker-preview__dot {
    display: none
}
.v-color-picker-preview__track {
    width: 350px !important;
    padding-left: 20px;
}
</style>
