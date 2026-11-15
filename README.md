# 🛰️ Space Society - RadarSAR Arequipa (NASA Space Apps)
> Prototipo de visualización de drenaje y cambios candidatos en agua para las cuencas de Arequipa. La red DEM, la simulación y los resultados GCOV se muestran como productos distintos.

---

## 🎯 Desafío NASA
* **Desafío:** *"Dancing with the SARs"* (Radar Remote Sensing / NISAR)
* **Localidad:** Arequipa, Perú
* **Equipo:** Space Society

---

## 🚀 Cómo Ejecutar la Aplicación Web Localmente

La aplicación web está construida con **HTML5, TailwindCSS, Leaflet.js y Streaming de NASA GIBS**.

### 1. Instalar dependencias y arrancar el motor de drenaje:
```powershell
python -m pip install -r requirements.txt
python hydro_sar_microservice.py
```

En otra terminal, iniciar el visor:
```bash
python -m http.server 8000
```

### 2. Abrir en tu navegador:
Abre tu navegador web e ingresa a:
[http://localhost:8000](http://localhost:8000)

---

## 📁 Estructura del Proyecto
* `index.html`: Panel de control principal con visor interactivo de cuencas de Arequipa.
* `js/app.js`: Lógica de conexión con NASA GIBS (WMTS/Tiles), cálculo de alertas y conmutador de capas.
* `js/nisar-rivers.js`: Capa de cauces medidos en la imagen de radar NISAR (imagen GCOV, máscara y vectores).
* `gcov_rivers.py`: Detector de cauces sobre la malla nativa de 20 m de NISAR L2 GCOV (top-hat + filtro de forma + esqueleto).
* `validate_nisar.py`: Comparación entre los cauces detectados y la red de referencia, con acuerdo y exhaustividad.
* `js/arequipa-data.js`: Geometrías de ríos (Chili, Camaná, Ocoña, Tambo), simulaciones de máscaras SAR y zonas SIGRID/CENEPRED.
* `css/styles.css`: Estilos visuales con estética oscura de centro de control satelital.
* `GUIA_GOOGLE_EARTH_ENGINE.md`: Código y explicación paso a paso para procesar Sentinel-1 SAR en Google Earth Engine.
* `COMPARATIVA_MOTORES.md`: Análisis técnico comparando NASA GIBS vs Google Earth Engine vs Procesamiento Local.

---

## Flujo GCOV y correcciones de continuidad

- **Cauces medidos en la imagen de radar**: [NISAR_RIOS_DETECTADOS.md](NISAR_RIOS_DETECTADOS.md). Es la capa defendible ante el jurado: parte de los HDF5 originales de NISAR L2 GCOV, en su malla nativa de 20 m, y extrae los cauces de la imagen con un detector local (respuesta top-hat, filtro de forma y esqueleto). En el visor es el panel **NISAR MEDIDO**. La red de referencia queda rotulada como simulación.
- [Recuperar los HDF5 originales](DESCARGAR_NISAR.md).
- [Procesar agua por fecha y cargarla en el visor](RECALCULAR_GCOV.md).
- El recorte de líneas calcula intersecciones con las escenas, preserva enlaces cortos y mantiene huecos reales de cobertura.
- El motor usa una caché completa por zona y parámetros en `.dem_cache/hydro_results_v3.sqlite`. Conserva la base histórica.
- Los candidatos GCOV necesitan umbrales y máscaras de calidad revisados. Los HDF5 originales no se incluyen en Git. La primera ejecución local por fecha está documentada en [RESULTADOS_GCOV.md](RESULTADOS_GCOV.md); sus salidas son exploratorias y no confirman inundación.
- Las exportaciones históricas de Colab y los ciclos simulados no constituyen validación científica.

## 🔬 La Física del Radar (NISAR Banda L)
* **Día, noche y a través de nubes:** El radar SAR no depende del sol y penetra la densa nubosidad de las lluvias torrenciales en Arequipa.
* **Superficie de agua (Baja retrodispersión):** El agua actúa como reflector especular dirigiendo la onda lejos de la antena satelital, puede manifestarse como valores oscuros. El umbral depende del producto, polarización y zona; no hay un valor universal.
* **Cauce con vegetación (alta retrodispersión en L):** Medido en este proyecto, el corredor ripario del Chili aparece **brillante** en Banda L, no oscuro. Un detector que solo busca «muy oscuro» encuentra lagos y deja pasar el río; por eso el detector top-hat trabaja en los dos signos.
* **La ventaja de NISAR (Banda L ~24 cm):** A diferencia de satélites en Banda C (como Sentinel-1), puede aportar información sobre agua bajo cierta vegetación y mecanismos de doble rebote; requiere análisis y validación específicos del lugar.
