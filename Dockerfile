FROM node:22-bookworm-slim

WORKDIR /app

# OpenSSL is required by Prisma. python3/make/g++ are required to build argon2 native addon.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# npm 10.9.x can fail in Docker with "Exit handler never called".
# Pin npm to a stable version before installing dependencies.
RUN npm install -g npm@10.8.2 --no-audit --no-fund

COPY package.json ./

# Do not use package-lock here because some generated archives may contain registry-specific resolved URLs.
# The project is still reproducible through package.json + Docker image.
RUN npm install --package-lock=false --ignore-scripts --no-audit --no-fund

# Rebuild argon2 native addon with build tools now available.
RUN npm rebuild argon2 --no-audit --no-fund

COPY prisma ./prisma

# Generate Prisma Client from the locally installed Prisma version.
RUN ./node_modules/.bin/prisma generate

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
