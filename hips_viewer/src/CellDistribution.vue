<script setup lang="ts">
import { ref, watchEffect, watch, onMounted } from 'vue'
import { Chart as ChartJS, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'

import { cellDistribution } from '@/map'
import { colorBy, histNumBuckets, cellData, chartData, showHistogram,
  histSelectionType, histSelectedBars, histCellIdsDirty, histPrevViewport,
  histogramScale, histCellIds, selectedCellIds, cells, map, cellFeature, selectedColor } from '@/store'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const chartOptions = {
  responsive: true,
  onClick: selectBar,
}

const histNumBucketsSlider = ref(histNumBuckets.value)

const debouncedUpdateHistBuckets = (n: number) => {
  histNumBucketsSlider.value = n

  setTimeout(() => {
    if (histNumBucketsSlider.value == n) histNumBuckets.value = n
  }, 300)
}

function selectBar(event: any, elements: any) {
  const clickedBar = elements[0]
  if (clickedBar === undefined) return

  const barIndex = clickedBar.index
  const toggle = event.native.shiftKey || event.native.ctrlKey

  if (toggle) {
    if (histSelectedBars.value.has(barIndex)) {
      histSelectedBars.value.delete(barIndex)
    }
    else {
      histSelectedBars.value.add(barIndex)
    }
  }
  else {
    if (histSelectedBars.value.has(barIndex) && histSelectedBars.value.size === 1) {
      histSelectedBars.value.clear()
    }
    else {
      histSelectedBars.value.clear()
      histSelectedBars.value.add(barIndex)
    }
  }
  histSelectedBars.value = new Set(histSelectedBars.value) // trigger watcher

  let cellIds = new Set<number>()
  histSelectedBars.value.forEach((i) => {
    const bucket = cellData.value?.[i]
    if (!bucket) return

    cellIds = cellIds.union(bucket.cellIds)
  })
  selectedCellIds.value = cellIds
}

function changeHistSelection() {
  if (!cells.value) return

  if (histSelectionType.value === 'all') {
    histCellIds.value = new Set(cells.value.map((c: any) => c.id))
  }
  else if (histSelectionType.value === 'viewport') {
    histPrevViewport.value = map.value.corners()
    histCellIds.value = new Set(cellFeature.value.polygonSearch(map.value.corners()).found.map((c: any) => c.id))
  }
  else if (histSelectionType.value === 'selected') {
    histCellIds.value = new Set(selectedCellIds.value)
  }
  histCellIdsDirty.value = false
}

onMounted(() => {
  histSelectedBars.value = new Set<number>()

  if (histSelectionType.value === 'viewport') {
    const viewport = map.value.corners()
    const unchanged = JSON.stringify(viewport) == JSON.stringify(histPrevViewport.value)
    histCellIdsDirty.value = !unchanged
  }
})

watchEffect(async () => {
  if (chartData.value && !histCellIdsDirty.value) return

  await new Promise(r => setTimeout(r, 100)) // wait for DOM update
  changeHistSelection()
})

watch([histNumBuckets, histCellIds], () => {
  histSelectedBars.value = new Set<number>()
  cellData.value = cellDistribution()
})

watch([cellData, histogramScale, histSelectedBars], () => {
  if (!cellData.value) return

  const labels = cellData.value.map(c => c.key)
  const colors = cellData.value.map((c, index) => {
    return histSelectedBars.value.has(index) ? selectedColor.value : c.color
  })
  const counts = cellData.value.map(c =>
    histogramScale.value === 'log' ? Math.log(c.count) : c.count,
  )

  chartData.value = {
    labels,
    datasets: [{
      label: histogramScale.value === 'log' ? 'log(Count)' : 'Count',
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
