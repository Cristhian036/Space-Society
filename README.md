# 🛰️ Space Society - RadarSAR Arequipa (NASA Space Apps)
> Sistema interactivo de alerta temprana y monitoreo de inundaciones con radar satelital (NISAR / SAR) para las cuencas de Arequipa (Camaná-Majes, Chili, Ocoña y Tambo).

---

## 🎯 Desafío NASA
* **Desafío:** *"Dancing with the SARs"* (Radar Remote Sensing / NISAR)
* **Localidad:** Arequipa, Perú
* **Equipo:** Space Society

---

## 🚀 Cómo Ejecutar la Aplicación Web Localmente

La aplicación web está construida con **HTML5, TailwindCSS, Leaflet.js y Streaming de NASA GIBS**.

### 1. Iniciar un servidor local rápido con Python:
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
* `js/arequipa-data.js`: Geometrías de ríos (Chili, Camaná, Ocoña, Tambo), simulaciones de máscaras SAR y zonas SIGRID/CENEPRED.
* `css/styles.css`: Estilos visuales con estética oscura de centro de control satelital.
* `GUIA_GOOGLE_EARTH_ENGINE.md`: Código y explicación paso a paso para procesar Sentinel-1 SAR en Google Earth Engine.
* `COMPARATIVA_MOTORES.md`: Análisis técnico comparando NASA GIBS vs Google Earth Engine vs Procesamiento Local.

---

## 🔬 La Física del Radar (NISAR Banda L)
* **Día, noche y a través de nubes:** El radar SAR no depende del sol y penetra la densa nubosidad de las lluvias torrenciales en Arequipa.
* **Superficie de agua (Baja retrodispersión):** El agua actúa como reflector especular dirigiendo la onda lejos de la antena satelital, manifestándose como valores oscuros ($\sigma^0 < -16\text{ dB}$).
* **La ventaja de NISAR (Banda L ~24 cm):** A diferencia de satélites en Banda C (como Sentinel-1), la longitud de onda de NISAR penetra los cultivos densos de arroz y cebolla en el valle de Camaná para detectar el agua oculta bajo el follaje por doble rebote.
