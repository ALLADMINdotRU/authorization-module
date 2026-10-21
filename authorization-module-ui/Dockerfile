# ═══════════════════════════════════════════════════════════════
# Стадия 1: сборка фронтенда (Node)
# ═══════════════════════════════════════════════════════════════
FROM node:22-alpine AS build

WORKDIR /app

# Сначала манифесты — чтобы Docker кэшировал слой с зависимостями
COPY package.json package-lock.json ./
RUN npm ci

# Копируем исходники и собираем (tsc -b && vite build → dist/)
COPY . .
RUN npm run build

# ═══════════════════════════════════════════════════════════════
# Стадия 2: раздача статики через nginx
# ═══════════════════════════════════════════════════════════════
FROM nginx:1.27-alpine

# Конфиг nginx (SPA + прокси /auth на бэк)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Собранная статика из первой стадии
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
