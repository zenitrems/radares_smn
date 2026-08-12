/**
 * Escalas de color de la consola.
 *
 * NOTA: estos valores vienen del diseño y son la escala de referencia del SMN.
 * Los GIF de `public/sondeos` traen su propia paleta indexada y difiere entre
 * marcas (eec/Cancún usa ~11 tonos discretos; vaisala/Sabancuy una rampa
 * continua), así que la correspondencia color↔dBZ conviene verificarla contra
 * la leyenda oficial del visor del SMN antes de darla por definitiva.
 */
export const DBZ = [
  [5, "#04566e"],
  [10, "#0080b8"],
  [15, "#0038f0"],
  [20, "#00b400"],
  [25, "#00e000"],
  [30, "#7ef000"],
  [35, "#f6f600"],
  [40, "#e6bc00"],
  [45, "#ff8c00"],
  [50, "#fa0000"],
  [55, "#c80000"],
  [60, "#a00000"],
  [65, "#ff00f0"],
  [70, "#9854c6"],
];

export const VEL = [
  [-27, "#00d020"],
  [-21, "#00b81c"],
  [-15, "#00a018"],
  [-9, "#008814"],
  [-4, "#005c0e"],
  [-1, "#243038"],
  [1, "#243038"],
  [4, "#6a0000"],
  [9, "#9c0000"],
  [15, "#c80000"],
  [21, "#f00000"],
  [27, "#ff5a3c"],
];

export const esVelocidad = (producto) => producto?.moment === "velocidad";

export function escalaDe(producto) {
  return esVelocidad(producto)
    ? { pasos: VEL, unidad: "m·s⁻¹" }
    : { pasos: DBZ, unidad: "dBZ" };
}
