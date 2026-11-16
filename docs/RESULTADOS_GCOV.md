# Primera ejecución con los HDF5 recuperados

Se leyeron los archivos científicos originales guardados en `C:\Users\estro\Downloads\nasa`. Las matrices se procesaron por separado en el recorte de Camaná de longitud -72.7578 a -72.6922 y latitud -16.59663 a -16.53337.

## Parámetros actuales

- Polarización HH, término diagonal HHHH, frecuencia A.
- Potencia gamma0 convertida mediante `10 * log10` a dB.
- Umbral exploratorio de candidatos: **-14 dB** en ambas fechas.
- Semillas: **-16 dB**; crecimiento únicamente a través de píxeles válidos <= -14 dB.
- Sin cierre morfológico, relleno de huecos ni eliminación de componentes pequeños.
- Máscara de subswath aceptada: 1. Se excluyen los códigos 0 y 255, el relleno, potencia inválida y número de looks no positivo. La máscara de excepciones, donde existe, debe ser 0.
- Malla coincidente: EPSG:32718, 355 × 355 píxeles, espaciado 20 m. El recorte rectangular incluye la envolvente de la zona solicitada en coordenadas proyectadas.

El umbral del control antiguo de simulación también es -14 dB, pero ese control no modifica estos resultados científicos exportados. La exportación antigua de Colab usaba diferencias de ±3,5 dB: es otro criterio, no un umbral de agua.

## Procedencia comprobada

| Dato | 19 enero 2026 | 4 septiembre 2026 |
| --- | --- | --- |
| Madurez de la colección | BETA | PROVISIONAL |
| Identificador de procesamiento | X05010 | P05023 |
| productVersion leído del HDF5 | 1.0.2 | 1.0.11 |
| Track / frame / dirección | 147 / 169 / ascendente | 147 / 169 / ascendente |
| Píxeles válidos en el recorte | 126.011 | 126.010 |

La coincidencia geométrica no elimina la diferencia de procesamiento. Por ello se activó el modo de fechas independientes: **no se generaron delta, expansión, agua nueva, retroceso ni hectáreas de inundación**. La opción de cambio queda deshabilitada en el visor. Enero es la fecha anterior y septiembre la posterior en esta ejecución.

## Sensibilidad del resultado

Se mantienen semillas 2 dB más oscuras que cada umbral. Los porcentajes son de la superficie válida de cada imagen, no exactitud del clasificador.

| Umbral de candidato | Semillas | Enero: ha candidatas | Enero: % válido | Septiembre: ha candidatas | Septiembre: % válido |
| --- | --- | --- | --- | --- | --- |
| -20 dB | -22 dB | 350,60 | 6,96 % | 130,00 | 2,58 % |
| -18 dB | -20 dB | 1.019,32 | 20,22 % | 589,52 | 11,70 % |
| -16 dB | -18 dB | 1.739,88 | 34,52 % | 1.371,08 | 27,20 % |
| -14 dB | -16 dB | 2.305,08 | 45,73 % | 2.174,16 | 43,13 % |

La inspección visual muestra que los umbrales amplios incorporan grandes regiones oscuras sobre relieve, alejadas del cauce central. **-14 dB no es una separación precisa de río y tierra en este recorte.** Hacer el umbral más negativo reduce candidatos, pero también puede perder agua real; esta tabla no establece cuál es el umbral correcto.

Las sombras/efectos de geometría, mezcla de píxeles y cambios de superficie no se resuelven solo moviendo un umbral. El siguiente ajuste necesita evidencia espacial independiente del cauce y control topográfico/geometría radar, seguido de muestras independientes de agua y tierra. Una malla de 20 m tampoco garantiza delinear con precisión un cauce más estrecho.

## Archivos generados

- `output/gcov/`: ráster gamma0 en dB y máscaras candidatas de cada fecha, PNG reproyectados y manifiesto para Leaflet. `summary.json` registra umbrales, entradas, máscaras y versiones.
- `output/gcov_diagnostico/sensibilidad_umbrales.png`: comparación visual de las cuatro alternativas.
- `output/gcov_diagnostico/sensibilidad_umbrales.json`: estadísticas reproducibles.
- `analyze_gcov_thresholds.py`: script que vuelve a producir la comparación.

Los datos originales permanecen intactos. Los resultados son exploratorios, sin calibración ni validación con verdad de terreno. No son una medida de daño agrícola ni base para emitir alertas.
