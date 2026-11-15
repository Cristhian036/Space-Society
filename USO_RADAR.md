# Interpretación del control GCOV

El control de -26 a -8 dB usa máscaras calculadas desde los HDF5 de enero y septiembre, con pasos de 0,5 dB y semillas 2 dB más oscuras. Las superficies mostradas son candidatos, no hectáreas inundadas. Cambiar el umbral no calibra automáticamente el algoritmo.

GCOV entrega potencia gamma0 corregida por terreno. Se convierte con 10*log10 únicamente sobre potencia válida. La máscara de subswath describe calidad, no agua ni ausencia de sombras. Se excluyen relleno, muestras inválidas, looks inválidos y excepciones disponibles.

Para una clasificación validada se requieren muestras locales independientes, revisión del histograma, tratamiento del speckle que conserve cauces estrechos y control de sombras/geometría con contexto topográfico. HH y HV aportan información distinta; este control usa HH. No debe transferirse directamente un umbral de Sentinel-1 sigma0 a NISAR gamma0.

Las fechas disponibles tienen versiones X05010 y P05023 diferentes. Se muestran por separado y no se calcula cambio validado entre ellas.

Fuentes primarias consultadas:
- https://nisar-docs.asf.alaska.edu/gcov/
- https://nisar-docs.asf.alaska.edu/products-overview/
- https://asf.alaska.edu/wp-content/uploads/2019/02/s1tbx_inundation_v1.1-1.pdf (método de selección de umbral para Sentinel-1; sus números no se transfieren a NISAR).

La red de referencia conserva procedencia por tramo. Las rutas DEM son opcionales; cerca de meandros OSM se omiten vértices de geometrías de referencia más generales dentro de 500 m y se separan los tramos restantes sin unir huecos. Es una regla de prioridad cartográfica, no una medición de exactitud ni una garantía de una única geometría en cada lugar.
