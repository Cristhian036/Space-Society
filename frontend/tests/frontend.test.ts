import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import AlertsView from "../src/views/AlertsView.vue";
import ObservationTimeline from "../src/components/ObservationTimeline.vue";
import { provideWorkspace } from "../src/composables/useWorkspace";
import { cycles, cycleSeverity } from "../src/data/demo";
import OriginalModuleFrame from "../src/components/OriginalModuleFrame.vue";
import { useTheme } from "../src/composables/useTheme";
import { useModuleControls } from "../src/composables/useModuleControls";

const mounted: VueWrapper[] = [];
describe("Controles generales del módulo", () => {
  it("acciona los controles originales y conserva intacto el contenido del visor", async () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const doc = iframe.contentDocument!;
    doc.body.innerHTML =
      '<header><button id="btn-tambo">Tambo</button></header><main><aside><input id="sar-threshold-slider" type="range" min="-21" max="-10" step="0.5" value="-14"><span id="stat-flow">540 m³/s</span></aside><div id="map"><svg data-owner="logic-team"><path d="M0 0L5 5" /></svg></div></main>';
    const originalMap = doc.getElementById("map")!.outerHTML;
    let receivedThreshold = "";
    doc
      .getElementById("sar-threshold-slider")!
      .addEventListener("input", (event) => {
        receivedThreshold = (event.target as HTMLInputElement).value;
      });
    doc.getElementById("btn-tambo")!.addEventListener("click", () => {
      doc.getElementById("stat-flow")!.textContent = "290 m³/s";
    });
    let bridge!: ReturnType<typeof useModuleControls>;
    const Host = defineComponent({
      setup() {
        bridge = useModuleControls();
        return () => h("p", bridge.state.value.text["stat-flow"]);
      },
    });
    const wrapper = mount(Host);
    mounted.push(wrapper);
    bridge.attach(iframe);
    bridge.setControl("sar-threshold-slider", "-15");
    expect(receivedThreshold).toBe("-15");
    bridge.selectBasin("btn-tambo");
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toBe("290 m³/s");
    bridge.setControl("map", "invalid");
    expect(doc.getElementById("map")!.outerHTML).toBe(originalMap);
    expect(doc.querySelector("header")).not.toBeNull();
    expect(doc.querySelector("aside")).not.toBeNull();
    bridge.detach();
    expect(doc.querySelector('[data-owner="frontend-ui-shell"]')).toBeNull();
    iframe.remove();
  });
  it("informa cuando el módulo no ofrece la UI esperada", async () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    let bridge!: ReturnType<typeof useModuleControls>;
    const Host = defineComponent({
      setup() {
        bridge = useModuleControls();
        return () => h("p", { role: "status" }, bridge.state.value.message);
      },
    });
    const wrapper = mount(Host);
    mounted.push(wrapper);
    bridge.attach(iframe);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No se pudieron conectar los controles");
    expect(bridge.state.value.connected).toBe(false);
    iframe.remove();
  });
});
describe("Límite de integración del módulo original", () => {
  it("alterna el tema de la página conservando el iframe del equipo de lógica", async () => {
    localStorage.clear();
    const Host = defineComponent({
      setup() {
        const { toggleTheme } = useTheme();
        return () =>
          h("div", [
            h("button", { onClick: toggleTheme }, "Cambiar tema"),
            h(OriginalModuleFrame),
          ]);
      },
    });
    const wrapper = mount(Host);
    mounted.push(wrapper);
    const frameElement = wrapper.get("iframe").element;
    const originalSrc = wrapper.get("iframe").attributes("src");
    await wrapper.get("button").trigger("click");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(wrapper.get("iframe").element).toBe(frameElement);
    expect(wrapper.get("iframe").attributes("src")).toBe(originalSrc);
    expect(wrapper.get("iframe").attributes("srcdoc")).toBeUndefined();
    await wrapper.get("button").trigger("click");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(wrapper.get("iframe").element).toBe(frameElement);
  });
});
afterEach(() => {
  mounted.forEach((wrapper) => wrapper.unmount());
  mounted.length = 0;
  vi.useRealTimers();
});

function mountAlerts() {
  const Host = defineComponent({
    setup() {
      provideWorkspace();
      return () => h(AlertsView);
    },
  });
  const wrapper = mount(Host, {
    global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
  });
  mounted.push(wrapper);
  return wrapper;
}

describe("Escenarios de alerta", () => {
  it("respeta las prioridades del escenario original", () => {
    for (const cycle of cycles) {
      const severity = cycleSeverity(cycle.cycleIndex);
      if (cycle.riskLevel.includes("ROJA")) expect(severity).toBe("critical");
      else if (cycle.riskLevel.includes("VERDE"))
        expect(severity).toBe("normal");
      else expect(severity).toBe("warning");
    }
  });
  it("busca sectores sin depender de acentos y permite recuperar una búsqueda vacía", async () => {
    const wrapper = mountAlerts();
    await wrapper
      .get('input[aria-label="Buscar escenarios"]')
      .setValue("camana");
    expect(wrapper.findAll("article")).toHaveLength(1);
    expect(wrapper.get("article").text()).toContain("San Gregorio");
    await wrapper
      .get('input[aria-label="Buscar escenarios"]')
      .setValue("sin resultados");
    expect(wrapper.text()).toContain("No encontramos escenarios");
    const reset = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Limpiar filtros"))!;
    await reset.trigger("click");
    expect(wrapper.findAll("article")).toHaveLength(4);
  });

  it("combina cuenca y prioridad y permite revisar y deshacer una revisión", async () => {
    const wrapper = mountAlerts();
    await wrapper
      .get('select[aria-label="Filtrar por prioridad"]')
      .setValue("critical");
    await wrapper
      .get('select[aria-label="Filtrar por cuenca"]')
      .setValue("camana");
    expect(wrapper.findAll("article")).toHaveLength(1);
    await wrapper
      .get('button[aria-label="Ver detalle de DEMO-001"]')
      .trigger("click");
    expect(wrapper.text()).toContain("Escenario de desborde");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Marcar como revisado"))!
      .trigger("click");
    expect(wrapper.get("article").text()).toContain("Revisado");
    await wrapper
      .get('select[aria-label="Filtrar por revisión"]')
      .setValue("pending");
    expect(wrapper.findAll("article")).toHaveLength(0);
    await wrapper
      .get('select[aria-label="Filtrar por revisión"]')
      .setValue("reviewed");
    expect(wrapper.findAll("article")).toHaveLength(1);
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Marcar pendiente"))!
      .trigger("click");
    expect(wrapper.findAll("article")).toHaveLength(0);
  });
});

describe("Recorrido temporal", () => {
  it("emite el ciclo elegido y mantiene una sola selección visible", async () => {
    const wrapper = mount(ObservationTimeline, { props: { modelValue: 3 } });
    mounted.push(wrapper);
    await wrapper.get('button[aria-label^="Ciclo 1:"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([0]);
    await wrapper.setProps({ modelValue: 0 });
    expect(
      wrapper.get('button[aria-label^="Ciclo 1:"]').attributes("aria-pressed"),
    ).toBe("true");
    expect(
      wrapper.get('button[aria-label^="Ciclo 4:"]').attributes("aria-pressed"),
    ).toBe("false");
  });

  it("detiene el recorrido al desmontar la vista", async () => {
    vi.useFakeTimers();
    const wrapper = mount(ObservationTimeline, { props: { modelValue: 3 } });
    await wrapper
      .get('button[aria-label="Reproducir recorrido"]')
      .trigger("click");
    vi.advanceTimersByTime(2000);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([4]);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
