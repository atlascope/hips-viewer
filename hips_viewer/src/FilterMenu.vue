<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  filterOptions,
  currentFilters,
  selectedCellIds,
  filterMatchCellIds,
} from './store'
import { addFilterOption, getFilterMatchIds, resetCurrentFilters } from './utils'
import AttributeSelect from './AttributeSelect.vue'

const addMode = ref<boolean>(false)
const addAttribute = ref<string | undefined>()
const msg = ref<string | undefined>()

function selectCells() {
  msg.value = 'Searching...'
  setTimeout(() => {
    selectedCellIds.value = new Set(getFilterMatchIds())
    msg.value = selectedCellIds.value.size + ' matched cells'
  }, 100)
}

function filterCells() {
  msg.value = 'Searching...'
  setTimeout(() => {
    filterMatchCellIds.value = new Set(getFilterMatchIds())
    msg.value = filterMatchCellIds.value.size + ' matched cells'
  }, 100)
}

function addAttributeCancel() {
  addMode.value = false
  addAttribute.value = undefined
  msg.value = undefined
}

function addAttributeSubmit() {
  msg.value = 'Computing values...'
  setTimeout(() => {
    if (addAttribute.value) {
      if (Object.keys(currentFilters.value).includes(addAttribute.value)) {
        msg.value = 'Attribute filter already exists.'
      }
      else {
        addFilterOption(addAttribute.value)
        addAttributeCancel()
      }
    }
  }, 100)
}

watch([currentFilters, addAttribute], () => {
  msg.value = undefined
})
</script>

<template>
  <v-card variant="outlined">
    <div class="menu-title">
      Filter Options
    </div>
    <v-card-text>
      <table width="500">
        <tr
          v-for="filter in filterOptions"
          :key="filter.label"
        >
          <td style="width: 1%; padding-right: 20px">
            <span style="text-transform: capitalize; max-width: 150px; display: block">
              {{ filter.label.replaceAll('_', ' ') }}
            </span>
          </td>
          <td v-if="currentFilters[filter.label]">
            <v-select
              v-if="filter.options"
              v-model="(currentFilters[filter.label] as string[])"
              :items="filter.options"
              density="compact"
              class="filter-option-select"
              hide-details
              multiple
              closable-chips
              chips
            />
            <v-range-slider
              v-if="filter.range"
              v-model="currentFilters[filter.label]"
              :min="filter.range.min"
              :max="filter.range.max"
              :step="0.01"
              density="compact"
              hide-details
              class="filter-range-slider mx-0"
            >
              <template #prepend>
                <v-text-field
                  v-model="currentFilters[filter.label][0]"
                  density="compact"
                  style="width: 90px"
                  type="number"
                  :min="filter.range.min"
                  :max="filter.range.max"
                  :step="0.01"
                  variant="outlined"
                  hide-details
                  single-line
                />
              </template>
              <template #append>
                <v-text-field
                  v-model="currentFilters[filter.label][1]"
                  density="compact"
                  style="width: 90px"
                  type="number"
                  :min="filter.range.min"
                  :max="filter.range.max"
                  :step="0.01"
                  variant="outlined"
                  hide-details
                  single-line
                />
              </template>
            </v-range-slider>
          </td>
        </tr>
      </table>
      <v-btn
        v-if="!addMode"
        block
        class="my-2"
        @click="addMode=true; msg=undefined"
      >
        + Add Attribute Filter
      </v-btn>
      <div
        v-else
        class="centered-row"
      >
        <AttributeSelect
          :model="addAttribute"
          label="Filter by attribute"
          @select="(v: string) => addAttribute = v"
        />
        <v-btn
          color="black"
          :disabled="!addAttribute"
          @click="addAttributeSubmit"
        >
          Submit
        </v-btn>
        <v-btn @click="addAttributeCancel">
          Cancel
        </v-btn>
      </div>
      <div class="centered-row">
        <v-label v-if="msg">
          {{ msg }}
        </v-label>
      </div>
      <div class="centered-row">
        <v-btn
          @click="resetCurrentFilters"
        >
          Reset Filters
        </v-btn>
        <v-btn
          color="black"
          @click="selectCells"
        >
          Select cells
        </v-btn>
        <v-btn
          color="black"
          @click="filterCells"
        >
          Filter cells
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<style>
.centered-row {
  display: flex;
  justify-content: center;
  column-gap: 15px;
  margin-bottom: 10px;
}
.filter-range-slider .v-field__input {
  padding: 0px 0px 0px 5px;
  min-height: 30px;
}
</style>
