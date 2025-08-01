<script setup lang="ts">
import { ref, watchEffect, watch } from 'vue';

import { cellCounts } from '@/map';

import { Chart as ChartJS, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { colorBy, histNumBuckets, showHistogram,
         histSelectedCells, histSelectionType, selectedCellIds,
         cells, map, cellFeature } from './store';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const histogramScale = ref<'linear' | 'log'>('linear')

const cellData = ref<null | {key: string | number, color: string, count: number}[]>(null)
const chartData = ref()
const chartOptions = { responsive: true }

function countCells() {
    if (!cells.value || !map.value || !cellFeature.value) {
        console.warn('Cells, map, or cell feature not initialized')
        return
    }

    if (histSelectionType.value === 'all') {
        histSelectedCells.value = new Set(cells.value.map((c: any) => c.id))
    } else if (histSelectionType.value === 'viewport') {
        histSelectedCells.value = new Set(cellFeature.value.polygonSearch(map.value.corners()).found.map((c: any) => c.id))
    } else if (histSelectionType.value === 'selected') {
        histSelectedCells.value = new Set(selectedCellIds.value)
    }
}


watchEffect(async () => {
    if (chartData.value) return

    await new Promise(r => setTimeout(r, 100)) // wait for DOM update
    cellData.value = cellCounts()
    countCells()
})

watch([histNumBuckets, histSelectedCells], () => {
    cellData.value = cellCounts()
})

watch([cellData, histogramScale], () => {
    if (!cellData.value) return

    const labels = cellData.value.map((c) => c.key)
    const colors = cellData.value.map((c) => c.color)
    const counts = cellData.value.map((c) =>
        histogramScale.value === 'log' ? Math.log(c.count) : c.count
    )

    chartData.value = {
        labels,
        datasets: [{
            label: histogramScale.value === 'log' ? "Log(Count)" : "Count",
            data: counts,
            backgroundColor: colors,
        }]
    }
})
</script>

<template>
    <v-card class="chart-container" variant="outlined">
        <div class="menu-title">Cell Distribution</div>
        <v-card-text>
            <v-label>{{ colorBy }}</v-label>

            <template v-if="!chartData">
                <v-skeleton-loader type="card"/>
            </template>
            <template v-else>
                <Bar
                    :options="chartOptions"
                    :data="chartData"
                />
            </template>

            <v-slider
                v-if="showHistogram"
                v-model="histNumBuckets"
                :min="20"
                :max="100"
                :step="1"
                label="# Buckets"
                class="mt-3"
            >
                <template #append>
                    <v-text-field
                        v-model="histNumBuckets"
                        density="compact"
                        style="width: 70px"
                        type="number"
                        hide-details
                        single-line
                    ></v-text-field>
                </template>
            </v-slider>
            <div>
                <label class="text-subtitle-1 pr-2">Chart scale:</label>
                <v-btn-toggle v-model="histogramScale" divided>
                    <v-btn value="linear">Linear</v-btn>
                    <v-btn value="log">Logarithmic</v-btn>
                </v-btn-toggle>
            </div>
            <div>
                <label class="text-subtitle-1 pr-2">Select Cells:</label>
                <v-btn-toggle v-model="histSelectionType" @click="countCells" divided>
                    <v-btn value="all">All</v-btn>
                    <v-btn value="viewport">Viewport</v-btn>
                    <v-btn value="selected">Selected</v-btn>
                </v-btn-toggle>
            </div>
            <v-label>({{ histSelectedCells.size }} / {{ cells.length }})</v-label>
        </v-card-text>
    </v-card>
</template>

<style>
.chart-container {
    min-width: 500px;
}
</style>
