# Stage 1: Build Angular app
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install -f

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy only the 'browser' build output
COPY --from=build /app/dist/dineshraju147/browser /usr/share/nginx/html

LABEL org.opencontainers.image.source="https://github.com/dineshraju147/dineshraju147.github.io"
LABEL org.opencontainers.image.description="Docker Image of Dinesh Raju's Personal Portfolio"

EXPOSE 80
