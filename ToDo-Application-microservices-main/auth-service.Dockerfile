# Build context for this Dockerfile must be "backend-services/" (see docker-compose.yml),
# since auth-service/controllers/authController.js requires '../../shared/utils' —
# i.e. it needs a "shared" folder as a sibling of its own app root inside the image.

FROM node:20-alpine

WORKDIR /app

COPY auth-service/package*.json ./
RUN npm install

COPY auth-service/ .
COPY shared/ /shared/

EXPOSE 4000

CMD ["npm", "start"]
