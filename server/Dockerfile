# syntax=docker/dockerfile:1
# NearBy backend — production image. Works on Railway, Render, Koyeb,
# Cloud Run, Fly.io, or any container host.
FROM node:20-alpine

# Small init so SIGTERM is handled cleanly on the platform.
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

ENV NODE_ENV=production
WORKDIR /app

# Install only production deps first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# App source.
COPY . .

# Hosts inject PORT; the app reads process.env.PORT (default 5000).
EXPOSE 5000

# Lightweight container healthcheck hitting the /health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
