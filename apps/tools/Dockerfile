FROM node:22-alpine@sha256:4d64b49e6c891c8fc821007cb1cdc6c0db7773110ac2c34bf2e6960adef62ed3
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ src/
USER node
EXPOSE 3100
CMD ["node", "src/index.js"]
