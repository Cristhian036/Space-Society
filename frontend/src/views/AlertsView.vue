<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowUpRight,
  Check,
  RotateCcw,
  Bell,
  Info,
  CircleAlert,
  ShieldCheck,
  Waves,
} from "@lucide/vue";
import { basins, demoAlerts, severityLabels } from "../data/demo";
import type { Severity } from "../types";

const query = shallowRef("");
const severity = shallowRef<Severity | "all">("all");
const basinFilter = shallowRef("all");
const statusFilter = shallowRef("all");
const expandedId = shallowRef<string | null>(null);
const reviewed = shallowRef<Set<string>>(new Set());
const criticalCount = demoAlerts.filter(
  (alert) => alert.severity === "critical",
).length;
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
const filtered = computed(() =>
  demoAlerts.filter(
    (alert) =>
      (severity.value === "all" || alert.severity === severity.value) &&
      (basinFilter.value === "all" || alert.basin === basinFilter.value) &&
      (statusFilter.value === "all" ||
        (statusFilter.value === "reviewed"
          ? reviewed.value.has(alert.id)
          : !reviewed.value.has(alert.id))) &&
      normalize(`${alert.title} ${alert.location} ${alert.id}`).includes(
        normalize(query.value.trim()),
      ),
  ),
);
function resetFilters() {
  query.value = "";
  severity.value = "all";
  basinFilter.value = "all";
  statusFilter.value = "all";
}
function toggleReviewed(id: string) {
  const next = new Set(reviewed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  reviewed.value = next;
}
</script>

<template>
  <div class="notice alerts-notice">
    <Info :size="16" />
    <p>
      <strong>Escenarios de demostración.</strong> Estas alertas ilustran cómo
      se verá la interfaz. No son avisos oficiales ni información en tiempo
      real. Las revisiones se guardan solo mientras esta vista permanece
      abierta.
    </p>
  </div>
  <div class="alert-summary">
    <div>
      <span class="summary-symbol all"><Bell :size="19" /></span
      ><span
        >Escenarios disponibles<strong>{{ demoAlerts.length }}</strong></span
      >
    </div>
    <div>
      <span class="summary-symbol critical"><CircleAlert :size="19" /></span
      ><span
        >Prioridad crítica<strong>{{ criticalCount }}</strong></span
      >
    </div>
    <div>
      <span class="summary-symbol warning"
        ><SlidersHorizontal :size="19" /></span
      ><span
        >En vigilancia<strong>{{
          demoAlerts.length - criticalCount
        }}</strong></span
      >
    </div>
    <div>
      <span class="summary-symbol reviewed"><ShieldCheck :size="19" /></span
      ><span
        >Revisados en esta vista<strong>{{ reviewed.size }}</strong></span
      >
    </div>
  </div>
  <section class="panel alerts-panel">
    <div class="panel-heading">
      <div>
        <h2>Escenarios por revisar</h2>
        <p>Explora el contexto de cada sector y continúa en el mapa.</p>
      </div>
      <span class="subtle-label"
        >{{ filtered.length }} de {{ demoAlerts.length }} escenarios</span
      >
    </div>
    <div class="alert-filters">
      <label class="search-field"
        ><Search :size="15" /><span class="sr-only">Buscar escenarios</span
        ><input
          v-model="query"
          type="search"
          placeholder="Buscar por sector o escenario…"
          aria-label="Buscar escenarios" /></label
      ><label
        ><span class="sr-only">Filtrar por prioridad</span
        ><select
          v-model="severity"
          class="select-input"
          aria-label="Filtrar por prioridad"
        >
          <option value="all">Toda prioridad</option>
          <option value="critical">Crítica</option>
          <option value="warning">Vigilancia</option>
        </select></label
      ><label
        ><span class="sr-only">Filtrar por cuenca</span
        ><select
          v-model="basinFilter"
          class="select-input"
          aria-label="Filtrar por cuenca"
        >
          <option value="all">Todas las cuencas</option>
          <option v-for="item in basins" :key="item.id" :value="item.id">
            {{ item.shortName }}
          </option>
        </select></label
      ><label
        ><span class="sr-only">Filtrar por revisión</span
        ><select
          v-model="statusFilter"
          class="select-input"
          aria-label="Filtrar por revisión"
        >
          <option value="all">Todo estado</option>
          <option value="pending">Pendientes</option>
          <option value="reviewed">Revisados</option>
        </select></label
      >
    </div>
    <div v-if="filtered.length" class="alert-list">
      <article
        v-for="alert in filtered"
        :key="alert.id"
        class="alert-row"
        :class="{ expanded: expandedId === alert.id }"
      >
        <div class="alert-main">
          <span class="alert-symbol" :class="alert.severity"
            ><CircleAlert :size="20" :stroke-width="1.6"
          /></span>
          <div class="alert-title">
            <div>
              <span class="alert-id">{{ alert.id }}</span><span
                v-if="reviewed.has(alert.id)"
                class="reviewed-label"
                ><Check :size="11" />Revisado</span
              >
            </div>
            <h3>{{ alert.title }}</h3>
            <p>
              <MapPin :size="11" />{{ alert.location }}<span>·</span
              >{{ alert.date }}
            </p>
          </div>
          <span class="status-tag" :class="`status-${alert.severity}`">{{
            severityLabels[alert.severity]
          }}</span><button
            class="alert-expand"
            :aria-expanded="expandedId === alert.id"
            :aria-controls="`detail-${alert.id}`"
            :aria-label="`${expandedId === alert.id ? 'Cerrar' : 'Ver'} detalle de ${alert.id}`"
            @click="expandedId = expandedId === alert.id ? null : alert.id"
          >
            <span>{{
              expandedId === alert.id ? "Cerrar" : "Ver detalle"
            }}</span><component
              :is="expandedId === alert.id ? ChevronUp : ChevronDown"
              :size="16"
            />
          </button>
        </div>
        <div
          v-if="expandedId === alert.id"
          :id="`detail-${alert.id}`"
          class="alert-detail"
        >
          <p>{{ alert.description }}</p>
          <p class="monitor-hint">
            El monitor original conserva sus propios controles. Selecciona el
            sector {{ alert.location }} dentro del módulo.
          </p>
          <div>
            <RouterLink to="/monitoreo" class="button button-primary"
              >Abrir monitoreo<ArrowUpRight :size="14" /></RouterLink
            ><button class="button" @click="toggleReviewed(alert.id)">
              <component
                :is="reviewed.has(alert.id) ? RotateCcw : Check"
                :size="14"
              />{{
                reviewed.has(alert.id)
                  ? "Marcar pendiente"
                  : "Marcar como revisado"
              }}
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="empty-state" role="status">
      <Search :size="28" />
      <h3>No encontramos escenarios</h3>
      <p>
        Prueba con otro sector o cambia los filtros para ver los escenarios
        disponibles.
      </p>
      <button class="button" @click="resetFilters">
        <RotateCcw :size="14" />Limpiar filtros
      </button>
    </div>
    <div class="alerts-bottom">
      <span><span class="small-dot" />Referencia histórica · 06 feb 2024</span
      ><span>4 cuencas · Arequipa</span>
    </div>
  </section>
  <div class="alerts-explanation">
    <Waves :size="21" class="text-muted" />
    <div>
      <h2>Primero, entender el contexto</h2>
      <p>
        Un cambio observado en el agua es el punto de partida. La validación de
        datos y la emisión de alertas operativas corresponden al equipo
        responsable del procesamiento.
      </p>
    </div>
  </div>
</template>

<style scoped>
.alerts-notice {
  margin-bottom: 22px;
}
.alert-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 22px 0;
  margin-bottom: 23px;
}
.alert-summary > div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  border-right: 1px solid var(--line);
}
.alert-summary > div:last-child {
  border: 0;
}
.summary-symbol {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--aqua-soft);
  color: var(--river);
}
.summary-symbol.critical {
  background: var(--critical-soft);
  color: var(--critical);
}
.summary-symbol.warning {
  background: var(--warning-soft);
  color: var(--warning);
}
.alert-summary > div > span:last-child {
  font-size: 11px;
  color: var(--muted);
}
.alert-summary strong {
  font-size: 25px;
  display: block;
  color: var(--ink);
  font-weight: 700;
  line-height: 1.4;
  margin-top: 3px;
}
.alert-filters {
  display: flex;
  gap: 11px;
  padding: 0 21px 20px;
  border-bottom: 1px solid var(--line);
}
.search-field {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--muted);
  flex: 1;
  min-width: 150px;
}
.search-field input {
  min-width: 0;
  width: 100%;
  height: 38px;
  border: 0;
  background: none;
  outline-offset: 3px;
  font-size: 12px;
  color: var(--ink);
}
.search-field input::placeholder {
  color: var(--muted);
}
.alert-filters select {
  font-size: 12px;
  padding-inline: 9px;
}
.alert-row {
  border-bottom: 1px solid var(--line);
}
.alert-row:last-child {
  border: 0;
}
.alert-main {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 23px 22px;
}
.alert-symbol {
  width: 41px;
  height: 41px;
  border: 1px solid var(--line);
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--warning);
}
.alert-symbol.critical {
  color: var(--critical);
  background: var(--critical-soft);
  border: 0;
}
.alert-title {
  flex: 1;
  min-width: 0;
}
.alert-title > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.alert-id {
  font-size: 10px;
  color: var(--muted);
}
.reviewed-label {
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--normal);
}
.alert-title h3 {
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -0.015em;
  margin: 6px 0 7px;
}
.alert-title p {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  flex-wrap: wrap;
}
.alert-title p > span {
  margin: 0 4px;
}
.alert-expand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  background: none;
  border: 0;
  color: var(--muted);
  padding: 12px 0 12px 16px;
}
.alert-expand:hover {
  color: var(--river);
}
.expanded {
  background: var(--aqua-soft);
}
.alert-detail {
  padding: 0 24px 24px 79px;
}
.alert-detail > p {
  font-size: 13px;
  line-height: 1.9;
  color: var(--muted);
  max-width: 75ch;
  margin: 0 0 18px;
}
.alert-detail > div {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.alerts-bottom {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 22px;
  background: var(--aqua-soft);
  font-size: 11px;
  color: var(--muted);
  border-top: 1px solid var(--line);
}
.alerts-bottom > span:first-child {
  display: flex;
  align-items: center;
  gap: 7px;
}
.alerts-bottom .small-dot {
  width: 4px;
  height: 4px;
}
.alerts-explanation {
  margin-top: 28px;
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 0 3px;
}
.alerts-explanation h2 {
  font-size: 14px;
  font-weight: 750;
  margin: 0 0 7px;
}
.alerts-explanation p {
  font-size: 12px;
  line-height: 1.9;
  color: var(--muted);
  max-width: 85ch;
  margin: 0;
}
@media (max-width: 1200px) {
  .alert-summary > div {
    padding-inline: 18px;
    gap: 9px;
  }
  .alert-filters {
    flex-wrap: wrap;
  }
  .search-field {
    flex-basis: 100%;
  }
  .alert-summary > div > span:last-child {
    font-size: 10px;
  }
  .summary-symbol {
    width: 34px;
    height: 34px;
  }
}
@media (max-width: 850px) {
  .alert-summary {
    grid-template-columns: 1fr 1fr;
    row-gap: 22px;
  }
  .alert-summary > div:nth-child(2) {
    border: 0;
  }
  .alert-main {
    gap: 12px;
  }
  .alert-expand > span {
    display: none;
  }
}
@media (max-width: 560px) {
  .alert-filters {
    padding: 0 16px 16px;
    gap: 8px;
  }
  .alert-filters > label:not(.search-field) {
    flex: 1;
    min-width: calc(50% - 8px);
  }
  .alert-filters select {
    width: 100%;
    font-size: 11px;
  }
  .alert-main {
    padding: 18px 15px;
    gap: 9px;
    flex-wrap: wrap;
  }
  .alert-symbol {
    width: 33px;
    height: 33px;
  }
  .alert-title {
    flex-basis: calc(100% - 46px);
  }
  .alert-main > .status-tag {
    margin-left: 42px;
  }
  .alert-expand {
    margin-left: auto;
    min-width: 42px;
    min-height: 42px;
    justify-content: center;
    padding: 5px;
  }
  .alert-expand > span {
    display: inline;
    font-size: 11px;
  }
  .alert-title h3 {
    font-size: 13px;
  }
  .alert-title p {
    font-size: 10px;
  }
  .alert-detail {
    padding: 0 16px 20px;
  }
  .alert-detail > p {
    font-size: 12px;
  }
  .alert-detail .button {
    font-size: 12px;
  }
  .alerts-bottom {
    font-size: 10px;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
  }
  .alert-summary > div {
    padding-inline: 14px;
  }
  .panel-heading > .subtle-label {
    font-size: 10px;
    text-align: right;
  }
}
</style>
