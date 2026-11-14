<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from "vue";
import { Play, Pause, CalendarDays } from "@lucide/vue";
import { cycles } from "../data/demo";

const index = defineModel<number>({ required: true });
const playing = shallowRef(false);
let timer: ReturnType<typeof setInterval> | undefined;
function stop() {
  clearInterval(timer);
  timer = undefined;
  playing.value = false;
}
function toggle() {
  if (playing.value) {
    stop();
    return;
  }
  playing.value = true;
  timer = setInterval(() => {
    index.value = (index.value + 1) % cycles.length;
  }, 2000);
}
function select(value: number) {
  stop();
  index.value = value;
}
function onVisibility() {
  if (document.hidden) stop();
}
document.addEventListener("visibilitychange", onVisibility);
onBeforeUnmount(() => {
  stop();
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <section class="timeline" aria-label="Ciclos orbitales de demostración">
    <div class="timeline-heading">
      <div>
        <CalendarDays :size="15" />
        <h2>Recorrido temporal</h2>
        <span>2024 · cada 12 días</span>
      </div>
      <button
        class="play-button"
        :aria-label="playing ? 'Pausar recorrido' : 'Reproducir recorrido'"
        :aria-pressed="playing"
        @click="toggle"
      >
        <component :is="playing ? Pause : Play" :size="12" />{{
          playing ? "Pausar" : "Reproducir"
        }}
      </button>
    </div>
    <div class="timeline-steps">
      <button
        v-for="(cycle, i) in cycles"
        :key="cycle.cycleIndex"
        class="timeline-step"
        :class="{ selected: index === i, past: i < index }"
        :aria-pressed="index === i"
        :aria-label="`Ciclo ${i + 1}: ${cycle.shortDate}, ${cycle.sarBackscatterDb} dB`"
        @click="select(i)"
      >
        <span class="step-track"><span class="step-dot" /></span
        ><strong
          >{{ cycle.dateTrack47.slice(8) }}
          {{ i < 3 ? "ene" : i < 5 ? "feb" : "mar" }}</strong
        ><small>+{{ cycle.dayOffset }} días</small>
      </button>
    </div>
    <p class="timeline-current" aria-live="polite">
      {{ cycles[index]?.shortDate }}
      <span>· {{ cycles[index]?.phase.toLocaleLowerCase("es") }}</span>
    </p>
  </section>
</template>

<style scoped>
.timeline {
  padding: 17px 21px 15px;
  background: var(--surface);
  border-top: 1px solid var(--line);
}
.timeline-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.timeline-heading > div {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--river);
}
.timeline-heading h2 {
  font-size: 13px;
  color: var(--ink);
  margin: 0;
  font-weight: 750;
}
.timeline-heading > div > span {
  font-size: 11px;
  color: var(--muted);
  margin-left: 4px;
}
.play-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 5px;
  background: var(--aqua-soft);
  color: var(--river);
  font-size: 11px;
  padding: 7px 9px;
  min-height: 30px;
  font-weight: 700;
}
.play-button:hover {
  background: var(--aqua);
}
.timeline-steps {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  margin-top: 15px;
  gap: 0;
}
.timeline-step {
  background: none;
  border: 0;
  padding: 0 0 6px;
  min-height: 57px;
  color: var(--muted);
  text-align: center;
  border-radius: 5px;
}
.timeline-step:hover {
  background: var(--aqua-soft);
}
.step-track {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 15px;
  position: relative;
  margin-bottom: 6px;
}
.step-track::before {
  content: "";
  position: absolute;
  height: 2px;
  background: var(--line);
  left: 0;
  right: 0;
}
.timeline-step:first-child .step-track::before {
  left: 50%;
}
.timeline-step:last-child .step-track::before {
  right: 50%;
}
.step-dot {
  position: relative;
  z-index: 1;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line-strong);
  border: 2px solid var(--surface);
  box-sizing: content-box;
}
.selected .step-dot {
  background: var(--river);
  box-shadow: 0 0 0 3px var(--aqua);
  width: 9px;
  height: 9px;
}
.past .step-dot,
.past .step-track::before {
  background: var(--river);
}
.timeline-step strong {
  font-size: 12px;
  font-weight: 650;
  display: block;
}
.timeline-step small {
  font-size: 10px;
  display: block;
  margin-top: 4px;
}
.selected {
  color: var(--river-dark);
}
.selected strong {
  font-weight: 800;
}
.timeline-current {
  text-align: center;
  font-size: 11px;
  margin: 10px 0 0;
  color: var(--river);
  line-height: 1.7;
}
.timeline-current span {
  color: var(--muted);
}
@media (max-width: 560px) {
  .timeline {
    padding: 16px 12px;
  }
  .timeline-heading > div > span {
    display: none;
  }
  .timeline-step strong {
    font-size: 11px;
  }
  .timeline-current {
    font-size: 10px;
  }
  .timeline-heading h2 {
    font-size: 12px;
  }
}
</style>
