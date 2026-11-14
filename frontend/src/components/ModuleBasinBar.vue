<script setup lang="ts">
import { Globe, Satellite } from "@lucide/vue";
import { moduleBasins } from "../data/moduleControls";
import type { ModuleUiState } from "../composables/useModuleControls";
defineProps<{ state: ModuleUiState }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>
<template>
  <section class="basin-bar panel" aria-label="Cuencas y cobertura nacional">
    <nav class="basin-buttons" aria-label="Seleccionar cuenca en el módulo">
      <button
        v-for="basin in moduleBasins"
        :key="basin.id"
        :aria-pressed="state.activeBasin === basin.id"
        :disabled="!state.connected"
        :class="{ selected: state.activeBasin === basin.id }"
        @click="emit('select', basin.id)"
      >
        <Globe v-if="basin.id === 'btn-peru-all'" :size="15" /><Satellite
          v-else-if="basin.id === 'btn-all-tracks'"
          :size="15"
        />{{ basin.label }}
      </button>
    </nav>
    <div class="module-live-status">
      <span class="small-dot" /><span>{{
        state.text["header-active-stats"] || "Conectando módulo…"
      }}</span
      ><time>{{ state.text.clock }}</time>
    </div>
  </section>
</template>
<style scoped>
.basin-bar {
  margin-bottom: 20px;
}
.basin-buttons {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 12px;
  overflow-x: auto;
}
.basin-buttons button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  border: 0;
  background: none;
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}
.basin-buttons button:hover {
  background: var(--aqua-soft);
  color: var(--river);
}
.basin-buttons .selected {
  color: var(--river-dark);
  background: var(--aqua);
  font-weight: 750;
}
.module-live-status {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding: 10px 18px;
  background: var(--aqua-soft);
  font-size: 10px;
  color: var(--muted);
}
.module-live-status time {
  margin-left: auto;
  white-space: nowrap;
}
.module-live-status .small-dot {
  width: 5px;
  height: 5px;
}
@media (max-width: 560px) {
  .basin-buttons button {
    font-size: 11px;
    padding-inline: 10px;
  }
  .module-live-status {
    font-size: 8px;
    padding: 10px 12px;
    gap: 6px;
  }
}
</style>
