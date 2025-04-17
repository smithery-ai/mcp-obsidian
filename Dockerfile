FROM node:18-slim

WORKDIR /app

RUN npm install -g typescript shx

COPY . .

RUN npm ci && \
    npm run build
    
ENTRYPOINT ["node", "dist/index.js"] 