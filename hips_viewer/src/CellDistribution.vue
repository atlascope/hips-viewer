<script setup lang="ts">
import { ref, watchEffect, watch } from 'vue';

import { cellCounts } from '@/map';

import { Chart as ChartJS, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { colorBy, distNumBuckets, showHistogram } from './store';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const histogramScale = ref<'linear' | 'log'>('linear')

const cellData = ref<null | {key: string | number, color: string, count: number}[]>(null)
const chartData = ref()
const chartOptions = { responsive: true }

watchEffect(async () => {
    if (chartData.value) return

    await new Promise(r => setTimeout(r, 100)) // wait for DOM update
    cellData.value = cellCounts()
})

watch(distNumBuckets, () => {
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
                v-model="distNumBuckets"
                :min="20"
                :max="100"
                :step="1"
                label="# Buckets"
                class="mt-3"
            >
                <template #append>
                    <v-text-field
                        v-model="distNumBuckets"
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
        </v-card-text>
    </v-card>
</template>

<style>
.chart-container {
    min-width: 500px;
}
</style>
