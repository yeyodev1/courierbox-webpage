<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const props = defineProps({
  data: {
    type: Array as () => { date: string; count: number }[],
    required: true,
  },
});

const chartData = computed(() => {
  return {
    labels: props.data.map((d) => d.date),
    datasets: [
      {
        label: 'Conversaciones',
        data: props.data.map((d) => d.count),
        backgroundColor: '#f97316', // brand-orange
        borderRadius: 8,
        barPercentage: 0.5,
        maxBarThickness: 50,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: '#f97316',
      bodyColor: '#ffffff',
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9ca3af', font: { family: 'Inter', size: 12 } },
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#9ca3af', stepSize: 1, font: { family: 'Inter', size: 12 } },
      beginAtZero: true,
    },
  },
};
</script>

<template>
  <div class="chart-container">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}
</style>
