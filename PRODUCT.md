# Space Society

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Frontend independiente en Vue 3, Composition API y TypeScript, solicitado por el usuario.

## Product Purpose

Interfaz de monitoreo de ríos y observación satelital SAR. El proyecto existente se presenta como RadarSAR Arequipa / Perú del equipo Space Society.

## Capabilities and Constraints

- El usuario confirmó tres vistas: Monitoreo, Análisis y Alertas.
- El módulo original, sus scripts, geometrías, base SQLite y servicios Python deben permanecer intactos. Otro equipo mantiene la lógica y el backend.
- La nueva aplicación vive en frontend/ y solo implementa presentación e interacción del navegador.
- Análisis y Alertas usan nombres y métricas históricas como datos de demostración. El frontend no copia geometrías ni vectores.
- Monitoreo conserva el mapa original en un iframe. Por petición expresa del usuario, la barra de cuencas y el panel lateral se trasladan a Vue: un adaptador limitado a sus controles DOM acciona sus eventos originales. Solo se oculta la presentación duplicada del header/aside y se ajusta su espacio de layout; no se toca el DOM del mapa, sus vectores ni sus scripts. La URL la define el equipo responsable.
- Audiencia y contratos de API: pendientes de confirmar con el equipo.

## Brand Commitments

Nombre existente: Space Society. Idioma: español. El usuario solicita colores claros relacionados con los ríos y foco actual en navegador.

El usuario añadió modo oscuro como opción y reiteró la conservación íntegra del módulo original.

El usuario precisó que el mapa pertenece al otro equipo: no se modifica ni su apariencia ni su lógica al cambiar el tema. Nuestro alcance es UI/UX de la página que lo rodea.

## Evidence on Hand

El módulo original incluye selector de cuencas Camaná-Majes, Chili, Ocoña y Tambo; mapa Leaflet; capas; ciclos orbitales de ejemplo de 2024; métricas de caudal, extensión y población; imágenes de comparación NISAR en assets/.

## Product Principles

- Preservar el trabajo del otro equipo.
- Separar presentación y procesamiento.
- Identificar claramente las demostraciones y el periodo de sus datos.
