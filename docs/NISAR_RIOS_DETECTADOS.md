# Ríos medidos en la imagen NISAR (capa defendible del visor)

Este documento describe lo que sí se midió con NISAR y qué muestra el visor.
Responde a la pregunta "que el satélite NISAR muestre los ríos": no se grafica
una geometría con un valor inventado, se procesa la imagen de radar original y
se extraen de ella los cauces.

## 1. Qué problema había

La capa que el equipo veía como "detección de ríos" era una **simulación**:
`js/arequipa-data.js` aplica un valor de retrodispersión fijo por ciclo a
geometrías de río preexistentes. Ningún píxel de radar se clasificaba. El
diagnóstico previo (`DIAGNOSTICO_RIOS.md`) ya lo señalaba; aquí se cierra el
hueco con un producto que sí viene de los HDF5 originales.

Con el umbral global de dB que usaba `gcov_water.py` (-14 dB) el resultado era
malo por dos motivos comprobados:

- La señal de agua **no es más oscura** de forma universal en Banda L. En el
  valle del Chili el cauce con vegetación ribereña aparece **brillante** (doble
  rebote y dispersión de volumen), mientras que el agua abierta es la única
  parte **oscura**. Un umbral absoluto de "muy oscuro" solo encuentra lagos.
- Un umbral absoluto no distingue un cauce de una sombra de ladera o de un
  edificio: ambas son manchas oscuras.

## 2. Qué se.processó

| Dato | Origen | Malla |
| --- | --- | --- |
| Antes | `NISAR_L2_PR_GCOV_030_046_A_169_2005_DHDH_A_20260909T103221_20260909T103255_P05023_N_F_J_001.h5` | nativa, 20 m |
| Después | `NISAR_L2_PR_GCOV_031_046_A_169_2005_DHDH_A_20260921T103221_20260921T103255_P05023_N_F_J_001.h5` | nativa, 20 m |

- Producto NISAR L2 GCOV, banda L, órbita 46, frame 169, ascendente, misma
  versión de procesamiento (`P05023`, `productVersion 1.0.11`) y 12 días de
  separación. La pareja es comparable.
- AOI: valle inferior del Chili, Arequipa, `-71.40 -16.27 -71.27 -16.14`
  (unos 14 × 15 km). Es un tramo resoluble: cauce ancho, sin problemas de
  poca trama urbana.
- Polarización `HHHH` en potencia gamma0, convertida a dB con
  `10*log10(potencia)`. Se aceptan solo muestras válidas (`mask` 0/1), sin
  excepción de entrada y con número de looks positivo.
- La georreferenciación se comprobó contra la imagen óptica: la laguna que
  aparece oscura en el radar coincide píxel a píxel con el cuerpo de agua de
  Esri World Imagery.

## 3. Detector

`gcov_rivers.py`. No usa un umbral absoluto de dB.

1. **Suavizado** 3×3 (mediana) para quitar textura de speckle.
2. **Respuesta top-hat** con escala de 600 m: realza estructuras más estrechas
   que esa escala, en los dos signos. El *white top-hat* (imagen menos
   apertura) responde al cauce claro con vegetación; el *black top-hat* (cierre
   menos imagen) responde al agua abierta y a la sombra especular.
3. Cada respuesta se estandariza con su propia mediana y MAD, de modo que el
   umbral es relativo al entorno y no a un dB fijo.
4. **Filtro de forma**: se conservan solo componentes con área ≥ 6000 m²,
   longitud ≥ 1500 m, anchura ≤ 100 m y elongación ≥ 2. Un cauce es una franja
   delgada y continua; una sombra o un edificio son manchas y se descartan.
5. **Esqueleto** de cada componente aceptado: la línea vectorial es el eje del
   cauce detectado, no una geometría dibujada a mano.

Parámetros finales: escala 600 m, k = 3.5 en ambos signos, mínimo 1500 m de
largo y 100 m de ancho.

## 4. Resultado

Tramo del valle del Chili, 9 y 21 de septiembre de 2026:

| Adquisición | Líneas | Claro (ripario) | Oscuro (agua abierta) |
| --- | --- | --- | --- |
| 2026-09-09 | 14 | 9 | 5 |
| 2026-09-21 | 12 | 10 | 2 |

Validación contra la red de referencia del repositorio, con tolerancia
perpendicular de 120 m (`validate_nisar.py`, salida en
`output/nisar_chili/validation.json`):

| Adquisición | Acuerdo de lo detectado | Red de referencia con cauce detectado |
| --- | --- | --- |
| 2026-09-09 | 52.3 % | 62.5 % |
| 2026-09-21 | 46.4 % | 45.1 % |

La red de referencia **no se usa para detectar**: solo para medir el acuerdo.

### Por qué el centro de Arequipa no funciona

En el recorte urbano del centro (la versión anterior, `output/chili`) la
referencia es **más brillante** que su entorno inmediato (+1.7 dB en HH, +2.2 dB
en HV): el cauce pasa por un canal urbanizado y el píxel de 20 m mezcla
hormigón, vegetación y agua. Se concluye que allí el producto no resuelve el cauce
con este detector; no que el río esté seco.

## 5. Cómo reproducir

```powershell
python processing/gcov_rivers.py `
  --before "C:\Users\estro\Downloads\nasa\NISAR_L2_PR_GCOV_030_046_A_169_2005_DHDH_A_20260909T103221_20260909T103255_P05023_N_F_J_001.h5" `
  --after  "C:\Users\estro\Downloads\nasa\NISAR_L2_PR_GCOV_031_046_A_169_2005_DHDH_A_20260921T103221_20260921T103255_P05023_N_F_J_001.h5" `
  --bbox -71.40 -16.27 -71.27 -16.14 `
  --output output/nisar_chili `
  --scale 600 --k-bright 3.5 --k-dark 3.5 --min-length 1500 --max-width 100 `
  --mask-values 1

python processing/validate_nisar.py --channels output/nisar_chili/channels.geojson `
  --bbox -71.40 -16.27 -71.27 -16.14 --tolerance 120 `
  --output output/nisar_chili/validation.json
```

Salidas: `sar_before.png`, `sar_after.png` (imagen de radar en Web Mercator),
`channels_before.png`, `channels_after.png` (máscara de lo detectado),
`change.png` (cambio entre fechas), `channels.geojson` (cauces vectoriales) y
`web_manifest.json`.

## 6. En el visor

Panel **NISAR MEDIDO: RÍOS EN LA IMAGEN DE RADAR** (`js/nisar-rivers.js`):

- *Cauces detectados sobre la imagen*: imagen SAR + máscara + vectores.
- *Imagen de radar NISAR*: la retrodispersión pura, donde el río se ve como
  una línea brillante y la laguna como una mancha oscura.
- *Cambio entre las dos fechas*: cian persistente, rojo nuevo, ámbar retirado.

Colores de los vectores: amarillo = corredor ripario o cauce con vegetación,
cian = agua abierta o sombra especular, rojo = cauce nuevo respecto de la
adquisición anterior, ámbar discontinuo = retirado.

El panel de la red de referencia queda etiquetado como **SIMULACIÓN** y el
control de umbral se rotula "Umbral de la simulación".

## 7. Límites

- El detector es exploratorio. No hay validación con muestras de agua/no agua
  de campo, así que las cifras de acuerdo no son precision ni exhaustividad de un producto
  operativo.
- La banda L no distingue por sí sola agua de suelo húmedo o de sombra
  especular. La separación se apoya en la forma (línea fina y continua) y en el
  contraste local, no en la física del medio de retrodispersión.
- El cambio entre el 9 y el 21 de septiembre no es una detección de
  inundación: son dos fechas secas de temporada. Sirve para mostrar el
  procedimiento multitemporal, no para afirmar una crecida.
- Fuera del AOI no hay cobertura de estas dos adquisiciones.
