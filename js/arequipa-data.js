// Arequipa Hydrographic & Vulnerability Data for Space Society MVP
// Focused on: Camaná-Majes, Chili (Arequipa), Ocoña, and Tambo

const BASINS = {
  camana: {
    id: 'camana',
    name: 'Valle Camaná - Majes',
    center: [-16.605, -72.715],
    zoom: 12,
    riskLevel: 'RIESGO ALTO',
    riskClass: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
    description: 'Crecida histórica del Río Camaná por lluvias en cuenca alta. Susceptibilidad de desborde en defensas ribereñas del sector El Monte y San Gregorio.',
    cropsHectares: '385 ha',
    populationRisk: '1,420 hab',
    riverPath: [
      [-16.510, -72.630],
      [-16.540, -72.665],
      [-16.575, -72.690],
      [-16.605, -72.715],
      [-16.625, -72.730],
      [-16.645, -72.748]
    ],
    // Simulación de zona inundada detectada por SAR (baja retrodispersión)
    floodPolygons: [
      {
        coordinates: [
          [-16.595, -72.725],
          [-16.608, -72.705],
          [-16.622, -72.718],
          [-16.632, -72.742],
          [-16.618, -72.750],
          [-16.602, -72.735]
        ],
        name: 'Sector San Gregorio - Desborde Fluvial',
        hectares: 240,
        sarBackscatter: '-18.4 dB (Agua Detectada)'
      },
      {
        coordinates: [
          [-16.565, -72.685],
          [-16.575, -72.670],
          [-16.588, -72.682],
          [-16.580, -72.700]
        ],
        name: 'Sector El Monte - Anegamiento Agrícola',
        hectares: 145,
        sarBackscatter: '-17.1 dB (Agua Detectada)'
      }
    ],
    // Zonas SIGRID / CENEPRED (Susceptibilidad muy alta)
    sigridZones: [
      {
        coordinates: [
          [-16.590, -72.740],
          [-16.595, -72.700],
          [-16.635, -72.710],
          [-16.640, -72.760]
        ],
        level: 'Muy Alto',
        source: 'CENEPRED - SIGRID (Inundación Fluvial)'
      }
    ]
  },

  chili: {
    id: 'chili',
    name: 'Río Chili (Arequipa Metropolitana)',
    center: [-16.425, -71.555],
    zoom: 13,
    riskLevel: 'RIESGO MEDIO-ALTO',
    riskClass: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
    description: 'Aumento del caudal del Río Chili por descargas de represas (Aguada Blanca / El Frayle). Puntos críticos en Arancota, Tiabaya y Uchumayo.',
    cropsHectares: '65 ha',
    populationRisk: '3,800 hab',
    riverPath: [
      [-16.375, -71.520],
      [-16.395, -71.535],
      [-16.415, -71.545],
      [-16.435, -71.565],
      [-16.455, -71.600],
      [-16.440, -71.650]
    ],
    floodPolygons: [
      {
        coordinates: [
          [-16.425, -71.555],
          [-16.435, -71.550],
          [-16.442, -71.562],
          [-16.432, -71.572]
        ],
        name: 'Sector Arancota / Tiabaya - Inundación de Ribera',
        hectares: 45,
        sarBackscatter: '-16.8 dB (Agua en Cauce Ampliado)'
      },
      {
        coordinates: [
          [-16.448, -71.620],
          [-16.455, -71.605],
          [-16.462, -71.625],
          [-16.452, -71.640]
        ],
        name: 'Garganta de Uchumayo - Riesgo de Estrangulamiento',
        hectares: 20,
        sarBackscatter: '-19.2 dB (Superficie de Agua Libre)'
      }
    ],
    sigridZones: [
      {
        coordinates: [
          [-16.420, -71.550],
          [-16.445, -71.545],
          [-16.450, -71.580],
          [-16.425, -71.580]
        ],
        level: 'Muy Alto',
        source: 'CENEPRED - SIGRID (Zona Urbana Inundable Arancota)'
      }
    ]
  },

  ocona: {
    id: 'ocona',
    name: 'Valle Ocoña',
    center: [-16.420, -73.100],
    zoom: 12,
    riskLevel: 'ALERTA ROJA',
    riskClass: 'text-rose-300 bg-rose-500/20 border-rose-500/40',
    description: 'Río Ocoña con aforo crítico superior a 650 m³/s. Riesgo de corte en la carretera Panamericana Sur y anegamiento de arrozales.',
    cropsHectares: '510 ha',
    populationRisk: '890 hab',
    riverPath: [
      [-16.340, -73.050],
      [-16.375, -73.080],
      [-16.410, -73.105],
      [-16.440, -73.125]
    ],
    floodPolygons: [
      {
        coordinates: [
          [-16.395, -73.090],
          [-16.415, -73.080],
          [-16.430, -73.105],
          [-16.410, -73.120]
        ],
        name: 'Sector Puente Ocoña - Desborde Agrícola',
        hectares: 510,
        sarBackscatter: '-19.8 dB (Inundación Extensa)'
      }
    ],
    sigridZones: [
      {
        coordinates: [
          [-16.380, -73.070],
          [-16.435, -73.070],
          [-16.445, -73.135],
          [-16.390, -73.130]
        ],
        level: 'Extremo',
        source: 'CENEPRED - SIGRID (Vulnerabilidad Agrícola Alta)'
      }
    ]
  },

  tambo: {
    id: 'tambo',
    name: 'Valle de Tambo',
    center: [-17.020, -71.830],
    zoom: 12,
    riskLevel: 'ALERTA AMARILLA',
    riskClass: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40',
    description: 'Caudal en incremento progresivo en Cocachacra. Se monitorea la desembocadura en Punta de Bombón.',
    cropsHectares: '120 ha',
    populationRisk: '620 hab',
    riverPath: [
      [-16.950, -71.740],
      [-16.990, -71.790],
      [-17.025, -71.835],
      [-17.060, -71.870]
    ],
    floodPolygons: [
      {
        coordinates: [
          [-17.010, -71.820],
          [-17.025, -71.810],
          [-17.040, -71.830],
          [-17.020, -71.845]
        ],
        name: 'Sector Cocachacra - Ribera Baja',
        hectares: 120,
        sarBackscatter: '-15.5 dB (Saturación de Suelo / Inundación)'
      }
    ],
    sigridZones: [
      {
        coordinates: [
          [-16.995, -71.780],
          [-17.045, -71.800],
          [-17.050, -71.860],
          [-17.000, -71.840]
        ],
        level: 'Medio',
        source: 'CENEPRED - SIGRID (Valle Tambo)'
      }
    ]
  }
};
