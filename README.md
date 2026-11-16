# 🛰️ Space Society - RadarSAR Arequipa (NASA Space Apps)
> Prototipo de visualización de drenaje y cambios candidatos en agua para las cuencas de Arequipa. La red DEM, la simulación y los resultados GCOV se muestran como productos distintos.

---

## 🎯 Desafío NASA
* **Desafío:** *"Dancing with the SARs"* (Radar Remote Sensing / NISAR)
* **Localidad:** Arequipa, Perú
* **Equipo:** Space Society

---

## 🚀 Cómo Ejecutar la Aplicación

La aplicación cuenta con scripts integrados para iniciar todo en un solo paso (microservicio hidrológico en puerto 8050 + servidor web en puerto 8000 + apertura automática en el navegador):

### 🌟 Opción 1: Un solo clic en Windows (Recomendada)
Haz doble clic sobre el archivo:
* **`iniciar.bat`**: Verifica dependencias, arranca ambos servicios y abre el navegador.
* **`detener.bat`**: Libera los puertos y detiene ambos servicios cuando termines.

---

### 🐍 Opción 2: Script unificado con Python (Multiplataforma)
Ejecuta desde la terminal:
```bash
python run.py
```
*(Inicia ambos servidores, comprueba el endpoint de salud, abre el navegador y se detiene limpiamente al pulsar `Ctrl + C`).*

---

### ⚙️ Opción 3: Manual (Terminales separadas)
1. Instalar dependencias e iniciar el microservicio de drenaje:
```powershell
python -m pip install -r requirements.txt
python backend/hydro_sar_microservice.py
```
2. En otra terminal, arrancar el servidor web:
```bash
python -m http.server 8000
```
3. Abrir en tu navegador: [http://localhost:8000](http://localhost:8000)

---

## 📁 Estructura del Proyecto
* `index.html`: Panel de control principal con visor interactivo de cuencas de Arequipa.
* `pitch_deck.html`: Presentación interactiva / pitch deck del proyecto.
* `iniciar.bat`: Script de inicio rápido de doble servicio (microservicio + servidor web).
* `backend/`: Microservicio hidrológico en tiempo real (`hydro_sar_microservice.py`) y precálculo a SQLite (`precalculate_to_sqlite.py`).
* `processing/`: Algoritmos de radar NISAR L2 GCOV (`gcov_rivers.py`, `gcov_water.py`, `terrain_water.py`, `analyze_gcov_thresholds.py`, `validate_nisar.py`).
* `opera/`: Flujo experimental OPERA DSWx-NI (`opera_experiment.py`, `opera_export.py`, `opera_runtime.py`, `opera-environment.yml`).
* `data/`: Base de datos de cauces (`hydro_rivers.sqlite`) y especificaciones de escenas (`CHILI_DESCARGAS.json`, `NISAR_DESCARGAS.json`).
* `docs/`: Documentación técnica, guías paso a paso y análisis de radar.
* `js/`: Lógica de conexión con NASA GIBS (WMTS/Tiles), cálculo de alertas y conmutador de capas (`app.js`, `nisar-rivers.js`, `arequipa-data.js`, `sar-math-engine.js`, `gcov-layer.js`, `river-geometry.js`).
* `css/`: Estilos visuales con estética oscura de centro de control satelital (`styles.css`).
* `assets/`: Malla vectorial de referencia, áreas de interés y recursos gráficos.
* `scripts/`: Herramientas auxiliares y generación de fotogramas (`generate_frames.js`).
* `tests/`: Pruebas automatizadas unitarias en Python y JavaScript.
* `scratch/`: Scripts y capturas de exploración y diagnóstico (`tmp_*`).

---

## Flujo GCOV y correcciones de continuidad

- **Cauces medidos en la imagen de radar**: [NISAR_RIOS_DETECTADOS.md](docs/NISAR_RIOS_DETECTADOS.md). Es la capa defendible ante el jurado: parte de los HDF5 originales de NISAR L2 GCOV, en su malla nativa de 20 m, y extrae los cauces de la imagen con un detector local (respuesta top-hat, filtro de forma y esqueleto). En el visor es el panel **NISAR MEDIDO**. La red de referencia queda rotulada como simulación.
- [Recuperar los HDF5 originales](docs/DESCARGAR_NISAR.md).
- [Procesar agua por fecha y cargarla en el visor](docs/RECALCULAR_GCOV.md).
- [Diagnóstico de ríos y continuidad](docs/DIAGNOSTICO_RIOS.md).
- [Comparativa de motores de procesamiento](docs/COMPARATIVA_MOTORES.md).
- [Guía de Google Earth Engine](docs/GUIA_GOOGLE_EARTH_ENGINE.md).
- [Resultados GCOV](docs/RESULTADOS_GCOV.md).
- [Filtro topográfico SAR](docs/SAR_TERRENO.md).
- [Uso de Radar SAR](docs/USO_RADAR.md).
- [Experimento OPERA](docs/OPERA_EXPERIMENTO.md).

## 🔬 La Física del Radar (NISAR Banda L)
* **Día, noche y a través de nubes:** El radar SAR no depende del sol y penetra la densa nubosidad de las lluvias torrenciales en Arequipa.
* **Superficie de agua (Baja retrodispersión):** El agua actúa como reflector especular dirigiendo la onda lejos de la antena satelital, puede manifestarse como valores oscuros. El umbral depende del producto, polarización y zona; no hay un valor universal.
* **Cauce con vegetación (alta retrodispersión en L):** Medido en este proyecto, el corredor ripario del Chili aparece **brillante** en Banda L, no oscuro. Un detector que solo busca «muy oscuro» encuentra lagos y deja pasar el río; por eso el detector top-hat trabaja en los dos signos.
* **La ventaja de NISAR (Banda L ~24 cm):** A diferencia de satélites en Banda C (como Sentinel-1), puede aportar información sobre agua bajo cierta vegetación y mecanismos de doble rebote; requiere análisis y validación específicos del lugar.
