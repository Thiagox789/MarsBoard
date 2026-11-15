FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Ensure cache directory exists and set permissions
RUN mkdir -p src/data/cache/tiles

ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "src/index.js"]
