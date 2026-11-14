<script setup lang="ts">
import {
  SlidersHorizontal,
  Activity,
  RefreshCw,
  Info,
  ChevronDown,
} from "@lucide/vue";
import { moduleGroups, type ModuleAction } from "../data/moduleControls";
import type { ModuleUiState } from "../composables/useModuleControls";

defineProps<{ state: ModuleUiState }>();
const emit = defineEmits<{
  control: [id: string, value: string | boolean];
  action: [action: ModuleAction];
  scene: [index: number];
  cycle: [index: number];
}>();
const telemetry = [
  { id: "stat-flow", label: "Caudal" },
  { id: "sar-width", label: "Ancho SAR" },
  { id: "stat-hectares", label: "Inundado" },
  { id: "stat-pop", label: "Población" },
];
function change(event: Event, id: string) {
  const input = event.target as HTMLInputElement;
  emit("control", id, input.type === "checkbox" ? input.checked : input.value);
}
</script>
<template>
  <aside class="module-tools panel" aria-label="Herramientas de monitoreo">
    <div class="tools-heading">
      <SlidersHorizontal :size="17" />
      <h2>Herramientas de monitoreo</h2>
    </div>
    <div v-if="state.message" class="connection-message" role="status">
      <Info :size="15" />
      <p>{{ state.message }}</p>
    </div>
    <div class="module-telemetry">
      <div class="telemetry-heading">
        <Activity :size="15" /><strong>{{
          state.text["risk-level"] || "Estado de cuenca"
        }}</strong>
      </div>
      <p>{{ state.text["ana-code"] || "Información del módulo original" }}</p>
      <dl>
        <div v-for="item in telemetry" :key="item.id">
          <dt>{{ item.label }}</dt>
          <dd>{{ state.text[item.id] || "—" }}</dd>
        </div>
      </dl>
      <p class="telemetry-description">{{ state.text["risk-desc"] }}</p>
    </div>
    <div class="control-groups">
      <details
        v-for="(group, index) in moduleGroups"
        :key="group.title"
        :open="index === 0 || index === 2"
      >
        <summary>{{ group.title }}<ChevronDown :size="15" /></summary>
        <fieldset :disabled="!state.connected" :aria-label="group.title">
          <label
            v-for="field in group.fields"
            :key="field.id"
            :for="`ui-${field.id}`"
            class="module-field"
            :class="{ 'checkbox-field': field.type === 'checkbox' }"
            ><input
              v-if="field.type === 'checkbox'"
              :id="`ui-${field.id}`"
              :checked="Boolean(state.values[field.id])"
              type="checkbox"
              @change="change($event, field.id)" /><span
              >{{ field.label
              }}<output v-if="field.type === 'range'"
                >{{ state.values[field.id] }} {{ field.unit }}</output
              ></span
            ><select
              v-if="field.type === 'select'"
              :id="`ui-${field.id}`"
              :value="state.values[field.id]"
              class="select-input"
              @change="change($event, field.id)"
            >
              <option
                v-for="option in field.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option></select
            ><input
              v-else-if="field.type === 'range'"
              :id="`ui-${field.id}`"
              :value="state.values[field.id]"
              type="range"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              @input="change($event, field.id)" /><input
              v-else-if="field.type === 'password'"
              :id="`ui-${field.id}`"
              :value="state.values[field.id]"
              class="text-input"
              type="password"
              autocomplete="off"
              @change="change($event, field.id)" /></label
          ><button
            v-for="action in group.actions"
            :key="action.id"
            class="button tool-action"
            @click="emit('action', action.id)"
          >
            <RefreshCw
              v-if="action.id === 'fetchScenes' || action.id === 'recalculate'"
              :size="13"
            />{{ action.label }}
          </button>
        </fieldset>
        <p
          v-if="index === 0 && state.text['math-engine-status']"
          class="engine-status"
          role="status"
        >
          {{ state.text["math-engine-status"] }}
        </p>
        <p v-if="index === 2" class="detector-count">
          {{ state.text["detected-rivers-count"] }}
        </p>
        <div v-if="index === 3 && state.scenes.length" class="scene-list">
          <p>
            {{ state.text["asf-track-label"] }} ·
            {{ state.text["asf-date-label"] }}
          </p>
          <button
            v-for="(scene, i) in state.scenes"
            :key="i"
            @click="emit('scene', i)"
          >
            {{ scene }}
          </button>
        </div>
      </details>
    </div>
    <details class="signal-details">
      <summary>Firma temporal σ⁰<ChevronDown :size="15" /></summary>
      <div
        class="module-signal"
        aria-label="Firma temporal del módulo original"
      >
        <button
          v-for="(bar, index) in state.signal"
          :key="index"
          :aria-label="`Ciclo ${bar.offset}: ${bar.value} dB`"
          :aria-pressed="bar.active"
          :class="{ active: bar.active }"
          @click="emit('cycle', index)"
        >
          <strong>{{ bar.value }}</strong
          ><span class="signal-track"
            ><i :style="{ height: bar.height }" /></span
          ><small>{{ bar.offset }}</small>
        </button>
      </div>
    </details>
  </aside>
</template>
<style scoped>
.module-signal {
  height: 180px;
  padding: 5px 16px 18px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}
.module-signal button {
  border: 0;
  background: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  border-radius: 4px;
  min-width: 0;
}
.module-signal strong {
  font-size: 10px;
  font-weight: 650;
}
.module-signal small {
  font-size: 10px;
}
.signal-track {
  height: 110px;
  display: flex;
  align-items: flex-end;
  width: 100%;
  padding-inline: 3px;
}
.signal-track i {
  display: block;
  width: 100%;
  background: var(--line-strong);
  border-radius: 3px 3px 0 0;
}
.module-signal .active {
  color: var(--river-dark);
}
.module-signal .active i {
  background: var(--river);
}
.module-signal button:hover {
  background: var(--aqua-soft);
}
.module-tools {
  height: 826px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.tools-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 19px 17px;
  border-bottom: 1px solid var(--line);
  color: var(--river);
}
.tools-heading h2 {
  font-size: 13px;
  color: var(--ink);
  margin: 0;
  font-weight: 750;
}
.connection-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 17px;
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 11px;
  line-height: 1.8;
}
.connection-message p {
  margin: 0;
}
.connection-message svg {
  margin-top: 2px;
}
.module-telemetry {
  padding: 17px;
  border-bottom: 1px solid var(--line);
  background: var(--aqua-soft);
}
.telemetry-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--river-dark);
  font-size: 11px;
}
.module-telemetry > p {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.8;
  margin: 9px 0 0;
}
.module-telemetry dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px 10px;
  margin: 15px 0;
}
.module-telemetry dt {
  font-size: 10px;
  color: var(--muted);
}
.module-telemetry dd {
  font-size: 15px;
  font-weight: 750;
  margin: 4px 0 0;
}
.module-telemetry .telemetry-description {
  font-size: 10px;
}
.control-groups details,
.signal-details {
  border-bottom: 1px solid var(--line);
}
summary {
  padding: 16px 17px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 750;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
summary svg {
  color: var(--muted);
  transition: transform 0.18s ease-out;
}
details[open] > summary svg {
  transform: rotate(180deg);
}
.control-groups fieldset {
  border: 0;
  padding: 0 17px 18px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  min-width: 0;
}
.module-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.7;
  min-width: 0;
}
.module-field > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.module-field output {
  font-size: 11px;
  color: var(--river);
  font-weight: 750;
  white-space: nowrap;
}
.module-field .select-input,
.module-field .text-input {
  width: 100%;
  min-width: 0;
  font-size: 11px;
}
.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 9px;
  cursor: pointer;
}
.checkbox-field input {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.module-field input {
  accent-color: var(--river);
}
.module-field input[type="range"] {
  width: 100%;
  margin: 0;
  min-height: 22px;
}
.tool-action {
  width: 100%;
  font-size: 11px;
  min-height: 38px;
  text-align: center;
}
.tool-action:first-of-type {
  background: var(--aqua-soft);
  color: var(--river-dark);
}
.engine-status,
.detector-count {
  margin: 0 17px 17px;
  font-size: 10px;
  line-height: 1.8;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.scene-list {
  padding: 0 17px 17px;
}
.scene-list > p {
  font-size: 10px;
  line-height: 1.7;
  color: var(--muted);
  margin: 0 0 8px;
}
.scene-list button {
  display: block;
  width: 100%;
  font-size: 9px;
  text-align: left;
  border: 0;
  background: var(--aqua-soft);
  color: var(--river-dark);
  padding: 9px;
  margin-top: 5px;
  border-radius: 5px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.signal-details {
  border-bottom: 0;
}
@media (max-width: 1000px) {
  .module-tools {
    height: 760px;
  }
}
@media (max-width: 760px) {
  .module-tools {
    height: auto;
    max-height: 650px;
  }
  .module-telemetry dl {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .module-telemetry dd {
    font-size: 13px;
  }
}
</style>
