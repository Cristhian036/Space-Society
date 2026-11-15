# Recalcular agua por fecha

Las correcciones geométricas ya están en el visor. Este flujo adicional utiliza mediciones GCOV originales y genera candidatos a agua; no confirma inundaciones sin validación local.

## 1. Preparar el proyecto

```powershell
python -m pip install -r requirements.txt
python hydro_sar_microservice.py
```

En otra terminal:

```powershell
python -m http.server 8000
```

Abrir http://localhost:8000. El motor de drenaje calcula la zona actual y guarda la respuesta completa en `.dem_cache/hydro_results_v3.sqlite`. La primera consulta descarga teselas. `hydro_rivers.sqlite` se conserva, pero la API no la reutiliza como resultado de una zona completa. No es necesario borrar ni reconstruir esa base antigua.

## 2. Recuperar las escenas

Ver [DESCARGAR_NISAR.md](DESCARGAR_NISAR.md), con enlaces a los HDF5 científicos exactos encontrados en NASA CMR. Guardar los archivos descargados en una carpeta local. Se necesitan dos fechas con cobertura común, misma geometría de adquisición y versiones de procesamiento compatibles.

El original de enero es BETA y el de septiembre es PROVISIONAL. El procesador rechaza mezclar sus versiones X05010/P05023. Enero 7 y enero 19 comparten X05010, aunque la primera tiene cobertura parcial. Es una pareja para examinar; no una validación de inundaciones ni una recomendación de usar BETA para decisiones operativas.

Para mostrar agua candidata de enero y septiembre por separado, añadir `--independent-dates`. Esta opción no calcula delta, cambio, expansión ni retroceso. El visor deshabilita la opción de cambio cuando el manifiesto solo contiene los mapas independientes. Usar enero como `before` y septiembre como `after`: son las fechas cronológicas, aunque enero sea la temporada de lluvias.

## 3. Inspeccionar calidad y coordenadas

```powershell
python gcov_water.py --inspect "C:\ruta\escena.h5"
```

Revisar los códigos de `mask` en los atributos y en la especificación del producto. Al procesar HDF5 se exige `--mask-values` con los códigos aceptables revisados; no se supone que cualquier píxel oscuro sea válido. Si los atributos no describen los códigos, revisar la [especificación GCOV enlazada por ASF](https://nisar-docs.asf.alaska.edu/gcov/). Los códigos de la máscara no se deben adivinar.

El lector usa el término diagonal seleccionado, `xCoordinates`, `yCoordinates` y `projection`; respeta relleno y `numberOfLooks`, y recorta antes de leer la matriz completa. Máximo 4 millones de píxeles por recorte.

En los dos originales recuperados se verificó en los atributos que `mask=1` identifica muestras válidas del único subswath; `0` indica muestras inválidas/parcialmente enfocadas y `255` es relleno exterior. Para estos archivos se usa `--mask-values 1`. Si está presente, `inputDataExceptionMask` debe ser 0 (sin anomalías). No transferir estos códigos a otro producto sin revisar sus metadatos.

## 4. Elegir umbrales con muestras locales

Seleccionar muestras independientes de agua y tierra en el área y revisar la distribución gamma0 en dB para cada fecha/polarización. Comprobar sombras, cultivos y cauces estrechos. No transferir directamente un umbral sigma0 de Sentinel-1 ni asumir que -16 dB funciona en toda escena.

El siguiente comando muestra la sintaxis. Sustituir archivos, umbrales y códigos de máscara por los valores revisados; los números entre marcadores no son parámetros calibrados:

```text
python gcov_water.py --before "C:\ruta\anterior.h5" --after "C:\ruta\posterior.h5" --bbox -72.7578 -16.59663 -72.6922 -16.53337 --threshold-before UMBRAL_ANTERIOR --threshold-after UMBRAL_POSTERIOR --mask-values CODIGOS_VALIDOS --output output/gcov
```

Para GeoTIFF de una banda se debe conservar CRS, transformación y NoData. Indicar `--units power` para potencia gamma0 o `--units db` si ya está convertido. HDF5 siempre se interpreta como potencia y se convierte con `10*log10` sobre valores positivos y válidos.

La clasificación crece desde semillas más oscuras que el umbral menos `--margin` (2 dB por defecto), únicamente dentro de píxeles con evidencia débil de agua bajo el umbral. Se puede usar `--margin 0` para evaluar una umbralización simple. No aplica cierre morfológico, relleno de huecos ni eliminación por tamaño. Este método sigue siendo un clasificador básico de agua abierta; no resuelve por sí solo agua bajo vegetación, sombras o mezcla de píxeles.

## 5. Revisar resultados

Se exportan GeoTIFF georreferenciados: `before_db`, `after_db`, `delta_db`, `water_before`, `water_after` y `change`. En agua por fecha: 0 = no candidata, 1 = candidata, 255 = sin datos.

En cambio:

| Valor | Clase |
| --- | --- |
| 0 | Sin candidato a agua en ambas fechas |
| 1 | Agua candidata persistente |
| 2 | Agua candidata nueva |
| 3 | Agua candidata retirada |
| 255 | Sin datos válidos comunes |

Las hectáreas de `summary.json` se calculan en la cobertura válida común usando la malla proyectada en metros. En los GeoTIFF sin metadatos de adquisición, verificar manualmente track, frame, polarización, fechas y versión. Los campos disponibles de los HDF5 se comprueban automáticamente. El área de píxel en la proyección es una aproximación de superficie; no es una medición de afectación agrícola.

Los PNG se reproyectan a EPSG:3857 antes de exportar; el manifiesto conserva sus límites para Leaflet. Activar **GCOV: AGUA POR FECHA** en el visor después de procesar. La capa mantiene el agua persistente; el aumento/disminución de retrodispersión por sí solo no se rotula como inundación.

Validar umbrales con muestras que no se usaron para ajustarlos y reportar precisión, exhaustividad e IoU. La prueba sintética del código verifica geometría y clasificación lógica, no precisión científica sobre Arequipa.

## Análisis de sensibilidad sobre los originales

`analyze_gcov_thresholds.py` compara -20, -18, -16 y -14 dB en cada fecha, con semillas 2 dB más oscuras. Exporta una figura y un JSON con áreas candidatas y porcentajes; no elige automáticamente el umbral correcto. Requiere `python -m pip install matplotlib`.

```text
python analyze_gcov_thresholds.py "C:\ruta\enero.h5" "C:\ruta\septiembre.h5" --bbox -72.7578 -16.59663 -72.6922 -16.53337 --mask-values 1
```

## Verificaciones del código

```powershell
python -m pip install pytest
python -m pytest -q
node --test tests/river-geometry.test.js
```
