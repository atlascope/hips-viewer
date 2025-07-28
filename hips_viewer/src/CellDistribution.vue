<script setup lang="ts">
import { computed, ref } from 'vue';

import { cellCounts } from '@/map';

import { Chart as ChartJS, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { colorBy, distNumBuckets, showHistogram } from './store';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const logScaleHistogram = ref(false)

const colorInfo = computed(() => cellCounts())
const chartData = computed(() => {
    const labels = colorInfo.value.map((ci) => ci.key)
    const colors = colorInfo.value.map((ci) => ci.color)
    const counts = colorInfo.value.map((ci) => logScaleHistogram.value ? Math.log(ci.count) : ci.count)
    return {
        labels,
        datasets: [{
            label: logScaleHistogram.value ? "Log(Count)" : "Count",
            data: counts,
            backgroundColor: colors,
        }]
    }
})
const chartOptions = { responsive: true }
</script>

<template>
    <v-card variant="outlined">
        <div class="menu-title">Cell Distribution</div>
        <v-card-text>
            <v-label>{{ colorBy }}</v-label>
            <Bar
                :options="chartOptions"
                :data="chartData"
                width="400px"
            />
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
            <v-btn
                v-if="showHistogram"
                @click="logScaleHistogram = !logScaleHistogram"
                color="black"
                class="mt-3"
            >
                <span class="material-symbols-outlined">
                    {{ logScaleHistogram ? 'close' : 'show_chart' }}
                </span>
                Log Scale Histogram
            </v-btn>
        </v-card-text>
    </v-card>
</template>

<style>
.swatch {
    width: 100%;
    height: 20px;
    border: 1px solid black;
}
.v-color-picker-preview__dot {
    display: none
}
.v-color-picker-preview__track {
    width: 350px !important;
    padding-left: 20px;
}
</style>
