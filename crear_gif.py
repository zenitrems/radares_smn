import os
import time
from PIL import Image, ImageSequence
from datetime import datetime

SONDEOS_DIR = "./sondeos"
SALIDA_DIR = "./sondeos_gif"
TRANSICION_MS = 100  # milisegundos por frame
TRANSICION_FRAME = True  # agregar un frame en blanco entre gifs


def load_gif_frames(gif_path):
    gif = Image.open(gif_path)
    return [frame.convert("RGBA") for frame in ImageSequence.Iterator(gif)]


def procesar_directorio(estacion, tipo, ruta_gifs):
    print(f"\nProcesando: {estacion}/{tipo}")
    inicio = time.time()

    # Listar y ordenar archivos gif
    gif_files = sorted(
        [
            os.path.join(ruta_gifs, f)
            for f in os.listdir(ruta_gifs)
            if f.endswith(".gif")
        ]
    )
    if not gif_files:
        print(f"Sin archivos para {estacion}/{tipo}")
        return

    # Preparar frame en blanco transparente para transición
    ejemplo_frame = load_gif_frames(gif_files[0])[0]
    width, height = ejemplo_frame.size
    blank_frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    # Acumular frames
    all_frames = []
    total_frames = 0
    for gif in gif_files:
        frames = load_gif_frames(gif)
        all_frames.extend(frames)
        total_frames += len(frames)
        if TRANSICION_FRAME:
            all_frames.append(blank_frame)

    # Ruta de salida
    salida_path = os.path.join(SALIDA_DIR, estacion, tipo)
    os.makedirs(salida_path, exist_ok=True)

    # Formato de fecha: YYYYMMDD_HHMMSS
    fecha_creacion = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"composite_{fecha_creacion}.gif"
    output_gif = os.path.join(salida_path, output_filename)

    # Guardar gif
    all_frames[0].save(
        output_gif,
        save_all=True,
        append_images=all_frames[1:],
        loop=0,
        duration=TRANSICION_MS,
        disposal=2,
    )

    fin = time.time()
    duracion_proceso = fin - inicio
    duracion_total_gif = (total_frames * TRANSICION_MS) / 1000

    print(f"Guardado: {output_gif}")
    print(f"Duración del GIF: {duracion_total_gif:.1f} segundos")
    print(f"Tiempo de creación: {duracion_proceso:.2f} segundos")


def recorrer_sondeos_y_generar_composites():
    for estacion in os.listdir(SONDEOS_DIR):
        estacion_path = os.path.join(SONDEOS_DIR, estacion)
        if not os.path.isdir(estacion_path):
            continue
        for tipo in os.listdir(estacion_path):
            tipo_path = os.path.join(estacion_path, tipo)
            if not os.path.isdir(tipo_path):
                continue
            try:
                procesar_directorio(estacion, tipo, tipo_path)
            except Exception as e:
                print(f"Error al procesar {estacion}/{tipo}: {e}")


if __name__ == "__main__":
    recorrer_sondeos_y_generar_composites()
