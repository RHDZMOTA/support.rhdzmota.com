FROM node:20-alpine

# Install system dependencies needed for some packages
RUN apk add --no-cache \
    git \
    openssh \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

ARG VITE_CONVEX_URL
ARG VITE_CONVEX_SITE_URL

COPY . .

RUN npm install

# Build the Vite frontend
RUN npm run build

RUN npm install -g serve pm2

CMD ["serve", "-s", "dist", "-l", "3000"]
