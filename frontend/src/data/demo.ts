import reference from "./reference.json";
import type { Basin, Cycle, DemoAlert, Severity } from "../types";

export const basins = reference.basins as Basin[];
export const cycles = reference.cycles as Cycle[];

export function cycleSeverity(index: number): Severity {
  const risk = cycles[index]?.riskLevel ?? "";
  if (risk.includes("ROJA")) return "critical";
  return risk.includes("VERDE") ? "normal" : "warning";
}

export const severityLabels: Record<Severity, string> = {
  critical: "Crítica",
  warning: "Vigilancia",
  normal: "Normal",
};

// Escenarios ilustrativos basados en los sectores del módulo original; no son alertas oficiales.
export const demoAlerts: DemoAlert[] = [
  {
    id: "DEMO-001",
    basin: "camana",
    title: "Expansión de agua en la ribera",
    location: "San Gregorio, Camaná",
    description:
      "Escenario de desborde sobre la llanura agrícola. Revisa la extensión de agua en el ciclo seleccionado y compárala con la línea base.",
    severity: "critical",
    date: "06 feb 2024",
  },
  {
    id: "DEMO-002",
    basin: "chili",
    title: "Incremento del cauce urbano",
    location: "Arancota, Tiabaya",
    description:
      "Escenario de incremento del cauce junto a parcelas y ribera urbana. La comparación multitemporal permite revisar el cambio.",
    severity: "critical",
    date: "06 feb 2024",
  },
  {
    id: "DEMO-003",
    basin: "ocona",
    title: "Ribera agrícola en observación",
    location: "Santa Rita, Ocoña",
    description:
      "Escenario de exposición de cultivos cercanos al río. Contrasta el periodo de referencia con la crecida.",
    severity: "warning",
    date: "06 feb 2024",
  },
  {
    id: "DEMO-004",
    basin: "tambo",
    title: "Cambio de extensión en el valle",
    location: "Cocachacra, Tambo",
    description:
      "Escenario de expansión de agua en el valle bajo. Revisa las observaciones de los siguientes ciclos.",
    severity: "warning",
    date: "06 feb 2024",
  },
];
