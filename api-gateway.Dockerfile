# api-gateway doesn't use the shared/ folder (it's a pure reverse proxy),
# but the build context is still "backend-services/" for consistency with
# the other three services' Dockerfiles.

FROM node:20-alpine

WORKDIR /app

COPY api-gateway/package*.json ./
RUN npm install

COPY api-gateway/ .

EXPOSE 3000

CMD ["npm", "start"]
