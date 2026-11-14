// Copia visual de solo lectura. No ejecuta ni cambia el motor SAR.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const source = readFileSync(
  new URL("../../js/arequipa-data.js", import.meta.url),
  "utf8",
);
const { BASINS, ORBITAL_CYCLES } = vm.runInNewContext(
  `${source};({ BASINS, ORBITAL_CYCLES })`,
);
const names = {
  camana: "Camaná-Majes",
  chili: "Chili-Quilca",
  ocona: "Ocoña",
  tambo: "Tambo",
};
const basins = Object.values(BASINS).map((basin) => ({
  id: basin.id,
  name: basin.name,
  shortName: names[basin.id],
  anaCode: basin.anaCode,
}));
const cycles = ORBITAL_CYCLES.map(
  ({
    cycleIndex,
    dayOffset,
    shortDate,
    dateTrack47,
    phase,
    riskLevel,
    sarBackscatterDb,
    summary,
    metrics,
  }) => ({
    cycleIndex,
    dayOffset,
    shortDate,
    dateTrack47,
    phase,
    riskLevel,
    sarBackscatterDb,
    summary,
    metrics,
  }),
);
const output = new URL("../src/data/reference.json", import.meta.url);
mkdirSync(fileURLToPath(new URL("../src/data/", import.meta.url)), {
  recursive: true,
});
writeFileSync(output, JSON.stringify({ basins, cycles }));
console.log(
  `Referencia visual: ${basins.length} cuencas, ${cycles.length} ciclos. Original sin cambios.`,
);
