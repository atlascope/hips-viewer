<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  filterOptions,
  currentFilters,
  cells,
  filterVectorIndices,
  selectedCellIds,
  filterMatchCellIds,
} from './store'
import type { Cell } from './types'
import { resetCurrentFilters } from './utils'

const numMatched = ref<number | undefined>()

function getMatchedCellIds() {
  if (!cells.value) return []
  return cells.value.filter((cell: Cell) => {
    if (
      currentFilters.value.classification.length
      && !currentFilters.value.classification.includes(cell.classification)
    ) {
      return false
    }
    if (cell.vector_text && filterVectorIndices.value) {
      const vector = cell.vector_text.split(',')
      const vectorExclusions = Object.keys(currentFilters.value)
        .filter(key => key !== 'classification')
        .map((key) => {
          let cellValue = parseFloat(vector[filterVectorIndices.value[key]])
          if (!cellValue || isNaN(cellValue)) return false
          cellValue = parseFloat(cellValue.toPrecision(2))
          const range = currentFilters.value[key] as [number, number]
          return cellValue < range[0] || cellValue > range[1]
        })
      if (vectorExclusions.some((v: boolean) => v)) return false
    }
    return true
  }).map((cell: Cell) => cell.id)
}

function selectCells() {
  selectedCellIds.value = new Set(getMatchedCellIds())
  numMatched.value = selectedCellIds.value.size
}

function filterCells() {
  filterMatchCellIds.value = new Set(getMatchedCellIds())
  numMatched.value = filterMatchCellIds.value.size
}

watch(currentFilters.value, () => {
  numMatched.value = undefined
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
            <v-label style="text-transform: capitalize">
              {{ filter.label.replaceAll('_', ' ') }}
            </v-label>
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
    </v-card-text>
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
    <div class="centered-row">
      <span v-if="numMatched !== undefined">
        {{ numMatched }} matched cells
      </span>
    </div>
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
