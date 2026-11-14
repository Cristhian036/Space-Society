export type BasinId = "camana" | "chili" | "ocona" | "tambo";
export type Severity = "critical" | "warning" | "normal";
export interface Metrics {
  flow: string;
  ha: string;
  pop: string;
  width: string;
}
export interface Cycle {
  cycleIndex: number;
  dayOffset: number;
  shortDate: string;
  dateTrack47: string;
  phase: string;
  riskLevel: string;
  sarBackscatterDb: number;
  summary: string;
  metrics: Record<BasinId, Metrics>;
}
export interface Basin {
  id: BasinId;
  name: string;
  shortName: string;
  anaCode: string;
}
export interface DemoAlert {
  id: string;
  basin: BasinId;
  title: string;
  location: string;
  description: string;
  severity: Severity;
  date: string;
}
