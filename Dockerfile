# syntax=docker/dockerfile:1

# ---------- Build-Stage: JSX + Tailwind vorkompilieren ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
# devDependencies (tailwindcss, babel) werden hier gebraucht
RUN npm install
COPY . .
RUN npm run build

# ---------- Runtime-Stage: schlankes Produktions-Image ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
# Nur Server + vorkompilierte Assets ins finale Image
COPY server.js ./
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
