<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { fetchUMAPTransformResults, fetchUMAPTransforms } from '@/api'
import { umapTransformResults, umapTransforms } from './store'
import type { UMAPTransform, UMAPResult, TreeItem } from './types'

const resultSelection = ref()
const selectedResult = ref<UMAPResult>()

const nestedResultOptions = computed(() => {
  const nested: TreeItem[] = []
  umapTransforms.value?.forEach((transform: UMAPTransform) => {
    const parent: TreeItem = { title: `UMAPTransform ${transform.id}`, subtitle: transform.name, children: [] }
    nested.push(parent)
    const results = umapTransformResults.value[transform.id]
    if (results?.length) {
      results.forEach((result: UMAPResult) => {
        parent.children?.push({ title: `UMAPResult ${result.id}`, value: result })
      })
    }
    else {
      parent.children?.push({
        title: 'No results exist. Create results by running the `apply_transform ' + transform.id + '` management command on the server.',
        disabled: true,
      })
    }
  })
  return nested
})

function init() {
  fetchUMAPTransforms().then((transforms) => {
    umapTransforms.value = transforms
    transforms.forEach((t: UMAPTransform) => {
      fetchUMAPTransformResults(t.id).then((results) => {
        umapTransformResults.value[t.id] = results
      })
    })
  })
}

function select(selected: any) {
  if (resultSelection.value) resultSelection.value.blur()
  selectedResult.value = selected
}

onMounted(init)
</script>

<template>
  <v-card variant="outlined">
    <div class="menu-title">
      Transform Results
    </div>
    <v-card-text style="width: 350px">
      <div
        v-if="!umapTransforms"
      >
        <v-progress-linear
          indeterminate
          class="centered-row"
        />
        <v-label class="centered-row">
          Fetching UMAP Transforms...
        </v-label>
      </div>
      <div
        v-else-if="umapTransforms && !umapTransforms.length"
        class="centered-row"
      >
        <div class="centered-row">
          No transforms found. Create transforms by running the `create_transform` management command on the server.
        </div>
      </div>
      <div v-else>
        <v-select
          ref="resultSelection"
          v-model="selectedResult"
          label="UMAP Transform Result"
          density="compact"
          hide-details
        >
          <template #selection="{item}">
            <v-list-item
              style="width: 350px"
              class="colormap-item"
            >
              <template #title>
                UMAPResult{{ item.raw.id }}
                <v-chip
                  size="x-small"
                  style="float:right"
                >
                  {{ item.raw.scatterplot_data.length }} cells
                </v-chip>
              </template>
              <template #subtitle>
                {{ item.raw.created }}
              </template>
            </v-list-item>
          </template>
          <template #no-data>
            <v-treeview
              :model-value:selected="[selectedResult]"
              :items="nestedResultOptions"
              item-disabled="disabled"
              select-strategy="single-leaf"
              density="compact"
              open-on-click
              fluid
            >
              <template #item="{ props }">
                <v-list-item
                  :class="props.value ? '' : 'half-opacity'"
                  width="350px"
                  @click="() => { if (props.value) select(props.value) }"
                >
                  {{ props.title }}
                  <v-chip
                    v-if="props.value?.scatterplot_data"
                    size="x-small"
                    style="float:right"
                  >
                    {{ props.value.scatterplot_data.length }} cells
                  </v-chip>
                  <div
                    v-if="props.value?.created"
                    class="half-opacity"
                  >
                    {{ props.value.created }}
                  </div>
                </v-list-item>
              </template>
            </v-treeview>
          </template>
        </v-select>
      </div>
    </v-card-text>
  </v-card>
</template>

<style>
.centered-row {
  display: flex;
  justify-content: center;
  column-gap: 15px;
  padding: 4px;
}
.half-opacity {
    opacity: 0.5;
}
</style>
