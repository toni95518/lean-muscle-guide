# Builds the API and serves the web client from one container.
FROM node:22-slim AS build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist ./dist
COPY server/drizzle ./drizzle
COPY web /app/web
USER node
EXPOSE 3000
# Apply migrations and seed the libraries, then start the API.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
