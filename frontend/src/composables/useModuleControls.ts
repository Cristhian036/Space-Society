import { onBeforeUnmount, shallowRef } from "vue";
import {
  moduleActions,
  moduleBasins,
  moduleGroups,
  moduleTextIds,
  type ModuleAction,
} from "../data/moduleControls";

export interface ModuleUiState {
  connected: boolean;
  message: string;
  values: Record<string, string | boolean>;
  text: Record<string, string>;
  activeBasin: string;
  scenes: string[];
  signal: { value: string; offset: string; height: string; active: boolean }[];
}
const fields = new Set(
  moduleGroups.flatMap((group) => group.fields.map((field) => field.id)),
);
const basinButtons = new Set<string>(moduleBasins.map((item) => item.id));

// Adaptador exclusivamente de UI: usa controles DOM originales y sus eventos.
// Nunca lee ni escribe el mapa, las geometrías o las APIs internas de Leaflet.
export function useModuleControls() {
  const state = shallowRef<ModuleUiState>({
    connected: false,
    message: "Cargando el módulo…",
    values: {},
    text: {},
    activeBasin: "btn-camana",
    scenes: [],
    signal: [],
  });
  let moduleDocument: Document | null = null;
  let observer: MutationObserver | undefined;
  let layout: HTMLStyleElement | undefined;
  let queued = false;

  function refresh() {
    if (!moduleDocument) return;
    const values: ModuleUiState["values"] = {};
    for (const id of fields) {
      const element = moduleDocument.getElementById(id) as
        HTMLInputElement | HTMLSelectElement | null;
      if (element)
        values[id] =
          element.type === "checkbox"
            ? (element as HTMLInputElement).checked
            : element.value;
    }
    const text = Object.fromEntries(
      moduleTextIds.map((id) => [
        id,
        moduleDocument?.getElementById(id)?.textContent?.trim() ?? "",
      ]),
    );
    const activeBasin =
      moduleBasins.find((item) =>
        moduleDocument?.getElementById(item.id)?.classList.contains("active"),
      )?.id ?? state.value.activeBasin;
    const scenes = Array.from(
      moduleDocument.getElementById("sar-scenes-reader-list")?.children ?? [],
    ).map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "");
    const signal = Array.from(
      moduleDocument.getElementById("backscatter-chart")?.children ?? [],
    ).map((column) => ({
      value: column.children[0]?.textContent?.trim() ?? "",
      offset: column.children[2]?.textContent?.trim() ?? "",
      height:
        (column.children[1] as HTMLElement | undefined)?.style.height ?? "0%",
      active: column.children[0]?.classList.contains("font-bold") ?? false,
    }));
    state.value = {
      connected: true,
      message: "",
      values,
      text,
      activeBasin,
      scenes,
      signal,
    };
  }
  function scheduleRefresh() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      refresh();
    });
  }
  function detach() {
    observer?.disconnect();
    moduleDocument?.removeEventListener("input", scheduleRefresh, true);
    moduleDocument?.removeEventListener("change", scheduleRefresh, true);
    layout?.remove();
    layout = undefined;
    moduleDocument = null;
  }
  function attach(frame: HTMLIFrameElement) {
    detach();
    try {
      const doc = frame.contentDocument;
      if (
        !doc?.querySelector("body > header") ||
        !doc.querySelector("body > main > aside")
      )
        throw new Error("module-ui-unavailable");
      moduleDocument = doc;
      // Solo oculta la barra y el panel cuya UI se traslada a Vue; permanecen en DOM
      // para que la lógica existente siga leyendo exactamente los mismos controles.
      layout = doc.createElement("style");
      layout.dataset.owner = "frontend-ui-shell";
      layout.textContent =
        "body > header, body > main > aside { display: none !important; } body > main { height: 100vh !important; height: 100dvh !important; }";
      doc.head.append(layout);
      observer = new MutationObserver(scheduleRefresh);
      for (const element of [
        doc.querySelector("body > header"),
        doc.querySelector("body > main > aside"),
      ]) {
        if (element)
          observer.observe(element, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
          });
      }
      doc.addEventListener("input", scheduleRefresh, true);
      doc.addEventListener("change", scheduleRefresh, true);
      refresh();
      // Evento de viewport normal; el módulo conserva su propio manejo de resize.
      doc.defaultView?.dispatchEvent(new Event("resize"));
    } catch {
      detach();
      state.value = {
        ...state.value,
        connected: false,
        message:
          "No se pudieron conectar los controles. Abre el módulo original o revisa su dirección de integración.",
      };
    }
  }
  function setControl(id: string, value: string | boolean) {
    if (!fields.has(id) || !moduleDocument) return;
    const element = moduleDocument.getElementById(id) as
      HTMLInputElement | HTMLSelectElement | null;
    if (!element) return;
    if (element.type === "checkbox")
      (element as HTMLInputElement).checked = Boolean(value);
    else element.value = String(value);
    element.dispatchEvent(
      new Event(element.type === "range" ? "input" : "change", {
        bubbles: true,
      }),
    );
    refresh();
  }
  function selectBasin(id: string) {
    if (!basinButtons.has(id)) return;
    moduleDocument?.getElementById(id)?.click();
    state.value = { ...state.value, activeBasin: id };
    refresh();
  }
  function runAction(action: ModuleAction) {
    moduleDocument?.querySelector<HTMLElement>(moduleActions[action])?.click();
    refresh();
  }
  function selectScene(index: number) {
    const element = moduleDocument
      ?.getElementById("sar-scenes-reader-list")
      ?.children.item(index) as HTMLElement | null;
    if (Number.isInteger(index) && index >= 0) element?.click();
  }
  function selectCycle(index: number) {
    if (!Number.isInteger(index) || index < 0 || index > 6) return;
    const button = moduleDocument
      ?.getElementById("orbital-timeline-steps")
      ?.children.item(index) as HTMLElement | null;
    button?.click();
    refresh();
  }
  onBeforeUnmount(detach);
  return {
    state,
    attach,
    detach,
    setControl,
    selectBasin,
    runAction,
    selectScene,
    selectCycle,
  };
}
