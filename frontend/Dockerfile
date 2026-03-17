FROM node:22-alpine

WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package.json ./
RUN npm install

COPY frontend ./

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
