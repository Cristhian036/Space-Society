# ⚖️ Comparativa de Motores: ¿Cuál se adapta mejor a Space Society?

A continuación se evalúan las tres alternativas para el monitoreo, predicción y alerta de inundaciones en los ríos de Arequipa (Camaná, Chili, Ocoña, Tambo).

---

## Cuadro Comparativo

| Criterio | Opción A: NASA GIBS (Streaming Tiles) | Opción B: Google Earth Engine (GEE) | Opción C: Descarga & Python Local (ASF / GDAL) |
| :--- | :--- | :--- | :--- |
| **Facilidad de Implementación** | ⭐⭐⭐⭐⭐ (Muy alta: URLs directas en Leaflet) | ⭐⭐⭐⭐ (Alta: Scripts en JS o Python) | ⭐⭐ (Media-Baja: Requiere calibrar y ortorrectificar en local) |
| **Consumo de Ancho de Banda** | **Bajo** (Solo pide imágenes .png de ~20 KB) | **Bajo** (La nube calcula; solo envía tiles .png) | ❌ **Crítico** (4 a 12 GB por escena descargada) |
| **Capacidad de Cálculo Matemático / Algoritmos** | Limitada (Muestra capas ya pre-renderizadas por NASA) | **Extrema** (Permite restar imágenes, filtros de ruido, umbrales y máscaras en segundos) | **Alta** (Control total en Python, pero lento en máquinas locales) |
| **Predicción de Inundaciones (Antes del desborde)** | Excelente para ver lluvia en tiempo real (GPM / IMERG) | Excelente para correlacionar lluvia histórica + modelos de elevación (DEM) | Complejo de automatizar en 48 horas |
| **Detección de Agua por Radar (Durante la tormenta)** | Disponible en capas globales (OPERA / MODIS) | **Totalmente personalizada** para el cauce exacto de Arequipa | Requiere procesar con SNAP o SNAPpy |
| **Riesgo de fallo en la demo del jurado** | **Muy bajo** (Carga al instante) | **Bajo** (Si se tiene la cuenta activa) | **Alto** (Crashes de memoria o caídas de internet) |

---

## Veredicto y Recomendación Estratégica para Ganar el Hackathon

### 🏆 La Solución Híbrida Ganadora:
1. **Frontend (Visor Web):** 
   Utilizar la **Opción A (NASA GIBS + Leaflet)** que ya dejamos armada en la rama `feature/streaming-gibs`. Esto garantiza que la interfaz web sea rápida, responsiva y no se congele frente al jurado.
2. **Motor Analítico (Predicción y Cálculo de Hectáreas):** 
   Utilizar **Google Earth Engine (Opción B)** con el script que te dejamos en `GUIA_GOOGLE_EARTH_ENGINE.md`. Con este script calculan las hectáreas exactas inundadas y demuestran ante el jurado que conocen el algoritmo de retrodispersión radar ($\sigma^0$).
3. **Cruce de Impacto (SIGRID / CENEPRED):**
   Superponer las capas de vulnerabilidad local de Arequipa en el visor web para justificar el impacto social y económico.
