<script setup lang="ts">
import { ref } from 'vue'
import {
  selectedColor, colorBy,
  colormapName, status,
  unappliedColorChanges,
} from '@/store'
import { updateColors } from '@/map'
import AttributeSelect from './AttributeSelect.vue'
import ColormapSelect from './ColormapSelect.vue'

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
      <ColormapSelect
        :model="colormapName"
        label="Colormap"
        @select="(v: string) => colormapName = v"
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
