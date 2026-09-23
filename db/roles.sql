-- Rol de aplicación para ingesta.py.

CREATE ROLE ingesta_estaciones_smn LOGIN PASSWORD 'cambiar';

GRANT CONNECT ON DATABASE smn TO ingesta_estaciones_smn;
GRANT SELECT, INSERT, UPDATE ON estaciones, observaciones TO ingesta_estaciones_smn;
