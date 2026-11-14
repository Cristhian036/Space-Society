---
name: Space Society — Agua clara
description: UI de observación de ríos con blanco frío, azul río y verde agua, y tema oscuro opcional.
colors:
  ground: "#f4f8f8"
  surface: "#fff"
  sidebar: "#f9fcfb"
  ink: "#193d43"
  muted: "#536f74"
  river: "#087f8c"
  river-dark: "#086773"
  aqua: "#e2f2ee"
  aqua-soft: "#f0f8f5"
  line: "#dfe9e8"
  line-strong: "#b9ccce"
  critical: "#ad453f"
  critical-soft: "#fff1ed"
  warning: "#926718"
  warning-soft: "#fff7e8"
  normal: "#32705a"
  normal-soft: "#eaf5ed"
  on-river: "#ffffff"
  brand-bg: "#087f8c"
  feature-bg: "#e5f2ef"
  dark-ground: "#101f24"
  dark-surface: "#192f36"
  dark-sidebar: "#13272d"
  dark-ink: "#e5f1ef"
  dark-muted: "#adc4c5"
  dark-river: "#72d1c7"
  dark-river-dark: "#9bdfd3"
  dark-aqua: "#244b4b"
  dark-aqua-soft: "#1d3b40"
  dark-line: "#304a52"
  dark-line-strong: "#55777e"
  dark-critical: "#ffafa3"
  dark-critical-soft: "#4a3235"
  dark-warning: "#efd093"
  dark-warning-soft: "#413e30"
  dark-normal: "#a0d8b8"
  dark-normal-soft: "#244238"
  dark-on-river: "#102e30"
  dark-feature-bg: "#1e3e41"
  focus: "#4b9fae"
  chart-threshold: "#bd8b42"
typography:
  headline:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "clamp(22px, 2vw, 30px)"
    fontWeight: 750
    lineHeight: 1.3
    letterSpacing: "-0.035em"
  metric:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "-0.03em"
  title:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "13px"
    fontWeight: 750
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "14px"
    lineHeight: 1.7
  button:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "13px"
    fontWeight: 650
  label:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "12px"
  status:
    fontFamily: '"Manrope Variable", sans-serif'
    fontSize: "11px"
    fontWeight: 750
rounded:
  plot-control: "4px"
  status: "5px"
  basin-control: "6px"
  control: "7px"
  notice: "8px"
  nav: "10px"
  panel: "12px"
spacing:
  gap-tight: "6px"
  gap-control: "8px"
  gap-standard: "12px"
  inset-mobile: "16px"
  inset-table: "20px"
  gap-section: "21px"
  inset-tablet: "24px"
  inset-desktop: "34px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-hover:
    backgroundColor: "{colors.aqua-soft}"
  button-primary:
    backgroundColor: "{colors.river}"
    textColor: "{colors.on-river}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.river-dark}"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    width: "36px"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  navigation-active:
    backgroundColor: "{colors.aqua}"
    textColor: "{colors.river-dark}"
    rounded: "{rounded.nav}"
    padding: "13px 12px"
  basin-control:
    textColor: "{colors.muted}"
    rounded: "{rounded.basin-control}"
    padding: "8px 12px"
  basin-control-selected:
    backgroundColor: "{colors.aqua}"
    textColor: "{colors.river-dark}"
    rounded: "{rounded.basin-control}"
    padding: "8px 12px"
  status-critical:
    backgroundColor: "{colors.critical-soft}"
    textColor: "{colors.critical}"
    typography: "{typography.status}"
    rounded: "{rounded.status}"
    padding: "5px 8px"
  status-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    typography: "{typography.status}"
    rounded: "{rounded.status}"
    padding: "5px 8px"
  status-normal:
    backgroundColor: "{colors.normal-soft}"
    textColor: "{colors.normal}"
    typography: "{typography.status}"
    rounded: "{rounded.status}"
    padding: "5px 8px"
---

# Design System: Space Society

## Overview

**Creative North Star: "Agua clara"**

La dirección elegida por el usuario es «Agua clara: blanco, azul río y verde agua; análisis con escalas comparables». La implementación usa superficies frías, texto oscuro y acentos de río para organizar un espacio de trabajo de observación. Manrope, cifras tabulares y líneas finas sostienen una lectura compacta de nombres, fechas y mediciones.

El modo oscuro opcional transforma la página exterior en tonos de agua profunda y conserva las mismas jerarquías. Este sistema describe únicamente `frontend/`, incluida la presentación Vue de la cabecera y del panel de herramientas trasladados desde el módulo. El mapa del iframe mantiene su apariencia y responsable; no se extraen sus tokens ni sus reglas.

**Key Characteristics:**
- Superficies planas, bordes finos y esquinas suavizadas.
- Azul río y verde agua para interacción, selección y series.
- Coral, ámbar y verde acompañados de etiquetas de estado.
- Cifras tabulares y escalas estables para comparar observaciones.
- Tema opcional persistente limitado a la página exterior.

Fuentes de verdad: `frontend/src/styles.css`, `frontend/src/App.vue`, sus componentes y vistas. Este registro se extrajo del código implementado; no existe una composición visual aprobada de ImageGen.

## Colors

La paleta combina blanco frío, azul río y verde agua; el tema oscuro sustituye sus valores semánticos sin cambiar la estructura.

### Primary

- **Azul río** (`river`): acciones principales, enlaces, iconos de datos, trazos y observación seleccionada.
- **Río profundo** (`river-dark`): texto de navegación activa y hover de la acción principal. En oscuro su valor es más luminoso para mantener la jerarquía sobre agua profunda.
- **Marca** (`brand-bg`): fondo del símbolo Space Society; conserva el mismo valor en ambos temas y usa blanco.
- **Texto sobre río** (`on-river`): texto de botones principales y etiquetas de valor en gráficas; cambia con el tema.

### Secondary

- **Verde agua** (`aqua`): navegación activa, selección temporal y relleno de gráficas.
- **Agua tenue** (`aqua-soft`): hover, avisos, cabeceras de tabla y filas seleccionadas.
- **Agua de apoyo** (`feature-bg`): superficie del mensaje inferior de la barra lateral.

### Tertiary

- **Coral crítico** (`critical` / `critical-soft`): prioridad crítica con etiqueta y punto de estado.
- **Ámbar vigilancia** (`warning` / `warning-soft`): escenarios de vigilancia.
- **Verde normal** (`normal` / `normal-soft`): normalidad y revisión.
- **Referencia SAR** (`chart-threshold`): línea discontinua y leyenda del umbral de referencia. Es un color fijo de la gráfica, distinto del estado de vigilancia.

### Neutral

- **Fondo frío** (`ground`), **superficie** (`surface`) y **lateral** (`sidebar`): tres planos sin sombra.
- **Tinta** (`ink`) y **texto secundario** (`muted`): jerarquía de lectura.
- **Línea** (`line`) y **línea reforzada** (`line-strong`): límites y hover de controles.
- **Foco** (`focus`): contorno de teclado independiente del relleno.

El prefijo `dark-` en el frontmatter registra el valor real del mismo token bajo `:root[data-theme="dark"]`; el CSS usa el nombre sin prefijo en ambos modos. `brand-bg` y `focus` no cambian. No son una segunda marca ni paletas para combinar libremente.

**The Estado legible Rule.** El color de prioridad siempre acompaña texto; los chips añaden un punto del mismo color. Conservar las tres parejas semánticas al cambiar de tema.

## Typography

**Display Font:** no hay familia display separada.
**Body Font:** Manrope Variable, con fallback sans-serif; importada desde `@fontsource-variable/manrope`.

**Character:** una sola familia variable articula títulos, controles y medidas. Las cifras usan `font-variant-numeric: tabular-nums` globalmente; la jerarquía depende de tamaño, peso y espaciado, sin mayúsculas ornamentales.

### Hierarchy

- **Headline:** título de página fluido según el frontmatter; pasa a tamaño fijo (24px) a partir del corte de tablet.
- **Metric:** valores de Análisis; bajan a (21px) en pantallas de hasta (1200px). Los resúmenes de Alertas usan (25px), peso (700), interlínea (1.4).
- **Title:** título compacto de panel; los títulos de filas y del módulo usan (14px), peso (750).
- **Body:** presentación de página y explicaciones. Los detalles de alerta usan (13px), interlínea (1.9), máximo (75ch); el estado vacío usa máximo (45ch).
- **Button / Label / Status:** roles compactos del frontmatter. Los ejes usan (11px) y los valores flotantes (12px), peso (700).

## Layout

La estructura de escritorio es una cuadrícula lateral de (224px) más contenido flexible. La navegación permanece sticky y ocupa (100dvh). El modo contraído usa (80px). La cabecera mide (76px); el contenido se limita a (1700px), con márgenes automáticos y padding lateral de escritorio del frontmatter.

La composición responde a cortes observados, sin una escala universal inventada: a (1150px) el lateral baja a (185px) y los insets a (24px); a (800px) queda una franja de iconos de (70px), cabecera de (65px) e insets de (20px). A (560px) la navegación pasa arriba, la cabecera mide (53px), el contenido usa (16px) de inset y el selector de cuenca ocupa el ancho disponible. El ancho mínimo del documento es (320px). A partir de (1650px) aumenta el espacio superior.

Análisis usa dos columnas de gráficas con separación de (21px), que pasa a (16px) a (1200px); a (1000px) queda una columna y los cuatro indicadores pasan a una cuadrícula de dos columnas. Alertas adapta los filtros a (1200px) y sus resúmenes a dos columnas a (850px). Las tablas mantienen scroll horizontal. La escala de espacio registra pasos reutilizados; existen ajustes locales que no constituyen tokens nuevos.

Monitoreo sitúa la barra de cuencas sobre herramientas y visor. El panel de herramientas ocupa (310px), luego (280px) a (1150px) y (250px) a (1000px); la separación es (20px), (16px) y (14px), respectivamente. A (760px) se apilan en una columna. El panel tiene scroll interno con gutter estable y altura de (826px), reducida a (760px) a (1000px); al apilarse usa altura automática con máximo de (650px).

**The Comparación estable Rule.** En Análisis, mantener caudal de 0 a 1000 m³/s y retrodispersión de −24 a 0 dB al cambiar de cuenca. La fecha seleccionada se comparte entre las dos gráficas, la línea temporal y la tabla.

## Elevation & Depth

Las superficies son planas: no hay sombras de elevación en botones, paneles o navegación. La profundidad proviene del fondo, las superficies y sus bordes de (1px). El único `box-shadow` observado es el halo de selección del punto temporal (`0 0 0 3px var(--aqua)`); señala estado, no eleva una tarjeta.

Las transiciones de botones y navegación duran (0.18s); contraer el lateral anima sus columnas durante (0.22s) con `ease-out`. Los chevrons SVG de herramientas giran (180deg) con transición de transform de (0.18s ease-out) al abrir el grupo. `prefers-reduced-motion: reduce` elimina animaciones, transiciones y desplazamiento suave. No se inicia reproducción temporal automáticamente.

## Shapes

Paneles de esquinas suaves, controles más compactos y etiquetas pequeñas usan la escala del frontmatter. Los paneles recortan el contenido y tienen borde fino. Los resúmenes y elementos de navegación comparten radio de (10px). Los círculos quedan para puntos de estado, puntos temporales y avatar. Los iconos de la aplicación son SVG de Lucide; no se usan caracteres tipográficos como sustitutos.

## Components

### Buttons

Acciones compactas con texto explícito e icono SVG cuando corresponde. La altura mínima base es (38px); a (560px) sube a (42px). El botón secundario usa superficie, tinta y borde de línea; su hover usa agua tenue y línea reforzada. El primario usa río y texto sobre río; su hover usa río profundo. Los icon buttons son cuadrados de (36px), o (42px) en móvil, con hover verde agua y río. Los controles deshabilitados reducen opacidad a (0.55) y cambian el cursor.

El foco visible de botones, enlaces, inputs, selects, summaries y elementos enfocables usa contorno de (3px), separado (4px). No depende del hover.

### Chips

Las etiquetas de estado usan pareja semántica, radio y padding del frontmatter, texto de peso fuerte y punto previo de (5px). La etiqueta de cabecera distingue «Módulo original» y «Datos de demostración»; no se interpreta como un estado operativo.

### Cards / Containers

El panel base usa superficie, borde de línea y radio de panel. Su cabecera alinea título y acción con separación de (12px) y padding de (19px 21px); en móvil usa (16px). Las filas de tabla y los detalles expandidos usan agua tenue para estado. Los avisos usan fondo agua tenue, texto río profundo y radio de aviso.

### Inputs / Fields

Campos y selectores usan superficie, tinta, borde fino y radio de control. La altura mínima base es (39px). El placeholder usa texto secundario; el caret usa río. La búsqueda de Alertas integra icono y campo en un mismo borde. Los filtros de prioridad, cuenca y revisión conservan etiquetas accesibles. No hay un lenguaje de validación de formularios implementado que extraer.

### Navigation

Los enlaces laterales combinan icono y texto con explicación breve; el activo usa agua y río profundo. El hover usa agua. Cada entrada tiene altura mínima de (58px), radio de navegación y padding de (13px 12px). En tablet se oculta el texto; en móvil las tres entradas se disponen horizontalmente con altura mínima de (40px). Los enlaces conservan nombre accesible mediante texto o `title` y el salto al contenido enfoca el área principal.

### Observación temporal

Siete botones temporales comparten selección entre gráficas y tabla. La línea temporal distingue pasado, presente y futuro con punto, trazo y peso tipográfico. Reproducir avanza cada (2000ms); seleccionar manualmente detiene la reproducción, igual que ocultar la pestaña o desmontar la vista. Las gráficas usan trazo río de (2.5px), relleno agua y etiqueta con texto sobre río; el umbral SAR se dibuja en (−15dB) como referencia discontinua.

### Escenarios de alerta

Filtros combinables, filas expandibles y revisión temporal dentro de la vista. El detalle ofrece «Abrir monitoreo» y la acción de revisión; el módulo original conserva sus selecciones propias. Sin resultados, un estado vacío explica cómo recuperar la lista y ofrece limpiar filtros. La demostración y su alcance se anuncian antes de los escenarios.

### Cuencas y herramientas de Monitoreo

La barra de cuencas presenta seis opciones en una fila con scroll horizontal. Usa botones de altura mínima (38px), radio de cuenca y padding del frontmatter. El estado seleccionado combina agua, río profundo y peso (750); el hover usa agua tenue y río. Debajo, una franja muestra estadísticas y reloj leídos del módulo. Los controles se deshabilitan mientras la conexión no está disponible.

El panel exterior reúne telemetría en cuadrícula, grupos desplegables, selectores, campos y acciones. Sus campos usan la misma forma que el resto de la UI, con etiquetas de (11px), asociación explícita `for`/`id` y `accent-color: var(--river)` para checkbox y range. Los grupos se separan con bordes finos. La telemetría usa agua tenue; los mensajes de conexión usan la pareja de vigilancia y `role="status"`. La UI envía eventos a controles originales permitidos; no duplica cálculo, capas ni geometrías.

La firma temporal de Monitoreo refleja valores, alturas y selección leídos del gráfico original. Presenta siete botones en una cuadrícula de (180px) de alto, con barras de línea reforzada y barra activa de río; la pista mide (110px). Cada botón anuncia ciclo y valor en dB. Esta representación usa estado del módulo, mientras que las gráficas de Análisis corresponden a la demostración identificada.

### Marco del módulo original

El marco, la barra de cuencas y las herramientas exteriores siguen este sistema. `OriginalModuleFrame.vue` carga `VITE_MAP_MODULE_URL`, con fallback `/original/` mediante proxy del mismo origen. En la composición de Monitoreo el iframe tiene ancho completo y altura de (700px), (630px) a (1000px), o (650px) al apilarse a (760px). Ampliar solicita fullscreen y, si no está disponible, abre el módulo.

La excepción autorizada de integración se limita a trasladar visualmente el `header` y el `aside` originales a Vue: el adaptador lee sus controles, textos y estados, envía sus eventos y oculta esos dos contenedores en la presentación embebida, ajustando el espacio del `main`. Los elementos originales permanecen en su DOM para su lógica existente. No se importan sus estilos como sistema de diseño. El DOM del mapa, sus vectores, capas, scripts y apariencia se conservan; el tema exterior no los modifica.

### Archivo visual y procedencia

`frontend/src/views/AnalysisView.vue` importa directamente `assets/comparacion_rio_nisar.png`, raster original existente del proyecto (1800 × 600). Se presenta sin alteraciones dentro de un archivo desplegable; su comparación de 2026 se identifica como independiente de los ciclos demo de 2024. Procedencia: activo proporcionado en el repositorio original, sin generación ni edición por esta implementación. Conservar el archivo y sus metadatos byte por byte; no extraer su apariencia como tokens de la UI.

## Do's and Don'ts

### Do:

- **Do** usar los tokens semánticos activos de la página para que claro y oscuro mantengan la misma jerarquía.
- **Do** acompañar cada prioridad con texto y mantener el foco de teclado visible.
- **Do** conservar las escalas fijas y la selección temporal compartida en Análisis.
- **Do** identificar datos y escenarios de demostración, incluidos sus periodos.
- **Do** preservar el raster NISAR original y mostrar su procedencia en el archivo visual.

### Don't:

- **Don't** modificar el mapa, sus vectores, capas, scripts o backend; el puente de UI se limita a la cabecera y al panel originales autorizados.
- **Don't** propagar el tema de la página al contenido del iframe ni recargarlo para cambiar su apariencia.
- **Don't** presentar revisiones locales o escenarios demo como avisos oficiales o datos en tiempo real.
- **Don't** convertir tokens CSS declarados sin uso en reglas nuevas: `river-blue`, `feature-symbol` y `map-river` no forman parte del sistema extraído.

No canonizado: los ajustes tipográficos puntuales de (8px–10px) son decisiones locales existentes, no un nuevo tamaño base. Las variables sin uso se registran como deriva pendiente y no se corrigen desde esta documentación.
