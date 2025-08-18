<script setup lang="ts">
import { colormaps } from '@/colors'
import ColormapPreview from './ColormapPreview.vue'

const props = defineProps<{
  label: string
  model: any
}>()
const emit = defineEmits(['select'])
</script>

<template>
  <v-select
    :model-value="props.model"
    :label="props.label"
    :items="colormaps"
    item-title="name"
    item-value="name"
    density="compact"
    class="colormap-select"
    hide-details
    @update:model-value="(v: string) => emit('select', v)"
  >
    <template #selection="{ item }">
      <v-list-item
        style="width: 100%"
        class="colormap-item"
      >
        <template #title>
          {{ item.title }}
          <v-chip
            size="x-small"
            style="float:right"
          >
            {{ item.raw.type }}
          </v-chip>
        </template>
        <template #subtitle>
          <ColormapPreview
            :colors="item.raw.colors"
            :type="item.raw.type"
          />
        </template>
      </v-list-item>
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item
        v-bind="itemProps"
        class="colormap-item"
      >
        <template #title>
          {{ item.title }}
          <v-chip
            size="x-small"
            style="float:right"
          >
            {{ item.raw.type }}
          </v-chip>
        </template>
        <template #subtitle>
          <ColormapPreview
            :colors="item.raw.colors"
            :type="item.raw.type"
          />
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<style>
.colormap-select .v-select__selection {
  width: 100%
}
.colormap-item .v-list-item-subtitle {
  opacity: 100% !important
}
</style>
