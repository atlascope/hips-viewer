<script setup lang="ts">
import { ref } from 'vue'
import colorbrewer from 'colorbrewer'
import {
  selectedColor, colorBy,
  colormapName, colormapType, status,
  unappliedColorChanges,
} from '@/store'
import { updateColors } from '@/map'
import AttributeSelect from './AttributeSelect.vue'

const showPicker = ref(false)

function update() {
  unappliedColorChanges.value = false
  status.value = 'Updating colors...'
  setTimeout(() => {
    updateColors()
    status.value = undefined
  }, 1)
}
</script>

<template>
  <v-card variant="outlined">
    <div class="menu-title">
      Color Options
    </div>
    <v-card-text>
      <v-label>Selected Cells</v-label>
      <div
        class="swatch mb-3"
        :style="{backgroundColor: selectedColor}"
        @click="showPicker = !showPicker"
      />
      <v-color-picker
        v-if="showPicker"
        v-model="selectedColor"
        class="mb-3"
        mode="rgb"
        width="375px"
        hide-inputs
        flat
      />
      <v-label>All Other Cells</v-label>
      <AttributeSelect
        :model="colorBy"
        label="Color By Attribute"
        @select="(v) => colorBy = v"
      />
      <v-tabs
        v-model="colormapType"
        density="compact"
      >
        <v-tab value="qualitative">
          Qualitative
        </v-tab>
        <v-tab value="sequential">
          Sequential
        </v-tab>
        <v-tab value="diverging">
          Diverging
        </v-tab>
      </v-tabs>
      <v-select
        v-model="colormapName"
        label="Colormap"
        :items="colorbrewer.schemeGroups[colormapType]"
      />
      <v-btn
        v-if="unappliedColorChanges"
        color="black"
        block
        @click="update"
      >
        Update Colors
      </v-btn>
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
