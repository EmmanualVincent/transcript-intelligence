# Stage 1: build the React client
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: runtime — server serves API + client/dist, reads dataset/
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
# Preserve repo layout the server hard-codes: /app/client/dist and /app/dataset
COPY --from=client /app/client/dist /app/client/dist
COPY dataset /app/dataset
ENV PORT=3001
EXPOSE 3001
CMD ["node", "src/index.js"]
