FROM nginx:1.27-alpine

RUN rm -f /usr/share/nginx/html/* \
    && printf '%s\n' \
    '<!doctype html>' \
    '<html lang="en">' \
    '<head><meta charset="utf-8"><title>Garmin Platform</title></head>' \
    '<body>' \
    '<h1>Garmin Platform frontend scaffold is running.</h1>' \
    '<p>Next.js application code will be added in a later task.</p>' \
    '</body>' \
    '</html>' \
    > /usr/share/nginx/html/index.html \
    && sed -i 's/listen       80;/listen       3000;/' /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
