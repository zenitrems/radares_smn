
CREATE TABLE IF NOT EXISTS estaciones (
    estacion_m       text PRIMARY KEY,
    nombre_estacion  text NOT NULL UNIQUE,   -- parámetro de getReporteEstacion.php
    organismo        text,
    tipo             text,
    municipio        text,
    estado           text,
    lon              double precision NOT NULL,
    lat              double precision NOT NULL,
    altitud          integer,
    activa           boolean NOT NULL DEFAULT true  -- false: ya no está en estaciones.json
);

CREATE TABLE IF NOT EXISTS observaciones (
    estacion_m     text        NOT NULL REFERENCES estaciones,
    fecha_utc      timestamptz NOT NULL,
    temperatura    real,    -- °C
    humedad        real,    -- %
    presion        real,    -- hPa
    precipitacion  real,    -- mm
    radiacion      real,    -- W/m²
    viento_dir     real,    -- grados
    viento_vel     real,    -- km/h
    racha_dir      real,    -- grados
    racha_vel      real,    -- km/h
    PRIMARY KEY (estacion_m, fecha_utc)
);

CREATE INDEX IF NOT EXISTS observaciones_fecha_idx ON observaciones (fecha_utc DESC);

-- Última lectura de cada estación activa
CREATE OR REPLACE VIEW ultima_observacion AS
SELECT o.*
FROM estaciones e
CROSS JOIN LATERAL (
    SELECT *
    FROM observaciones
    WHERE estacion_m = e.estacion_m
    ORDER BY fecha_utc DESC
    LIMIT 1
) o
WHERE e.activa;
