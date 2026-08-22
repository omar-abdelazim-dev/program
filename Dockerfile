# Production image for the API. The repository root is the Docker context so
# Render and other hosts can build this monorepo consistently.
FROM node:20-bookworm-slim

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server ./

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
