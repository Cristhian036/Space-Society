# Experimento DSWx-NI en Chili

Rama: `codex/opera-dswx-sar`.

El código original de https://github.com/opera-adt/DSWX-SAR se descargó en `.dem_cache/DSWX-SAR`, fijado al commit `d9ae8ed5178417dec22a6fc549c4368cfd51ebe9`. Aunque el README dice que solo admite Sentinel-1, esta revisión incluye `setup_ni.py`, `dswx_ni.py` y el flujo NISAR versión 0.3.0. Se prueba ese flujo real, sin renombrar nuestro clasificador como OPERA.

`opera_experiment.py` prepara un HDF5 derivado con HH/HV de la adquisición del 9 de septiembre sobre el Chili, conservando metadatos y coordenadas. Los originales no se modifican. El recorte no es un nuevo producto científico distribuido por NASA.

Datos auxiliares:

- ESA WorldCover 2021 v200, recortado del COG público `ESA_WorldCover_10m_2021_v200_S18W072_Map.tif`.
- JRC Global Surface Water occurrence 1984–2021, versión 1.4, recortado del archivo público `occurrence_80W_10Sv1_4_2021.tif`.
- DEM Terrarium y HAND local experimental del análisis anterior. No se presentan como NASADEM verificado ni como HAND oficial de OPERA.
- GLAD GLCLU2020, mapa 2020, recortado del GeoTIFF público `https://storage.googleapis.com/earthenginepartners-hansen/GLCLU2000-2020/2020/10S_080W.tif`. Aunque el preprocesador lo describe como opcional, la etapa NISAR de enmascaramiento lo exige en esta revisión.
- Se desactiva la base estática MGRS. `opera_runtime.py` conserva los intermedios Float32 al guardar COG: con GDAL 3.12, NBITS=16 generaba Float16 y OpenCV Sobel fallaba. No modifica umbrales ni reglas de clasificación.

Configuración y procedencia se guardan en `output/opera_chili/`. Se restringe el paralelismo a un proceso para la prueba local. El entorno Conda aislado se encuentra en `.dem_cache/dswx-lite`; no cambia el Python del backend.

Preparar:

```powershell
python opera_experiment.py
```

Ejecutar el código upstream y guardar su registro:

```powershell
python opera_experiment.py --run
```

El registro queda en `output/opera_chili/execution.log`. Un código de salida cero es necesario antes de presentar el experimento como completado. La ausencia de salida o una ejecución fallida no se interpreta como río seco. La clasificación, si se genera, requerirá contraste con imágenes independientes y muestras locales; no es validación automática ni producto oficial OPERA.

La instalación inicial con Qt falló por una ruta de caché demasiado larga en Windows. Se prepara un entorno sin dependencias gráficas Qt, usando matplotlib-base y OpenCV headless.

## Resultado obtenido

La ejecución real de `dswx_ni.py` terminó con código 0 después de aplicar la compatibilidad de almacenamiento. Generó WTR, BWTR, CONF, DIAG y browse. El repositorio original no se editó; la adaptación está explícita en `opera_runtime.py`.

**El resultado no es utilizable para detectar el Chili:** en el recorte WTR de 206 × 146 píxeles a 30 m se obtuvieron 29.725 píxeles de clase 1 (agua) y 351 de clase 8 (agua parcial), cubriendo el 100 % del recorte. El registro contiene `threshold array is empty`; los umbrales intermedios HH/HV quedaron en -50 dB. La máscara de crecimiento intermedia contiene 255, pero la salida WTR termina en clases de agua. Esa secuencia exige depuración del flujo NISAR/NoData antes de interpretar el producto.

`opera_export.py` marca la salida como `not_usable`. La capa del visor **OPERA DSWx-NI — diagnóstico experimental**, disponible solo para Chili, la muestra en naranja/amarillo con advertencia. No reemplaza el clasificador anterior, no responde al deslizador dB y no representa una inundación confirmada. El detector de plausibilidad tampoco es una evaluación de exactitud.

El siguiente experimento útil sería ampliar el contexto espacial y comprobar el manejo de NoData/máscaras GCOV, o comparar con la ruta Sentinel-1 RTC y un producto DSWx-S1 distribuido oficialmente. Un recorte urbano pequeño con poca agua no garantiza una distribución adecuada para estimar umbrales locales. No se concluye que OPERA en general falle ni que el Chili esté seco.

## Reproducibilidad

- Fuente fijada: clonar el repositorio y hacer checkout del commit indicado.
- Entorno: `opera-environment.yml`, instalado aisladamente con micromamba en `.dem_cache/dswx-lite`.
- Recortes auxiliares locales en `.dem_cache/opera_ancillary/`; las salidas y datos pesados están fuera de Git.
- El script exige los HDF5 y datos auxiliares reales; no genera sustitutos si faltan.
- `python opera_experiment.py --run` prepara y ejecuta el flujo; si termina correctamente exporta el diagnóstico. Los fallos quedan registrados y no se presentan como resultados válidos.
- Verificación: 19 pruebas Python aprobadas, sintaxis JavaScript y comprobación de clases de los GeoTIFF generados.


## Camaná

También se ejecutó `python opera_experiment.py --region camana --run` con el HDF5 del 4 de septiembre y auxiliares recortados para esa zona. Salida independiente: `output/opera_camana`. Terminó con código 0 y produjo WTR/BWTR/CONF/DIAG.

El WTR contiene 40.807 píxeles de clase 0, 636 de clase 3 (vegetación inundada según el clasificador), 14.719 de clase 250 (excluidos por HAND) y 7 NoData. No detectó agua abierta y el registro vuelve a informar umbrales vacíos; el resultado se marca no utilizable. Las manchas violetas no constituyen una validación de inundación. El visor elige automáticamente el diagnóstico de Camaná o Chili según la zona.
