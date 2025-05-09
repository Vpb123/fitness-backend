
FROM node:18-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev


FROM node:18-slim

WORKDIR /usr/src/node-app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
