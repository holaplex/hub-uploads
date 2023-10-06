FROM node:19-alpine AS base
WORKDIR /app
ENV HOME=/app
RUN addgroup -g 10000 uploader && adduser -u 10000 -G uploader -s /bin/sh -D uploader
RUN chown -R uploader:uploader /app
USER uploader
COPY --chown=uploader:uploader package*.json ./

FROM base AS dependencies
RUN npm set progress=false && npm config set depth 0 && \
    npm install --only=production
RUN cp -R node_modules prod_node_modules
RUN npm install

FROM dependencies AS build
ENV NODE_ENV=production
COPY --chown=uploader:uploader . .

FROM base AS release
COPY --from=dependencies /app/prod_node_modules ./node_modules
COPY --chown=uploader:uploader . .
EXPOSE 3000
CMD ["npm","start"]
