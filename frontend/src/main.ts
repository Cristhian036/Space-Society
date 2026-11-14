import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import "@fontsource-variable/manrope";
import "./styles.css";
import App from "./App.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/monitoreo" },
    {
      path: "/monitoreo",
      component: () => import("./views/MonitoringView.vue"),
      meta: { title: "Monitoreo" },
    },
    {
      path: "/analisis",
      component: () => import("./views/AnalysisView.vue"),
      meta: { title: "Análisis" },
    },
    {
      path: "/alertas",
      component: () => import("./views/AlertsView.vue"),
      meta: { title: "Alertas" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/monitoreo" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? "Monitoreo")} · Space Society`;
});
createApp(App).use(router).mount("#app");
