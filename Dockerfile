FROM node:22-slim@sha256:80fdb3f57c815e1b638d221f30a826823467c4a56c8f6a8d7aa091cd9b1675ea

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY agents/macgyver/src/package.json agents/macgyver/src/package-lock.json ./
RUN npm ci --omit=dev

COPY agents/macgyver/src/*.mjs ./

RUN groupadd -r app && useradd -r -g app -d /app app && chown -R app:app /app
USER app

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "--env-file-if-exists=.env", "index.mjs"]
