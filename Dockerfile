FROM nginx:alpine

COPY index.html manifest.webmanifest favicon.svg icon.svg icon-192.png icon-512.png apple-touch-icon.png /usr/share/nginx/html/

EXPOSE 80
