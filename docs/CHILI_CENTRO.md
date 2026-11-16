# Río Chili: centro de Arequipa

Área propuesta: oeste -71.555, sur -16.425, este -71.515, norte -16.370. Es un área de estudio; sus límites no clasifican agua.

Los archivos actuales de Camaná tienen cero píxeles válidos en este recorte. No se generó una detección ficticia ni se desplazaron sus imágenes.

## Archivos necesarios

- [2026-09-09: descargar HDF5 científico](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_030_046_A_169_2005_DHDH_A_20260909T103221_20260909T103255_P05023_N_F_J_001/NISAR_L2_PR_GCOV_030_046_A_169_2005_DHDH_A_20260909T103221_20260909T103255_P05023_N_F_J_001.h5)
  `NISAR_L2_PR_GCOV_030_046_A_169_2005_DHDH_A_20260909T103221_20260909T103255_P05023_N_F_J_001`
- [2026-09-21: descargar HDF5 científico](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_031_046_A_169_2005_DHDH_A_20260921T103221_20260921T103255_P05023_N_F_J_001/NISAR_L2_PR_GCOV_031_046_A_169_2005_DHDH_A_20260921T103221_20260921T103255_P05023_N_F_J_001.h5)
  `NISAR_L2_PR_GCOV_031_046_A_169_2005_DHDH_A_20260921T103221_20260921T103255_P05023_N_F_J_001`

Pareja del mismo track 046, frame 169, ascendente, modo 2005 DHDH y release P05023. Requiere Earthdata Login. Comprobar las máscaras y la cobertura válida del recorte tras descargar.

El Chili urbano es una prueba útil de localización del cauce, pero edificios, puentes y sombras pueden producir omisiones/falsos positivos. La existencia de agua en el río no garantiza que un píxel de 20 m contenga solo agua.

Los dos HDF5 ya se recuperaron y procesaron. Salida: output/chili. Se leyó HH con calidad válida del subswath 1 y sin excepciones disponibles. Ambos tienen productVersion 1.0.11 y release P05023. Cada fecha aporta 67.144 píxeles válidos en el recorte. A -14 dB, Solo SAR da 5,68 y 4,28 ha candidatas, respectivamente; no son hectáreas inundadas confirmadas. Se mantienen las fechas independientes hasta validar la clasificación.