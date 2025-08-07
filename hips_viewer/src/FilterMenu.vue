<script setup lang="ts">
import { filterOptions } from './store'
</script>

<template>
  <v-card variant="outlined">
    <div class="menu-title">
      Filter Options
    </div>
    <v-card-text>
      <table width="375">
        <tr
          v-for="filter in filterOptions"
          :key="filter.label"
        >
          <td style="width: 1%; padding-right: 20px">
            <v-label>{{ filter.label }}</v-label>
          </td>
          <td>
            <v-select
              v-if="filter.options"
              :items="filter.options"
              density="compact"
              hide-details
            />
            <v-range-slider
              v-if="filter.range"
              :min="filter.range.min"
              :max="filter.range.max"
              density="compact"
              hide-details
            />
          </td>
        </tr>
      </table>
    </v-card-text>
  </v-card>
</template>
