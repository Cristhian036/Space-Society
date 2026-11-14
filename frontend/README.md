# Space Society · Frontend UI/UX

Aplicación independiente en Vue 3, TypeScript y Vite. Vistas: Monitoreo, Análisis y Alertas. Dirección visual elegida: Agua clara, con modo oscuro opcional para la página.

## Límite con el equipo de lógica

**El mapa, sus vectores, sus capas y todo el procesamiento pertenecen al otro equipo.** Esta aplicación no instala Leaflet, no importa geometrías ni reconstruye el mapa. `OriginalModuleFrame.vue` conserva el mapa existente en un iframe. Por petición expresa del usuario, `ModuleBasinBar.vue` y `ModuleTools.vue` trasladan la barra y el panel lateral a la vista general. `useModuleControls.ts` conecta exclusivamente sus botones, campos y estados DOM con los eventos originales; no llama funciones internas del mapa ni reconstruye geometrías. Los controles originales permanecen en el DOM para que su lógica siga funcionando, pero su header/aside duplicados se ocultan únicamente en la vista integrada. Solo se ajusta el espacio del main al retirar esas secciones. No se cambia el canvas del mapa, sus capas ni sus scripts. Los archivos originales de la raíz permanecen intactos.

La integración predeterminada usa `/original/`: Vite y su preview lo redirigen al servidor original `http://127.0.0.1:8000/`, manteniendo los controles en el mismo origen. El equipo responsable puede entregar una URL distinta mediante `VITE_MAP_MODULE_URL`; esta debe permitir mostrarse en un iframe y compartir origen para habilitar el puente de controles. Si no es posible, se informa el estado y se mantiene el acceso al módulo original. La configuración se realiza en `.env.local` (ver `.env.example`). No se han inventado contratos ni endpoints del backend.

## Ejecutar en desarrollo

Requiere Node 22.12+ o una versión compatible con Vite.

Iniciar el módulo original desde la raíz, sin modificarlo:

```powershell
python -m http.server 8000
```

En otra terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Abrir http://127.0.0.1:5173. El iframe usa el módulo original servido por separado; sus servicios de procesamiento se ejecutan según las instrucciones de su equipo.

```powershell
npm run build
npm test
npm run preview
```

Para desplegar, el servidor debe enrutar `/original/` al módulo del equipo de lógica, igual que el proxy de desarrollo. El build estático no incluye ese proxy. Si se usa otra URL, configurar `VITE_MAP_MODULE_URL` antes de compilar.

## Organización

- `src/App.vue`: estructura, navegación y tema de la página.
- `src/views/MonitoringView.vue`: contenedor visual de integración.
- `src/components/OriginalModuleFrame.vue`: frontera con el módulo del equipo de lógica.
- `src/views/AnalysisView.vue`: gráficas, comparación y exportación CSV con datos demo.
- `src/views/AlertsView.vue`: escenarios ilustrativos, filtros, búsqueda y revisión temporal.
- `src/components/ObservationTimeline.vue`: selección temporal de la vista de Análisis.
- `src/composables/useWorkspace.ts`: cuenca y ciclo seleccionados para el análisis de demostración.
- `src/composables/useTheme.ts`: tema claro/oscuro, guardado en el navegador.
- `src/data/`: nombres de cuencas y métricas de ejemplo; **sin coordenadas ni vectores**.

Se usa Composition API con `<script setup lang="ts">`, contratos tipados, `computed`, estado acotado y estilos de componente. La navegación usa hash para hosting estático. Las selecciones demo de Análisis son independientes de los controles originales de Monitoreo. La telemetría y firma temporal de Monitoreo reflejan los elementos del módulo original, sin usar las métricas demo.

## Referencias visuales

Análisis y Alertas usan datos de demostración identificados. Los siete ciclos ilustrativos son de enero a marzo de 2024. La comparación NISAR importa la imagen original de 2026 sin alterarla y la presenta por separado. Las revisiones de escenarios se reinician al salir de Alertas. El CSV identifica su contenido como demo.

`node scripts/snapshot-reference.mjs` regenera exclusivamente nombres y métricas de ejemplo desde el módulo original; no copia geometrías ni modifica archivos del otro equipo.

Contexto y tokens compartidos en `../PRODUCT.md`, `../DESIGN.md` y `../.impeccable/`. El backend y la integración final de datos reales permanecen a cargo del otro equipo.
