# Imagen para la API REST + WebSocket de SaludMonitor
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias primero (mejor cache)
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el resto del codigo
COPY . .

# Carpeta para las fotos subidas
RUN mkdir -p uploads

# Render/Docker inyectan el puerto por la variable PORT
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
