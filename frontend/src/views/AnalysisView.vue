<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Info,
  Waves,
  Satellite,
  MoveHorizontal,
  Sprout,
} from "@lucide/vue";
import ObservationChart from "../components/ObservationChart.vue";
import ObservationTimeline from "../components/ObservationTimeline.vue";
import { basins, cycles, cycleSeverity, severityLabels } from "../data/demo";
import { useWorkspace } from "../composables/useWorkspace";
import nisarComparison from "../../../assets/comparacion_rio_nisar.png";

const { basin, basinId, cycle, cycleIndex } = useWorkspace();
const route = useRoute();
const metrics = computed(() => cycle.value.metrics[basinId.value]);
const comparisons = computed(() =>
  basins.map((item) => ({ ...item, metrics: cycle.value.metrics[item.id] })),
);
const selectedSeverity = computed(() => cycleSeverity(cycleIndex.value));
function exportCsv() {
  const rows = [
    ["Datos de demostración históricos 2024 - no son observaciones operativas"],
    [
      "Cuenca",
      "Fecha",
      "Caudal",
      "Superficie inundada",
      "Población expuesta",
      "Ancho",
      "Retrodispersión dB",
    ],
    ...cycles.map((item) => [
      basin.value.shortName,
      item.dateTrack47,
      item.metrics[basinId.value].flow,
      item.metrics[basinId.value].ha,
      item.metrics[basinId.value].pop,
      item.metrics[basinId.value].width,
      String(item.sarBackscatterDb),
    ]),
  ];
  const csv =
    "\ufeff" +
    rows
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `space-society-demo-${basinId.value}-2024.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <div class="analysis-toolbar">
    <div>
      <span class="analysis-basin"
        ><Waves :size="17" /> {{ basin.shortName }}</span
      ><span class="status-tag" :class="`status-${selectedSeverity}`">{{
        severityLabels[selectedSeverity]
      }}</span>
    </div>
    <button class="button" @click="exportCsv">
      <ArrowDownToLine :size="14" />Exportar datos demo
    </button>
  </div>
  <div class="analysis-metrics">
    <div>
      <Waves :size="17" /><span
        >Caudal estimado<strong>{{ metrics.flow }}</strong></span
      >
    </div>
    <div>
      <Sprout :size="17" /><span
        >Superficie inundada<strong>{{ metrics.ha }}</strong></span
      >
    </div>
    <div>
      <MoveHorizontal :size="17" /><span
        >Ancho del cauce<strong>{{ metrics.width }}</strong></span
      >
    </div>
    <div>
      <Satellite :size="17" /><span
        >Retrodispersión σ⁰<strong
          >{{ cycle.sarBackscatterDb }} <small>dB</small></strong
        ></span
      >
    </div>
  </div>
  <div class="charts-grid">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>La evolución del caudal</h2>
          <p>Caudal estimado · m³/s · escala fija de 0 a 1 000</p>
        </div>
        <span class="chart-key"><i />{{ basin.shortName }}</span>
      </div>
      <ObservationChart
        :basin-id="basinId"
        :cycle-index="cycleIndex"
        kind="flow"
        @select="cycleIndex = $event"
      />
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>La señal detrás del agua</h2>
          <p>Retrodispersión SAR · dB · escala fija de −24 a 0</p>
        </div>
        <Satellite :size="16" class="text-muted" />
      </div>
      <ObservationChart
        :basin-id="basinId"
        :cycle-index="cycleIndex"
        kind="backscatter"
        @select="cycleIndex = $event"
      />
      <p class="chart-threshold">
        <i />Umbral de referencia del módulo original: −15 dB
      </p>
    </section>
  </div>
  <div class="panel analysis-timeline">
    <ObservationTimeline v-model="cycleIndex" />
  </div>
  <section class="panel spaced-section">
    <div class="panel-heading">
      <div>
        <h2>Las cuencas, en perspectiva</h2>
        <p>Valores de demostración para la misma observación temporal.</p>
      </div>
      <span class="subtle-label">{{ cycle.shortDate }}</span>
    </div>
    <div class="table-wrap">
      <table>
        <caption class="sr-only">
          Comparación de las cuatro cuencas en el ciclo seleccionado
        </caption>
        <thead>
          <tr>
            <th scope="col">Cuenca</th>
            <th scope="col">Caudal</th>
            <th scope="col">Superficie inundada</th>
            <th scope="col">Población expuesta</th>
            <th scope="col">Ancho</th>
            <th scope="col">Explorar</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in comparisons"
            :key="item.id"
            :class="{ 'selected-row': item.id === basinId }"
          >
            <th scope="row">
              <span class="table-basin"
                ><Waves :size="14" />{{ item.shortName }}</span
              >
            </th>
            <td>{{ item.metrics.flow }}</td>
            <td>{{ item.metrics.ha }}</td>
            <td>{{ item.metrics.pop }}</td>
            <td>{{ item.metrics.width }}</td>
            <td>
              <button
                class="compare-button"
                :aria-label="`Analizar ${item.shortName}`"
                :aria-pressed="item.id === basinId"
                @click="basinId = item.id"
              >
                {{ item.id === basinId ? "Seleccionada" : "Ver cuenca"
                }}<ArrowUpRight :size="12" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <div class="notice spaced-section">
    <Info :size="16" />
    <p>
      Esta vista usa los ciclos ilustrativos del módulo original (enero–marzo de
      2024). Los gráficos conservan su escala al cambiar de cuenca para
      facilitar la comparación. La señal SAR corresponde al escenario compartido
      de cada ciclo.
    </p>
  </div>
  <details
    class="panel spaced-section comparison-archive"
    :open="route.query.archivo === 'nisar'"
  >
    <summary>
      Archivo visual NISAR · Majes–Camaná
      <span>Comparación del módulo original · 2026</span>
    </summary>
    <div class="archive-content">
      <p>
        Imagen de referencia existente: crecida del 19 de enero y estiaje del 4
        de septiembre de 2026. Este archivo es independiente de los ciclos demo
        de 2024 y se conserva sin alterar.
      </p>
      <img
        :src="nisarComparison"
        alt="Comparación original de matrices NISAR: crecida, estiaje y diferencia de retrodispersión en el valle Majes–Camaná"
        loading="lazy"
        width="1800"
        height="600"
      />
    </div>
  </details>
</template>

<style scoped>
.comparison-archive summary {
  cursor: pointer;
  padding: 20px 21px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.comparison-archive summary > span {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
  margin-left: 14px;
}
.archive-content {
  padding: 0 21px 21px;
}
.archive-content p {
  font-size: 12px;
  line-height: 1.8;
  color: var(--muted);
  max-width: 80ch;
  margin: 0 0 17px;
}
.archive-content img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
}
.comparison-archive[open] summary {
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}
.analysis-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.analysis-toolbar > div {
  display: flex;
  align-items: center;
  gap: 13px;
}
.analysis-basin {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 750;
}
.analysis-basin svg {
  color: var(--river);
}
.analysis-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 22px;
  padding: 21px 0;
}
.analysis-metrics > div {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0 24px;
  border-right: 1px solid var(--line);
}
.analysis-metrics > div:last-child {
  border: 0;
}
.analysis-metrics svg {
  color: var(--river);
  margin-top: 2px;
}
.analysis-metrics span {
  font-size: 12px;
  color: var(--muted);
}
.analysis-metrics strong {
  display: block;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin-top: 6px;
}
.analysis-metrics small {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
}
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 21px;
}
.chart-key {
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}
.chart-key i {
  width: 13px;
  height: 2px;
  background: var(--river);
}
.chart-threshold {
  font-size: 10px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 22px 13px;
  margin: 0;
}
.chart-threshold i {
  width: 16px;
  border-top: 1px dashed #bd8b42;
}
.analysis-timeline {
  margin-top: 21px;
}
.analysis-timeline :deep(.timeline) {
  border-top: 0;
}
.table-basin {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.table-basin svg {
  color: var(--river);
}
tbody th {
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
tbody tr:last-child th {
  border: 0;
}
.selected-row td,
.selected-row th {
  background: var(--aqua-soft);
}
.compare-button {
  border: 0;
  background: none;
  padding: 6px 0;
  color: var(--river);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 7px;
}
.compare-button:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
@media (max-width: 1200px) {
  .analysis-metrics > div {
    padding-inline: 17px;
    gap: 9px;
  }
  .analysis-metrics strong {
    font-size: 21px;
  }
  .charts-grid {
    gap: 16px;
  }
  .chart-key {
    display: none;
  }
}
@media (max-width: 1000px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .analysis-metrics {
    grid-template-columns: 1fr 1fr;
    row-gap: 23px;
  }
  .analysis-metrics > div:nth-child(2) {
    border: 0;
  }
}
@media (max-width: 560px) {
  .analysis-toolbar {
    align-items: flex-start;
    gap: 16px;
  }
  .analysis-toolbar > div {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .analysis-toolbar .button {
    font-size: 11px;
    padding: 8px 10px;
  }
  .analysis-metrics > div {
    padding-inline: 14px;
    gap: 8px;
  }
  .analysis-metrics strong {
    font-size: 21px;
  }
  .analysis-metrics span {
    font-size: 11px;
  }
  .analysis-metrics svg {
    width: 14px;
  }
  .analysis-metrics {
    padding-block: 18px;
  }
  .panel-heading > .subtle-label {
    font-size: 10px;
    text-align: right;
  }
}
</style>
