FROM node:22-alpine

WORKDIR /app
COPY --chown=node:node . .
USER node

ENV NODE_ENV=production PORT=8765 HOST=0.0.0.0 RADAR_DATA_DIR=/data
EXPOSE 8765
CMD ["node", "server.mjs"]
