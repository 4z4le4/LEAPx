FROM node:22-alpine

WORKDIR /app
COPY .env* ./
COPY . .

RUN npm install --legacy-peer-deps

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]