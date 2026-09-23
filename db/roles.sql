-- Rol de aplicación para ingesta.py.

CREATE ROLE ingesta_estaciones_smn LOGIN PASSWORD 'cambiar';

GRANT CONNECT ON DATABASE estaciones_smn TO ingesta_estaciones_smn;
GRANT SELECT, INSERT, UPDATE ON estaciones, observaciones TO ingesta_estaciones_smn;

-- Rol de sólo lectura para la consola web.
CREATE ROLE web_estaciones_smn LOGIN PASSWORD 'cambiar';

GRANT CONNECT ON DATABASE estaciones_smn TO web_estaciones_smn;
GRANT SELECT ON estaciones, observaciones, ultima_observacion TO web_estaciones_smn;
