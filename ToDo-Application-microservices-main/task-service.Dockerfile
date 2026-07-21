# Build context must be "backend-services/" — taskController.js also requires
# '../../shared/utils' and '../../shared/constants'.

FROM node:20-alpine

WORKDIR /app

COPY task-service/package*.json ./
RUN npm install

COPY task-service/ .
COPY shared/ /shared/

EXPOSE 5000

CMD ["npm", "start"]
