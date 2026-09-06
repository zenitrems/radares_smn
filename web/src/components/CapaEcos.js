/**
 * Ecos de un sitio: el GIF del sondeo colocado sobre el extent del producto.
 *
 * Los sondeos del SMN vienen georreferenciados con las esquinas del recorte, y
 * ese recorte es el mismo Mercator que usa el mapa: la imagen se declara ya en
 * la proyección de la vista y no hay reproyección que pagar.
 *
 * Cada GIF son 2000×2000 px decodificados, así que hay una sola capa por sitio
 * y lo que se cambia es su fuente. Se conservan vivas las fuentes de los
 * sondeos vecinos al actual —y las de los extremos, que son adonde salta el
 * reproductor al terminar—: esas ya tienen la imagen cargada y el cambio es
 * instantáneo. Del resto se ocupa la precarga, que las deja en la caché del
 * navegador.
 */
import { memo, useEffect, useMemo, useRef } from "react";
import ImageLayer from "ol/layer/Image";
import ImageStatic from "ol/source/ImageStatic";
import { useCapa } from "../mapa/contexto";
import { extentDe, NIVEL, VISTA } from "../mapa/geo";

const ATRIBUCION = "sondeos: SMN/CONAGUA";

function CapaEcos({ sitio }) {
  const { producto, frames, idx } = sitio;
  const extent = useMemo(() => extentDe(producto.map.bounds), [producto]);

  const capa = useCapa(() => new ImageLayer({ zIndex: NIVEL.ecos }), []);

  const precargados = useRef(new Set());
  useEffect(() => {
    frames.forEach((f) => {
      if (precargados.current.has(f.src)) return;
      precargados.current.add(f.src);
      const img = new window.Image();
      img.src = f.src;
    });
  }, [frames]);

  /* Las fuentes vivas, por `src`. Se vacía al cambiar de producto porque el
     extent de la imagen es otro. */
  const fuentes = useRef(new Map());
  useEffect(() => {
    fuentes.current.forEach((f) => f.dispose());
    fuentes.current = new Map();
  }, [extent]);

  useEffect(() => {
    if (!capa) return;
    const actual = frames[idx];
    if (!actual) {
      capa.setSource(null);
      return;
    }

    const vecinos = new Set(
      [idx - 1, idx, idx + 1, 0, frames.length - 1]
        .filter((i) => i >= 0 && i < frames.length)
        .map((i) => frames[i].src)
    );

    fuentes.current.forEach((fuente, src) => {
      if (vecinos.has(src)) return;
      fuente.dispose();
      fuentes.current.delete(src);
    });

    vecinos.forEach((src) => {
      if (fuentes.current.has(src)) return;
      fuentes.current.set(
        src,
        new ImageStatic({
          url: src,
          imageExtent: extent,
          projection: VISTA,
          attributions: ATRIBUCION,
        })
      );
    });

    capa.setSource(fuentes.current.get(actual.src));
  }, [capa, frames, idx, extent]);

  useEffect(() => {
    if (capa) capa.setOpacity(sitio.opacidad ?? 1);
  }, [capa, sitio.opacidad]);

  useEffect(() => () => fuentes.current.forEach((f) => f.dispose()), []);

  return null;
}

export default memo(CapaEcos);
