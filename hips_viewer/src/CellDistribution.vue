<script setup lang="ts">
import { ref, watchEffect, watch } from 'vue'
import { Chart as ChartJS, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'

import { cellDistribution } from '@/map'
import { colorBy, histNumBuckets, chartData, showHistogram, histSelectionType,
  histogramScale, histCellIds, selectedCellIds, cells, map, cellFeature } from '@/store'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const cellData = ref<null | { key: string | number, color: string, count: number }[]>(null)
const chartOptions = { responsive: true }

const histNumBucketsSlider = ref(histNumBuckets.value)

const debouncedUpdateHistBuckets = (n: number) => {
  histNumBucketsSlider.value = n

  setTimeout(() => {
    if (histNumBucketsSlider.value == n) histNumBuckets.value = n
  }, 300)
}

function changeHistSelection() {
  if (!cells.value) return

  if (histSelectionType.value === 'all') {
    histCellIds.value = new Set(cells.value.map((c: any) => c.id))
  }
  else if (histSelectionType.value === 'viewport') {
    histCellIds.value = new Set(cellFeature.value.polygonSearch(map.value.corners()).found.map((c: any) => c.id))
  }
  else if (histSelectionType.value === 'selected') {
    histCellIds.value = new Set(selectedCellIds.value)
  }
}

watchEffect(async () => {
  if (chartData.value) return

  await new Promise(r => setTimeout(r, 100)) // wait for DOM update
  cellData.value = cellDistribution()
  changeHistSelection()
})

watch([histNumBuckets, histCellIds], () => {
  cellData.value = cellDistribution()
})

watch([cellData, histogramScale], () => {
  if (!cellData.value) return

  const labels = cellData.value.map(c => c.key)
  const colors = cellData.value.map(c => c.color)
  const counts = cellData.value.map(c =>
    histogramScale.value === 'log' ? Math.log(c.count) : c.count,
  )

  chartData.value = {
    labels,
    datasets: [{
      label: histogramScale.value === 'log' ? 'Log(Count)' : 'Count',
      data: counts,
      backgroundColor: colors,
    }],
  }
})
</script>

<template>
  <v-card
    class="chart-container"
    variant="outlined"
  >
    <div class="menu-title">
      Cell Distribution
    </div>
    <v-card-text>
      <v-label>{{ colorBy }}</v-label>

      <template v-if="!chartData">
        <v-skeleton-loader type="card" />
      </template>
      <template v-else>
        <Bar
          :options="chartOptions"
          :data="chartData"
        />
      </template>

      <v-slider
        v-if="showHistogram"
        :model-value="histNumBucketsSlider"
        :min="20"
        :max="100"
        :step="1"
        label="# Buckets"
        class="mt-3"
        @update:model-value="debouncedUpdateHistBuckets"
      >
        <template #append>
          <v-text-field
            v-model="histNumBuckets"
            density="compact"
            style="width: 70px"
            type="number"
            hide-details
            single-line
          />
        </template>
      </v-slider>
      <div>
        <label class="text-subtitle-1 pr-2">Chart scale:</label>
        <v-btn-toggle
          v-model="histogramScale"
          divided
          density="compact"
          variant="outlined"
          mandatory="force"
        >
          <v-btn value="linear">
            Linear
          </v-btn>
          <v-btn value="log">
            Logarithmic
          </v-btn>
        </v-btn-toggle>
      </div>
      <div>
        <label class="text-subtitle-1 pr-2">Select Cells:</label>
        <v-btn-toggle
          v-model="histSelectionType"
          density="compact"
          variant="outlined"
          mandatory="force"
          @click="changeHistSelection"
        >
          <v-btn value="all">
            All
          </v-btn>
          <v-btn value="viewport">
            Viewport
          </v-btn>
          <v-btn value="selected">
            Selected
          </v-btn>
        </v-btn-toggle>
      </div>
      <v-label>({{ histCellIds.size }} / {{ cells.length }})</v-label>
    </v-card-text>
  </v-card>
</template>

<style>
.chart-container {
    min-width: 500px;
}
</style>
