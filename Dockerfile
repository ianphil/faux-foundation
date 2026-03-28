FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY agents/macgyver/src/package.json agents/macgyver/src/package-lock.json ./
RUN npm ci --omit=dev

COPY agents/macgyver/src/*.mjs ./

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "--env-file-if-exists=.env", "index.mjs"]
