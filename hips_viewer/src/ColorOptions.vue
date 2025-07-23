<script setup lang="ts">
import { ref, computed } from 'vue';
import colorbrewer from 'colorbrewer';
import {
    selectedColor, colorBy, attributeOptions, colormapName, colormapType
} from '@/store';

interface TreeItem {
    title: string,
    value?: string,
    children?: TreeItem[],
}

const showPicker = ref(false)
const nestedAttributeOptions = computed(() => {
    const nested: TreeItem[] = []
    attributeOptions.value.forEach((attrName: string) => {
        if (attrName.includes('.')) {
            // only nest one level
            const components = attrName.split('.')
            let parent = nested.find((item) => item.title === components[0])
            if (!parent) {
                parent = {title: components[0], children:[]}
                nested.push(parent)
            }
            parent.children?.push({title: attrName, value: attrName})
        } else {
            nested.push({title: attrName, value: attrName})
        }
    })
    return nested
})

function select(selected: any) {
    if (selected.length) {
        colorBy.value = selected[0]
    }
}

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
                :model-value="colorBy"
                label="Color By Attribute"
                density="compact"
                hide-details
            >
                <template v-slot:no-data>
                    <v-treeview
                        :model-value:selected="[colorBy]"
                        :items="nestedAttributeOptions"
                        select-strategy="single-leaf"
                        @update:selected="select"
                        density="compact"
                        open-on-click
                        fluid
                    ></v-treeview>
                </template>
            </v-select>
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
 .v-treeview-node__content {
    padding-left: 0px !important;
}
</style>
