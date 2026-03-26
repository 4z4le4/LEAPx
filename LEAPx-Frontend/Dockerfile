FROM node:22-alpine

WORKDIR /app

COPY .env* ./
COPY . .

RUN npm install --legacy-peer-deps
#RUN npm run build
RUN npm run build:skip-check

EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
