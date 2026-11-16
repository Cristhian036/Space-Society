# Diagnóstico de continuidad y precisión de los ríos

Revisión del 14 de noviembre de 2026. Proyecto Space Society, NASA Space Apps, Arequipa.

Nota posterior: las referencias de líneas y las pruebas de fallos de este documento corresponden al estado inicial. Después de esta revisión se implementaron las correcciones descritas en `RECALCULAR_GCOV.md`: recorte por intersecciones, enlaces cortos, caché por zona/parámetros, rechazo de DEM incompleto y separación de capas. Los originales HDF5 siguen pendientes de descarga; `DESCARGAR_NISAR.md` contiene los enlaces exactos recuperados de NASA CMR.

## Resultado

Hay errores comprobables de continuidad en el código y una mezcla de tres productos diferentes: red de drenaje inferida del terreno, agua observada y cambios entre fechas. Esas capas requieren criterios y leyendas distintos. Una línea continua no demuestra una detección precisa de agua, y una máscara de cambio fragmentada no demuestra que el río se haya interrumpido.

Se revisaron el anteproyecto PDF, el texto del reto, los archivos Python/JavaScript, las imágenes exportadas y SQLite en modo de solo lectura. La base contiene 1.665 segmentos. No se modificaron el motor ni la base. Las pruebas descritas abajo son reproducciones pequeñas del comportamiento actual; no constituyen validación geográfica de los ríos reales.

## 1. Qué hace realmente cada capa

| Componente | Entrada y comportamiento comprobados | Implicación |
| --- | --- | --- |
| `js/app.js`, consulta ASF, línea 750 | Busca Sentinel-1 GRD de enero-marzo de 2024; lee metadatos, huellas y URL de vista previa. | Este botón no descarga ni procesa matrices NISAR. Encontrar una escena significa cobertura, no detección de agua. |
| `js/app.js`, línea 400; `js/arequipa-data.js` | Aplica un valor fijo de retrodispersión por ciclo a geometrías de ríos preexistentes. | El umbral del visor no está clasificando píxeles de radar. |
| `backend/hydro_sar_microservice.py` | Descarga elevación Terrarium e imágenes RGB de Esri, condiciona el DEM y calcula D8/acumulación/Strahler. | Infiere rutas de drenaje. El índice RGB también considera vegetación ribereña; no es una probabilidad de agua calibrada. |
| `backend/precalculate_to_sqlite.py` | Añade guías de ríos, poda tramos e inventaría resultados en SQLite. | La red combina inferencia topográfica y geometrías previas. |
| `js/sar-math-engine.js`, línea 299 | Superpone PNG locales de 350 × 350 píxeles con límites geográficos constantes. | La interfaz visualiza resultados exportados; no permite auditar o recalcular el procesamiento GCOV original. |

## 2. Causas comprobadas de cortes

### Recorte incorrecto en los bordes de las escenas

`extractSubSegmentsInsideSar`, en `js/app.js:300`, conserva vértices interiores y desecha los exteriores. No calcula intersecciones entre las aristas de la línea y el polígono de cobertura.

Se ejecutó la función original con una escena cuadrada entre 0 y 1 y una línea de dos puntos:

| Caso | Resultado actual | Resultado geométrico esperado |
| --- | --- | --- |
| Cruza la escena, extremos fuera | Ningún tramo | Segmento entre las dos intersecciones |
| Entra y termina dentro | Ningún tramo | Intersección de entrada y extremo interior |
| Empieza dentro y sale | Ningún tramo | Extremo interior e intersección de salida |
| Ambos extremos dentro | Conserva el tramo | Conserva el tramo |

Esto explica cortes artificiales junto al borde de una cobertura, especialmente después de simplificar líneas. Se necesita recortar líneas contra la unión de los polígonos y conservar los puntos de intersección. Los huecos reales de cobertura deben continuar visibles como ausencia de observación.

### Eliminación de conexiones cortas entre confluencias

El motor en vivo descarta caminos de menos de tres puntos (`hydro_sar_microservice.py:615`); el precálculo descarta los de menos de cuatro (`precalculate_to_sqlite.py:245`). Una conexión válida entre dos confluencias adyacentes puede tener solamente dos puntos.

Se reprodujo una red D8 de seis celdas con caminos `[0,2]`, `[1,2]`, `[2,4]`, `[3,4]`, `[4,5]`. Los cinco caminos desaparecen con los límites actuales. El enlace `[2,4]` es necesario para conectar las confluencias.

Corrección propuesta: conservar enlaces válidos de dos coordenadas distintas. Para reducir ruido, usar criterios de longitud física y evidencia que preserven conectividad, en vez del número de vértices.

### Poda que rompe una ruta D8

En `precalculate_to_sqlite.py:223`, la selección de celdas combina acumulación con TPI, índice RGB y guías. Si una celda intermedia falla, se interrumpe una ruta aunque su receptor D8 siga aguas abajo. Después se eliminan tramos completos por promedios de TPI/agua (`:263`).

Corrección propuesta: separar la topología de drenaje de la confianza de observación. Los enlaces que solo tengan apoyo topográfico deben mostrarse como inferidos; no convertirlos en agua observada para conseguir continuidad visual.

### Ocultamiento y persistencia de una red incompleta

`js/sar-math-engine.js:120` oculta por defecto los tramos con índice de agua bajo. El guardado en vivo elimina algunos tramos de orden 1 con índice bajo (`hydro_sar_microservice.py:773`). Además, la API reutiliza SQLite en cuanto encuentra alguna fila en la zona; no comprueba que la cobertura del cálculo sea completa (`:851`). Corregir solamente el generador no recuperará segmentos ya omitidos en la base existente.

## 3. Problemas de precisión e interpretación

**Cambio no equivale a agua total.** El visor etiqueta agua nueva con ΔdB < -3,5 y llanura inundada con ΔdB > +3,5. Un cauce con agua en ambas fechas puede cambiar poco y quedar fuera de esas clases. Deben existir productos separados para agua en cada fecha y para cambio. Un aumento de retrodispersión es una evidencia candidata: no identifica por sí solo inundación ni doble rebote. Vegetación, manejo agrícola y geometría también influyen. Véase el [tutorial SAR de Earth Engine](https://developers.google.com/earth-engine/tutorials/community/sar-basics).

**Varios valores publicados son estimaciones de software.** `precalculate_to_sqlite.py:282` y `:456` construyen `sar_db` a partir del área/orden; el guardado en vivo hace algo similar. El popup incluso usa -17,4 dB como respaldo (`js/sar-math-engine.js:148`). Esos números no permiten evaluar retrodispersión medida. También se asignan órdenes y áreas por cantidad de vértices a geometrías preexistentes. Se necesita procedencia por atributo y usar “sin medición” cuando corresponda.

**El detalle topográfico es mucho menor que el del mapa óptico.** A latitud -16,565, la fórmula del propio motor da aproximadamente 146,53 m/píxel en z10, 73,26 en z11 y 36,63 en z12. Los ríos estrechos y meandros no quedan descritos con precisión de metros por esa malla. Las métricas fijas de SQLite reportan cifras distintas. El espaciado de una malla tampoco equivale automáticamente a resolución efectiva.

**Datos faltantes se convierten en salidas hidrológicas.** Las descargas DEM fallidas producen NaN que después se reemplaza por cota cero y se incluye en `ocean`. Esto puede atraer el drenaje hacia un hueco de datos. Debe notificarse cobertura incompleta y conservar NoData separado de mar y lagos.

**La guía GEE puede perder cauces estrechos.** Usa un filtro de mediana de radio 50 m, mínimo temporal para el evento, umbral fijo VH de -16 dB y pendiente < 5°. Esa combinación requiere validación local: el filtro puede borrar detalles estrechos; el mínimo temporal puede incorporar valores oscuros anómalos; el descarte por pendiente puede afectar valles encajonados. Un umbral de Sentinel-1 sigma0 no se debe trasladar directamente a GCOV gamma0.

**Hay una inconsistencia de procedencia que debe resolverse.** El JSON declara una colección PROVISIONAL con escenas de septiembre y enero de 2026. ASF documenta que PROVISIONAL corresponde a adquisiciones desde junio de 2026, y advierte sobre comparar niveles de madurez diferentes. Verificar identificadores completos, colección, fechas de adquisición y versiones de procesamiento antes de interpretar esas diferencias. El campo `PR` del nombre significa Production, no demuestra madurez PROVISIONAL. Fuentes: [madurez de productos](https://nisar-docs.asf.alaska.edu/products-overview/) y [convenciones GCOV](https://nisar-docs.asf.alaska.edu/gcov/).

**Enero comparado con septiembre posterior es una comparación estacional retrospectiva.** Puede ser útil, pero septiembre no es una imagen anterior al evento de enero. Evitar presentar el resultado como detección cronológica antes/después de esa inundación.

**La georreferenciación del PNG requiere comprobación.** Un PNG ajustado a un rectángulo no conserva por sí mismo la transformación de una malla UTM. Verificar reproyección, orientación, centros/bordes de píxeles y alineación con puntos conocidos; no se ha demostrado un desplazamiento en este análisis.

## 4. Ruta de corrección recomendada

1. Elegir un tramo pequeño de Camaná y una pareja de adquisiciones comparable. Guardar identificadores completos y metadatos; evitar seleccionar escenas por su posición en una lista.
2. Leer GCOV HDF5 y sus coordenadas, proyección y máscaras válidas. Alinear ambas fechas en la misma malla. GCOV proporciona potencia gamma0 corregida radiométricamente por terreno; para términos diagonales positivos, convertir con `10 * log10(potencia)`. Excluir relleno, ceros y valores inválidos antes del logaritmo. Referencia: [GCOV de ASF](https://nisar-docs.asf.alaska.edu/gcov/).
3. Generar agua por fecha con umbrales calibrados localmente, evidencia multitemporal y las polarizaciones disponibles. Probar un filtrado que preserve los anchos de cauce de interés.
4. Clasificar cambio después de clasificar agua: agua persistente, agua nueva candidata y retroceso. Mantener aparte los aumentos de señal compatibles con vegetación inundada hasta corroborarlos.
5. Usar hidrografía/DEM como contexto. Para discontinuidades pequeñas, evaluar conectividad dentro de un corredor y crecimiento desde semillas fiables hacia evidencia más débil. Conservar los tramos inferidos identificados como tales. No unir automáticamente extremos a través de tierra, divisorias o NoData.
6. Corregir el recorte geométrico y la eliminación de enlaces cortos. Versionar la caché por región, resolución, parámetros y algoritmo; regenerar resultados en una base nueva para compararlos con la actual.
7. Exportar ráster georreferenciado y vectores con sensor, fecha, confianza y procedencia. Mostrar la red de referencia, el agua y el cambio con controles independientes.
8. Validar con muestras independientes de agua/no agua, incluyendo ríos estrechos, sombras y cultivos. Reportar precisión, exhaustividad, IoU y cobertura; medir también interrupciones por kilómetro. Separar el efecto de reparar el dibujo del efecto de mejorar la clasificación.

## 5. Encaje con el reto y límites de esta revisión

El anteproyecto encaja con el reto al visualizar cambios en inundaciones y contextualizar exposición agrícola/poblacional. Para demostrar el uso de NISAR, la demo debe vincular sus resultados a adquisiciones y procesamiento reproducibles, diferenciándolos de Sentinel-1 y las geometrías de referencia.

El recurso PIA26112 ilustra inundaciones amazónicas con UAVSAR de 2013; sirve como referencia, no como escena NISAR de Arequipa. [Descripción de NASA](https://science.nasa.gov/photojournal/radar-image-of-amazonian-flooding-similar-to-future-nisar-imagery/).

El monitoreo de extensión inundada no demuestra capacidad de predicción previa al desborde. Esa parte requiere lluvia, caudales, tiempos de tránsito/modelación y validación de alertas. La afirmación de mejora superior al 40 % en la guía local no tiene una evaluación reproducible en este repositorio.

Faltan el notebook ejecutable que generó los PNG y los recortes originales HDF5/GeoTIFF con sus máscaras/metadatos. El enlace Colab consignado no permitió leer su contenido desde la herramienta web. Por eso no se pueden confirmar las hectáreas publicadas, la autenticidad/procedencia de cada muestra ni la precisión de la clasificación original. Tampoco se ha localizado cuál de estas capas corresponde al corte concreto observado por el equipo.
