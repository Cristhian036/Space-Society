# SAR combinado con terreno: implementación experimental

Se conserva NISAR GCOV HH como evidencia de retrodispersión. Se añade un contexto topográfico independiente; no se queman líneas de referencia para fabricar agua.

`python processing/terrain_water.py` reproduce el procesamiento desde los recortes GCOV existentes y teselas DEM Terrarium a z12. La zona incluye un margen de una tesela para reducir efectos de borde. La procedencia nativa del mosaico Terrarium no se verificó por píxel: no se afirma que sea NASADEM puro.

El DEM se suaviza ligeramente, se condiciona con Priority-Flood, se calcula flujo D8 y acumulación. Las celdas con contribución >=1 km² definen drenaje modelado. HAND se calcula como diferencia de altura respecto de la primera celda de drenaje aguas abajo; salidas no resueltas permanecen sin datos. Se reproyectan HAND y pendiente a la malla GCOV.

La clasificación SAR conserva únicamente soporte topográfico con HAND <=15 m y pendiente <=7 grados. Semillas 2 dB más oscuras que el umbral; crecimiento dentro de evidencia SAR débil y soporte topográfico. No se rellenan huecos. Los límites son hipótesis experimentales, no valores calibrados para Camaná. Pueden omitir cauces en terreno abrupto e inundación por encima de 15 m respecto del drenaje modelado.

El visor permite comparar Solo SAR frente a SAR + terreno para cada fecha y 37 umbrales. El área resultante es candidata y no representa hectáreas inundadas confirmadas. Menos manchas no demuestra mayor precisión: se necesitan muestras independientes y métricas de omisión/comisión. No se generó una máscara geométrica real de sombras/layover ni se resolvió la incompatibilidad de procesamiento entre enero y septiembre.

Referencia metodológica: HydroSAR de ASF combina SAR, umbralización y HAND: https://hyp3-docs.asf.alaska.edu/tools/asf_tools_api/ . No se reutilizaron sus umbrales de Sentinel-1 como valores validados de NISAR.

Sobre datos NASADEM, una alternativa futura con procedencia explícita: https://developers.google.com/earth-engine/datasets/catalog/NASA_NASADEM_HGT_001 . Su descarga requiere acceso apropiado; no se descargó en esta ejecución.
