FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dependencies
RUN npm set progress=false && npm config set depth 0 && \
    npm install --only=production
RUN cp -R node_modules prod_node_modules
RUN npm install

FROM dependencies AS build
ENV NODE_ENV=production
COPY . .

# --- Release ----
FROM base AS release
COPY --from=dependencies /app/prod_node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm","start"]
