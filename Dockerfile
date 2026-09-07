# syntax=docker/dockerfile:1
#
# Dos runtimes en un solo Dockerfile:
#   --target web      -> Next.js (web/), sirve la consola en :3000
#   --target descarga -> Python, descarga los sondeos del SMN al volumen
# Ambos leen/escriben el mismo directorio de sondeos (SONDEOS_DIR=/data/sondeos).

# ---- Node: dependencias completas (incluye dev, hacen falta para el build) ----
FROM node:20-slim AS deps
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci

# ---- Node: build ----
FROM node:20-slim AS builder
WORKDIR /app/web
COPY --from=deps /app/web/node_modules ./node_modules
COPY web/ ./
# Las NEXT_PUBLIC_* se incrustan en el bundle del cliente: tienen que estar
# presentes aquí, en el build, no sólo en el runtime.
ARG NEXT_PUBLIC_MAPBOX_TOKEN=""
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Node: dependencias de producción ----
FROM node:20-slim AS prod-deps
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --omit=dev

# ---- Node: runtime de la web ----
FROM node:20-slim AS web
WORKDIR /app/web

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    SONDEOS_DIR=/data/sondeos

COPY --from=prod-deps --chown=node:node /app/web/node_modules ./node_modules
COPY --from=builder  --chown=node:node /app/web/.next        ./.next
COPY --from=builder  --chown=node:node /app/web/public       ./public
COPY --chown=node:node web/package.json ./package.json

# El usuario `node` de la imagen ya es uid 1000, el mismo del host.
RUN mkdir -p /data/sondeos && chown -R node:node /data
USER node

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]

# ---- Python: descarga de sondeos y capas ----
FROM python:3.12-slim AS descarga
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SONDEOS_DIR=/data/sondeos

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY descarga_sondeos.py descarga_inegi.py crear_gif.py radares.json ./

RUN mkdir -p /data/sondeos /data/sondeos_archivo

# Sin USER a propósito: quién escribe el bind mount lo decide el compose
# (`user:`), porque depende del daemon. En Docker rootless el root del
# contenedor ya es el usuario del host; en Docker con daemon root hay que
# pasar el uid:gid real para no dejar archivos de root en el host.
CMD ["python", "descarga_sondeos.py"]
