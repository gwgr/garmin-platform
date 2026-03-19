FROM node:22-alpine

WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package.json ./
RUN npm install \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup -h /home/appuser \
    && chown -R appuser:appgroup /app/frontend

COPY frontend ./

RUN chown -R appuser:appgroup /app/frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000 >/dev/null || exit 1

USER appuser

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
