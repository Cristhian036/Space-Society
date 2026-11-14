<script setup lang="ts">
import {
  computed,
  onMounted,
  onBeforeUnmount,
  shallowRef,
  useTemplateRef,
} from "vue";
import { cycles } from "../data/demo";
import type { BasinId } from "../types";

const props = defineProps<{
  basinId: BasinId;
  cycleIndex: number;
  kind: "flow" | "backscatter";
}>();
const width = shallowRef(720);
const chart = useTemplateRef<SVGSVGElement>("chart");
let observer: ResizeObserver | undefined;
onMounted(() => {
  if (!chart.value) return;
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.max(220, entry.contentRect.width);
  });
  observer.observe(chart.value);
});
onBeforeUnmount(() => observer?.disconnect());
const height = 220;
const left = 48;
const right = 24;
const top = 17;
const bottom = 38;
const values = computed(() =>
  cycles.map((cycle) =>
    props.kind === "flow"
      ? Number.parseFloat(cycle.metrics[props.basinId].flow)
      : cycle.sarBackscatterDb,
  ),
);
const limits = computed(() =>
  props.kind === "flow"
    ? { min: 0, max: 1000, ticks: [0, 250, 500, 750, 1000] }
    : { min: -24, max: 0, ticks: [-24, -18, -12, -6, 0] },
);
const x = (i: number) =>
  left + (i * (width.value - left - right)) / (cycles.length - 1);
const y = (value: number) =>
  top +
  ((limits.value.max - value) / (limits.value.max - limits.value.min)) *
    (height - top - bottom);
const points = computed(() =>
  values.value.map((value, i) => `${x(i)},${y(value)}`).join(" "),
);
const area = computed(
  () =>
    `${left},${height - bottom} ${points.value} ${x(cycles.length - 1)},${height - bottom}`,
);
const activeValue = computed(() => values.value[props.cycleIndex] ?? 0);
const activeY = computed(() => y(activeValue.value));
const activeX = computed(() => x(props.cycleIndex));
const emit = defineEmits<{ select: [index: number] }>();
</script>

<template>
  <div class="chart-container">
    <svg
      ref="chart"
      class="observation-chart"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      :aria-label="`${kind === 'flow' ? 'Caudal en metros cúbicos por segundo' : 'Retrodispersión en decibelios'} de ${cycles.length} ciclos. Valor seleccionado: ${activeValue}.`"
    >
      <g v-for="tick in limits.ticks" :key="tick">
        <line
          :x1="left"
          :x2="width - right"
          :y1="y(tick)"
          :y2="y(tick)"
          stroke="var(--line)"
          stroke-dasharray="3 5"
        />
        <text
          :x="left - 12"
          :y="y(tick) + 3"
          text-anchor="end"
          class="axis-label"
        >
          {{ tick }}
        </text>
      </g>
      <polygon :points="area" fill="var(--aqua)" opacity=".62" />
      <line
        v-if="kind === 'backscatter'"
        :x1="left"
        :x2="width - right"
        :y1="y(-15)"
        :y2="y(-15)"
        stroke="#bd8b42"
        stroke-dasharray="6 5"
      />
      <polyline
        :points="points"
        fill="none"
        stroke="var(--river)"
        stroke-width="2.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <line
        :x1="activeX"
        :x2="activeX"
        :y1="top"
        :y2="height - bottom"
        stroke="var(--river)"
        stroke-width="1"
        stroke-dasharray="3 4"
        opacity=".5"
      />
      <g v-for="(value, i) in values" :key="i">
        <circle
          :cx="x(i)"
          :cy="y(value)"
          :r="i === cycleIndex ? 5 : 3"
          fill="var(--surface)"
          stroke="var(--river)"
          stroke-width="2"
        />
        <text
          :x="x(i)"
          :y="height - 14"
          text-anchor="middle"
          class="axis-label"
        >
          +{{ cycles[i]?.dayOffset }} d
        </text>
      </g>
      <g
        :transform="`translate(${Math.max(81, Math.min(activeX, width - 70))},${Math.max(16, activeY - 18)})`"
      >
        <rect
          x="-29"
          y="-12"
          width="58"
          height="22"
          rx="5"
          fill="var(--river)"
        />
        <text y="2" text-anchor="middle" class="value-label">
          {{ activeValue }}
        </text>
      </g>
    </svg>
    <div
      class="chart-observations"
      aria-label="Seleccionar observación en el gráfico"
    >
      <button
        v-for="(cycle, i) in cycles"
        :key="i"
        :aria-label="`Ver observación de ${cycle.dateTrack47}`"
        :aria-pressed="cycleIndex === i"
        :class="{ active: cycleIndex === i }"
        @click="emit('select', i)"
      >
        {{ cycle.dateTrack47.slice(8) }}
        {{ i < 3 ? "ene" : i < 5 ? "feb" : "mar" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  padding: 3px 16px 16px;
}
.observation-chart {
  display: block;
  width: 100%;
  height: 220px;
  overflow: visible;
}
.axis-label {
  font-family: inherit;
  font-size: 11px;
  fill: var(--muted);
}
.value-label {
  font-family: inherit;
  font-size: 12px;
  fill: var(--on-river);
  font-weight: 700;
}
.chart-observations {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding: 0 10px 0 32px;
  gap: 4px;
}
.chart-observations button {
  border: 0;
  background: none;
  border-radius: 4px;
  font-size: 11px;
  color: var(--muted);
  padding: 6px 2px;
  min-height: 28px;
  white-space: nowrap;
}
.chart-observations button:hover {
  background: var(--aqua-soft);
}
.chart-observations .active {
  color: var(--river);
  background: var(--aqua);
  font-weight: 750;
}
@media (max-width: 560px) {
  .chart-container {
    padding-inline: 10px;
  }
  .chart-observations {
    padding-left: 16px;
    padding-right: 0;
    gap: 1px;
  }
  .chart-observations button {
    font-size: 10px;
    min-height: 36px;
  }
  .observation-chart {
    min-height: 130px;
  }
}
</style>
