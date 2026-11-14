# Frontend de ríos

Modo: operate. Web, foco actual en navegador de escritorio. Vistas confirmadas: Monitoreo, Análisis y Alertas.

## Direction contract

THESIS: Agua clara, elegida por el usuario. La interfaz Vue organiza el trabajo alrededor de un módulo principal independiente, sin reconstruir su mapa.

OWN-WORLD: blanco frío, azul río y verde agua; modo oscuro de agua profunda para la página. Ámbar y coral solo para estados. Manrope, cifras tabulares, líneas finas, formularios y navegación estándar.

STORY: entrar al módulo original para monitorear; usar las vistas UI/UX de Análisis y Alertas con ejemplos claramente identificados. El módulo original mantiene sus propias selecciones y controles.

FIRST VIEWPORT: navegación lateral, cabecera y área de trabajo. Monitoreo muestra la barra de selección de cuencas arriba, el panel de herramientas a la izquierda y el mapa original en un iframe a la derecha, con opción de ampliación. Análisis combina gráficas con escalas fijas, línea temporal y tabla. Alertas combina filtros, filas expandibles y estados vacíos.

FORM: candidato 3, informe de agua; seed:20c213f559019d15. Elección confirmada del usuario: Agua clara. Código directo para pantalla operativa; sin comp generado.

SIGNATURE: en Análisis, el mismo ciclo seleccionado recorre ambas gráficas y la tabla comparativa. Tema opcional persistente, con reducción de movimiento respetada.

BOUNDARY: mapa, vectores, capas y lógica pertenecen al otro equipo y sus archivos permanecen intactos. El usuario pidió expresamente trasladar el header y el aside originales a la vista general. El puente de UI acciona solamente los controles DOM existentes y refleja su estado; mantiene esos nodos en el módulo para su lógica. Oculta únicamente su presentación duplicada y ajusta el main al espacio disponible. No importa geometrías, no llama APIs internas del mapa ni modifica sus nodos, estilos, vectores o scripts. El tema solo afecta a Vue.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
