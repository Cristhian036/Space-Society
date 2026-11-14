<script setup lang="ts">
import { useTemplateRef } from "vue";
import { ExternalLink, Maximize } from "@lucide/vue";

// El mapa y los vectores se cargan desde el módulo original, sin reconstrucción.
// El adaptador de UI solo conecta su header/aside con los controles de Vue.
const moduleUrl = import.meta.env.VITE_MAP_MODULE_URL || "/original/";
const frame = useTemplateRef<HTMLDivElement>("frame");
const moduleElement = useTemplateRef<HTMLIFrameElement>("moduleElement");
const emit = defineEmits<{ loaded: [frame: HTMLIFrameElement] }>();
function onLoad() {
  if (moduleElement.value) emit("loaded", moduleElement.value);
}
async function expandModule() {
  try {
    if (frame.value?.requestFullscreen) {
      await frame.value.requestFullscreen();
      return;
    }
  } catch {
    /* Abrir el módulo si el navegador no permite pantalla completa. */
  }
  window.open(moduleUrl, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <section
    ref="frame"
    class="module-frame panel"
    aria-label="Módulo original del equipo de lógica"
  >
    <div class="module-toolbar">
      <div>
        <h2>Territorio y agua</h2>
        <p>Visor original · NISAR / Sentinel-1</p>
      </div>
      <div class="module-actions">
        <button
          class="icon-button"
          aria-label="Ampliar módulo original"
          title="Ampliar módulo"
          @click="expandModule"
        >
          <Maximize :size="15" /></button
        ><a
          :href="moduleUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="button"
          >Abrir módulo<ExternalLink :size="14"
        /></a>
      </div>
    </div>
    <iframe
      ref="moduleElement"
      :src="moduleUrl"
      title="Space Society: módulo original de mapas, vectores y SAR"
      class="original-module"
      allow="fullscreen"
      @load="onLoad"
    />
    <p class="module-caption">
      Mapa y vectores originales. El tema de la página no modifica su
      apariencia.
    </p>
  </section>
</template>

<style scoped>
.module-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 21px;
}
.module-toolbar h2 {
  font-size: 14px;
  font-weight: 750;
  margin: 0;
}
.module-toolbar p {
  font-size: 11px;
  line-height: 1.8;
  color: var(--muted);
  margin: 5px 0 0;
}
.module-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
}
.original-module {
  display: block;
  width: 100%;
  height: 700px;
  border: 0;
  background: #020617;
  color-scheme: normal;
}
.module-caption {
  font-size: 11px;
  color: var(--muted);
  padding: 13px 21px;
  margin: 0;
  line-height: 1.8;
  border-top: 1px solid var(--line);
}
.module-frame:fullscreen {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 0;
  border-radius: 0;
}
.module-frame:fullscreen .original-module {
  flex: 1;
  height: auto;
}
.module-frame:fullscreen .module-caption {
  display: none;
}
@media (min-width: 1650px) {
  .original-module {
    height: 780px;
  }
}
@media (max-width: 560px) {
  .module-toolbar {
    padding: 16px;
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .module-toolbar p {
    font-size: 10px;
  }
  .module-actions {
    align-self: flex-end;
  }
  .module-caption {
    font-size: 10px;
    padding: 12px 16px;
  }
  .original-module {
    height: 650px;
  }
}
</style>
