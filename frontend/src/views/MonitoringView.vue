<script setup lang="ts">
import OriginalModuleFrame from "../components/OriginalModuleFrame.vue";
import ModuleBasinBar from "../components/ModuleBasinBar.vue";
import ModuleTools from "../components/ModuleTools.vue";
import { useModuleControls } from "../composables/useModuleControls";
const controls = useModuleControls();
</script>
<template>
  <ModuleBasinBar
    :state="controls.state.value"
    @select="controls.selectBasin"
  />
  <div class="monitoring-workspace">
    <ModuleTools
      :state="controls.state.value"
      @control="controls.setControl"
      @action="controls.runAction"
      @scene="controls.selectScene"
      @cycle="controls.selectCycle"
    /><OriginalModuleFrame @loaded="controls.attach" />
  </div>
</template>
<style scoped>
.monitoring-workspace {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.monitoring-workspace :deep(.original-module) {
  height: 700px;
}
.monitoring-workspace :deep(.module-frame) {
  min-width: 0;
}
@media (max-width: 1150px) {
  .monitoring-workspace {
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 16px;
  }
  .monitoring-workspace :deep(.module-toolbar) {
    padding: 16px;
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
  .monitoring-workspace :deep(.module-actions) {
    align-self: flex-end;
  }
}
@media (max-width: 1000px) {
  .monitoring-workspace {
    grid-template-columns: 250px minmax(0, 1fr);
    gap: 14px;
  }
  .monitoring-workspace :deep(.original-module) {
    height: 630px;
  }
}
@media (max-width: 760px) {
  .monitoring-workspace {
    grid-template-columns: 1fr;
  }
  .monitoring-workspace :deep(.original-module) {
    height: 650px;
  }
}
</style>
