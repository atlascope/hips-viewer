<script setup lang="ts">
import { computed, ref } from 'vue'
import { attributeOptions } from './store'
import type { TreeItem } from './types'

const props = defineProps<{
  label: string
  model: any
  exclude?: string[]
}>()
const emit = defineEmits(['select'])

const attrSelection = ref()

const nestedAttributeOptions = computed(() => {
  const nested: TreeItem[] = []
  attributeOptions.value.forEach((attrName: string) => {
    if (props.exclude?.includes(attrName)) return
    if (attrName.includes('.')) {
      // only nest one level
      const components = attrName.split('.')
      let parent = nested.find(item => item.title === components[0])
      if (!parent) {
        parent = { title: components[0], children: [] }
        nested.push(parent)
      }
      parent.children?.push({ title: attrName, value: attrName })
    }
    else {
      nested.push({ title: attrName, value: attrName })
    }
  })
  return nested
})

function select(selected: any) {
  if (selected.length) {
    if (attrSelection.value) attrSelection.value.blur()
    emit('select', selected[0])
  }
}
</script>

<template>
  <v-select
    ref="attrSelection"
    :model-value="props.model"
    :label="props.label"
    density="compact"
    hide-details
  >
    <template #no-data>
      <v-treeview
        :model-value:selected="[props.model]"
        :items="nestedAttributeOptions"
        select-strategy="single-leaf"
        density="compact"
        open-on-click
        fluid
        @update:selected="select"
      />
    </template>
  </v-select>
</template>
