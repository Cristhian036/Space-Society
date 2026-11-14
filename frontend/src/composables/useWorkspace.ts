import {
  computed,
  inject,
  provide,
  shallowRef,
  type InjectionKey,
  type Ref,
  type ComputedRef,
} from "vue";
import { basins, cycles } from "../data/demo";
import type { Basin, BasinId, Cycle } from "../types";

interface Workspace {
  basinId: Ref<BasinId>;
  cycleIndex: Ref<number>;
  basin: ComputedRef<Basin>;
  cycle: ComputedRef<Cycle>;
}

const workspaceKey: InjectionKey<Workspace> = Symbol.for(
  "space-society.workspace",
);

export function provideWorkspace() {
  const basinId = shallowRef<BasinId>("camana");
  const cycleIndex = shallowRef(3);
  const basin = computed(
    () => basins.find((item) => item.id === basinId.value) ?? basins[0]!,
  );
  const cycle = computed(() => cycles[cycleIndex.value] ?? cycles[0]!);
  const workspace = { basinId, cycleIndex, basin, cycle };
  provide(workspaceKey, workspace);
  return workspace;
}

export function useWorkspace() {
  const workspace = inject(workspaceKey);
  if (!workspace)
    throw new Error("El espacio de cuencas debe estar dentro de App.");
  return workspace;
}
