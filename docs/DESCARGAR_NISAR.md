# Recuperar los HDF5 originales

Archivos localizados en el catálogo público NASA CMR para Camaná (-72.725, -16.565). Los enlaces requieren Earthdata Login; no son PNG ni archivos QA_STATS.

## original_septiembre

Fecha: 2026-09-04T10:40:47.000Z. Colección: `NISAR_L2_GCOV_PROVISIONAL_V1`.

[Descargar HDF5 científico](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_PROVISIONAL_V1/NISAR_L2_PR_GCOV_029_147_A_169_2005_DHDH_A_20260904T104047_20260904T104115_P05023_N_F_J_001/NISAR_L2_PR_GCOV_029_147_A_169_2005_DHDH_A_20260904T104047_20260904T104115_P05023_N_F_J_001.h5)

Identificador: `NISAR_L2_PR_GCOV_029_147_A_169_2005_DHDH_A_20260904T104047_20260904T104115_P05023_N_F_J_001`.

## original_enero

Fecha: 2026-01-19T10:40:52.000Z. Colección: `NISAR_L2_GCOV_BETA_V1`.

[Descargar HDF5 científico](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_BETA_V1/NISAR_L2_PR_GCOV_010_147_A_169_2005_DHDH_A_20260119T104052_20260119T104119_X05010_N_F_J_001/NISAR_L2_PR_GCOV_010_147_A_169_2005_DHDH_A_20260119T104052_20260119T104119_X05010_N_F_J_001.h5)

Identificador: `NISAR_L2_PR_GCOV_010_147_A_169_2005_DHDH_A_20260119T104052_20260119T104119_X05010_N_F_J_001`.

## referencia_enero_misma_version

Fecha: 2026-01-07T10:40:52.000Z. Colección: `NISAR_L2_GCOV_BETA_V1`.

[Descargar HDF5 científico](https://nisar.asf.earthdatacloud.nasa.gov/NISAR/NISAR_L2_GCOV_BETA_V1/NISAR_L2_PR_GCOV_009_147_A_169_2005_DHDH_A_20260107T104052_20260107T104118_X05010_N_P_J_001/NISAR_L2_PR_GCOV_009_147_A_169_2005_DHDH_A_20260107T104052_20260107T104118_X05010_N_P_J_001.h5)

Identificador: `NISAR_L2_PR_GCOV_009_147_A_169_2005_DHDH_A_20260107T104052_20260107T104118_X05010_N_P_J_001`.

## Selección de escenas

Enero 19 es BETA (X05010); septiembre 4 es PROVISIONAL (P05023). Se recuperaron los originales mencionados en el visor, pero el procesador nuevo rechaza comparaciones entre esas versiones. Para una primera prueba cronológica se incluyó enero 7: comparte track 147, frame 169, dirección ascendente y versión X05010 con enero 19. Enero 7 tiene cobertura parcial y ambos son BETA: comprobar píxeles válidos y calibración. Esta selección no confirma que haya ocurrido una inundación.

[Abrir ASF Vertex](https://search.asf.alaska.edu/): Dataset NISAR, Science Product GCOV, zona de Camaná. Si aparece una versión reprocesada de ambas fechas con la misma versión, usar esa pareja.

[Guía oficial de descarga de ASF](https://nisar-docs.asf.alaska.edu/vertex/).
