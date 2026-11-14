<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from "vue";
import { useRoute } from "vue-router";
import {
  Waves,
  Map,
  ChartNoAxesCombined,
  Bell,
  ArrowUpRight,
  ChevronDown,
  MapPin,
  FlaskConical,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
} from "@lucide/vue";
import { basins } from "./data/demo";
import { provideWorkspace } from "./composables/useWorkspace";
import { useTheme } from "./composables/useTheme";

const route = useRoute();
const { basinId } = provideWorkspace();
const { theme, toggleTheme } = useTheme();
const compact = shallowRef(false);
const mainContent = useTemplateRef<HTMLElement>("mainContent");
const title = computed(() => String(route.meta.title ?? "Monitoreo"));
const navigation = [
  {
    to: "/monitoreo",
    label: "Monitoreo",
    icon: Map,
    note: "Explora las cuencas",
  },
  {
    to: "/analisis",
    label: "Análisis",
    icon: ChartNoAxesCombined,
    note: "Compara observaciones",
  },
  {
    to: "/alertas",
    label: "Alertas",
    icon: Bell,
    note: "Revisa los escenarios",
  },
];
</script>

<template>
  <a
    class="skip-link"
    href="#main-content"
    @click.prevent="mainContent?.focus()"
    >Saltar al contenido</a
  >
  <div class="app-shell" :class="{ 'sidebar-compact': compact }">
    <aside class="sidebar" aria-label="Navegación principal">
      <RouterLink
        to="/monitoreo"
        class="brand"
        aria-label="Space Society, inicio"
      >
        <span class="brand-mark"><Waves :size="25" :stroke-width="1.8" /></span>
        <span class="brand-name">space<span>society</span></span>
      </RouterLink>
      <div class="workspace-label">
        <span class="small-dot" /> Observatorio de ríos
      </div>
      <nav class="navigation">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :title="item.label"
        >
          <component :is="item.icon" :size="20" :stroke-width="1.7" />
          <span class="nav-copy"
            >{{ item.label }}<small>{{ item.note }}</small></span
          >
          <span v-if="item.to === '/alertas'" class="nav-count">4</span>
        </RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <div class="region-note">
          <MapPin :size="17" />
          <div>Arequipa, Perú<small>Cuencas del sur</small></div>
        </div>
        <div class="project-note">
          <Waves :size="27" :stroke-width="1.4" />
          <p>El agua cambia.<br /><strong>La perspectiva también.</strong></p>
          <span>Observación satelital SAR</span>
        </div>
        <button
          class="collapse-button"
          :aria-label="compact ? 'Expandir navegación' : 'Contraer navegación'"
          :aria-expanded="!compact"
          @click="compact = !compact"
        >
          <component
            :is="compact ? PanelLeftOpen : PanelLeftClose"
            :size="18"
          /><span>Contraer menú</span>
        </button>
      </div>
    </aside>

    <div class="app-main">
      <header class="topbar">
        <div class="breadcrumbs">
          Espacio de trabajo <span>/</span> <strong>{{ title }}</strong>
        </div>
        <div class="topbar-actions">
          <button
            class="theme-toggle icon-button"
            :aria-label="
              theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'
            "
            :title="theme === 'light' ? 'Modo oscuro' : 'Modo claro'"
            @click="toggleTheme"
          >
            <component :is="theme === 'light' ? Moon : Sun" :size="17" />
          </button>
          <span class="demo-badge"
            ><FlaskConical v-if="title !== 'Monitoreo'" :size="14" />
            {{
              title === "Monitoreo"
                ? "Módulo original"
                : "Datos de demostración"
            }}</span
          ><a
            href="https://www.earthdata.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            class="source-link"
            >NASA Earthdata<ArrowUpRight :size="15" /></a
          ><span class="team-avatar" title="Space Society">SS</span>
        </div>
      </header>
      <main
        id="main-content"
        ref="mainContent"
        class="page-content"
        tabindex="-1"
      >
        <div class="page-heading">
          <div>
            <h1>
              {{
                title === "Monitoreo"
                  ? "Una mirada a nuestros ríos"
                  : title === "Análisis"
                    ? "Cada ciclo cuenta una historia"
                    : "Atención donde más importa"
              }}
            </h1>
            <p>
              {{
                title === "Monitoreo"
                  ? "Explora las cuencas y observa cómo cambia el agua."
                  : title === "Análisis"
                    ? "Compara las observaciones y entiende la evolución de la cuenca."
                    : "Explora los escenarios de riesgo y revisa cada sector."
              }}
            </p>
          </div>
          <label v-if="title === 'Análisis'" class="basin-select"
            ><MapPin :size="17" /><span class="sr-only"
              >Cuenca seleccionada</span
            ><select v-model="basinId" aria-label="Cuenca seleccionada">
              <option v-for="basin in basins" :key="basin.id" :value="basin.id">
                {{ basin.shortName }}
              </option></select
            ><ChevronDown :size="15"
          /></label>
        </div>
        <RouterView />
      </main>
      <footer class="app-footer">
        <span
          >Space Society <span class="footer-separator">/</span> Observación que
          conecta</span
        ><span
          >UI/UX de navegador <span class="footer-dot">·</span> Space
          Society</span
        >
      </footer>
    </div>
  </div>
</template>

<style scoped>
.theme-toggle {
  flex-shrink: 0;
}
@media (max-width: 560px) {
  .breadcrumbs {
    font-size: 0 !important;
  }
  .breadcrumbs strong {
    font-size: 12px;
  }
  .breadcrumbs > span {
    display: none;
  }
  .topbar-actions .theme-toggle {
    margin-right: 10px;
  }
}
.app-shell {
  display: grid;
  grid-template-columns: 224px minmax(0, 1fr);
  min-height: 100dvh;
  transition: grid-template-columns 0.22s ease-out;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 31px 18px 18px;
  background: var(--sidebar);
  border-right: 1px solid var(--line);
  overflow: hidden;
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--ink);
  text-decoration: none;
  padding: 0 10px;
}
.brand-mark {
  width: 39px;
  height: 42px;
  background: var(--brand-bg);
  color: white;
  display: grid;
  place-items: center;
  border-radius: 13px;
}
.brand-name {
  font-size: 21px;
  letter-spacing: -0.04em;
  font-weight: 800;
  line-height: 1;
}
.brand-name span {
  display: block;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.04em;
  margin-top: 5px;
}
.workspace-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 13px;
  margin: 31px 10px 22px;
  white-space: nowrap;
}
.navigation {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 12px;
  color: var(--muted);
  border-radius: 10px;
  text-decoration: none;
  min-height: 58px;
  transition:
    background 0.18s,
    color 0.18s;
}
.nav-item:hover {
  background: var(--aqua);
}
.nav-item.router-link-active {
  background: var(--aqua);
  color: var(--river-dark);
}
.nav-copy {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.nav-copy small {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  margin-top: 4px;
}
.nav-count {
  margin-left: auto;
  font-size: 12px;
  background: var(--surface);
  padding: 2px 6px;
  border-radius: 5px;
  color: var(--river-dark);
}
.sidebar-bottom {
  margin-top: auto;
  padding-top: 32px;
}
.region-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 12px 23px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.region-note svg {
  color: var(--river);
}
.region-note small {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  margin-top: 3px;
}
.project-note {
  background: var(--feature-bg);
  border-radius: 12px;
  padding: 19px 15px;
  color: var(--river-dark);
}
.project-note p {
  font-size: 14px;
  line-height: 1.8;
  margin: 13px 0 11px;
}
.project-note strong {
  font-weight: 700;
}
.project-note > span {
  font-size: 11px;
  color: var(--muted);
}
.collapse-button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-top: 19px;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 13px;
  padding: 10px 12px;
}
.topbar {
  height: 76px;
  padding: 0 34px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface);
  gap: 16px;
}
.breadcrumbs {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}
.breadcrumbs > span {
  margin: 0 12px;
  color: var(--line-strong);
}
.breadcrumbs strong {
  color: var(--ink);
  font-weight: 600;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 22px;
}
.demo-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--river-dark);
  background: var(--aqua);
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
}
.source-link {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
  white-space: nowrap;
}
.source-link:hover {
  color: var(--river);
}
.team-avatar {
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  width: 31px;
  height: 31px;
  font-size: 12px;
  color: var(--river-dark);
  background: var(--aqua-soft);
  font-weight: 700;
}
.page-content {
  padding: 31px 34px 24px;
  max-width: 1700px;
  margin: auto;
}
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 27px;
}
.page-heading h1 {
  font-size: clamp(22px, 2vw, 30px);
  letter-spacing: -0.035em;
  line-height: 1.3;
  margin: 0 0 8px;
  font-weight: 750;
}
.page-heading p {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
  line-height: 1.7;
}
.basin-select {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 0 12px;
  border-radius: 8px;
  color: var(--river);
  flex-shrink: 0;
}
.basin-select select {
  border: 0;
  appearance: none;
  background: none;
  min-height: 42px;
  color: var(--ink);
  font-weight: 650;
  padding-right: 22px;
  width: 160px;
  cursor: pointer;
  font-size: 13px;
}
.basin-select > svg:last-child {
  position: absolute;
  right: 13px;
  pointer-events: none;
  color: var(--muted);
}
.app-footer {
  padding: 0 34px 19px;
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: 11px;
  color: var(--muted);
}
.footer-separator {
  margin: 0 8px;
  color: var(--line-strong);
}
.footer-dot {
  margin: 0 8px;
}
.sidebar-compact {
  grid-template-columns: 80px minmax(0, 1fr);
}
.sidebar-compact .sidebar {
  padding-inline: 12px;
}
.sidebar-compact .brand {
  padding: 0 7px;
}
.sidebar-compact .brand-name,
.sidebar-compact .workspace-label,
.sidebar-compact .nav-copy,
.sidebar-compact .nav-count,
.sidebar-compact .region-note,
.sidebar-compact .project-note,
.sidebar-compact .collapse-button span {
  display: none;
}
.sidebar-compact .navigation {
  margin-top: 38px;
}
.sidebar-compact .nav-item {
  justify-content: center;
  padding: 12px;
}
.sidebar-compact .collapse-button {
  justify-content: center;
  padding: 12px;
}
@media (min-width: 1650px) {
  .page-content {
    padding-top: 40px;
  }
  .page-heading {
    margin-bottom: 32px;
  }
}
@media (max-width: 1150px) {
  .app-shell {
    grid-template-columns: 185px minmax(0, 1fr);
  }
  .sidebar {
    padding-inline: 12px;
  }
  .brand {
    padding-inline: 5px;
  }
  .brand-name {
    font-size: 19px;
  }
  .nav-copy small {
    font-size: 11px;
  }
  .topbar,
  .app-footer {
    padding-inline: 24px;
  }
  .page-content {
    padding-inline: 24px;
  }
  .source-link {
    display: none;
  }
  .sidebar-compact {
    grid-template-columns: 80px minmax(0, 1fr);
  }
}
@media (max-width: 800px) {
  .app-shell,
  .sidebar-compact {
    grid-template-columns: 70px minmax(0, 1fr);
  }
  .sidebar {
    padding: 24px 10px 14px;
  }
  .brand {
    padding: 0 5px;
  }
  .brand-name,
  .workspace-label,
  .nav-copy,
  .nav-count,
  .region-note,
  .project-note,
  .collapse-button {
    display: none;
  }
  .navigation {
    margin-top: 35px;
  }
  .nav-item {
    justify-content: center;
    padding: 12px;
  }
  .topbar {
    height: 65px;
    padding-inline: 20px;
  }
  .topbar-actions {
    gap: 10px;
  }
  .page-content {
    padding: 24px 20px;
  }
  .page-heading {
    align-items: flex-start;
    gap: 16px;
  }
  .page-heading h1 {
    font-size: 24px;
  }
  .basin-select select {
    width: 125px;
  }
  .app-footer {
    padding-inline: 20px;
    flex-direction: column;
    gap: 6px;
  }
}
@media (max-width: 560px) {
  .app-shell,
  .sidebar-compact {
    display: block;
  }
  .sidebar {
    position: static;
    width: 100%;
    height: auto;
    padding: 12px 16px;
    flex-direction: row;
    align-items: center;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    gap: 16px;
  }
  .brand {
    padding: 0;
  }
  .brand-mark {
    width: 34px;
    height: 35px;
    border-radius: 10px;
  }
  .brand-name {
    display: block;
    font-size: 15px;
  }
  .brand-name span {
    font-size: 12px;
    margin-top: 4px;
  }
  .navigation,
  .sidebar-compact .navigation {
    margin: 0 0 0 auto;
    flex-direction: row;
    gap: 4px;
  }
  .nav-item {
    min-height: 40px;
    padding: 10px;
  }
  .sidebar-bottom {
    display: none;
  }
  .topbar {
    height: 53px;
    padding-inline: 16px;
  }
  .breadcrumbs {
    font-size: 12px;
  }
  .breadcrumbs > span {
    margin: 0 7px;
  }
  .topbar-actions {
    gap: 0;
  }
  .team-avatar {
    display: none;
  }
  .demo-badge {
    font-size: 11px;
    padding: 6px;
  }
  .demo-badge svg {
    display: none;
  }
  .page-content {
    padding: 23px 16px;
  }
  .page-heading {
    flex-direction: column;
    margin-bottom: 20px;
    gap: 16px;
  }
  .page-heading h1 {
    font-size: 24px;
  }
  .page-heading p {
    font-size: 13px;
  }
  .basin-select {
    width: 100%;
    box-sizing: border-box;
  }
  .basin-select select {
    width: 100%;
  }
  .app-footer {
    padding-inline: 16px;
  }
  .sidebar-compact .brand-name {
    display: block;
  }
}
</style>
