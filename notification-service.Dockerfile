# Build context must be "backend-services/" — notificationController.js also
# requires '../../shared/utils' and '../../shared/constants'.

FROM node:20-alpine

WORKDIR /app

COPY notification-service/package*.json ./
RUN npm install

COPY notification-service/ .
COPY shared/ /shared/

EXPOSE 6000

CMD ["npm", "start"]
