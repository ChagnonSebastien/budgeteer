FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server .
RUN go build -o budget-server .


FROM alpine:latest AS liquibase
WORKDIR /liquibase
RUN apk add --no-cache openjdk11-jre wget bash \
    && wget https://github.com/liquibase/liquibase/releases/download/v4.7.1/liquibase-4.7.1.tar.gz \
    && tar -xzf liquibase-4.7.1.tar.gz


FROM node:14 AS web-build
WORKDIR /app
COPY front-end/package.json front-end/package-lock.json .
RUN npm install
COPY front-end .
RUN npm run build


FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache bash openjdk11-jre

COPY --from=builder /app/budget-server .
COPY --from=builder /app/configs /app/configs

COPY --from=web-build /app/dist /app/static/web

COPY --from=liquibase /liquibase /liquibase
COPY liquibase/changelogs liquibase/changelogs
#RUN chmod -R +r liquibase/changelogs
ENV PATH="/liquibase:${PATH}"

COPY docker/entrypoint.sh entrypoint.sh

EXPOSE 8080

CMD ["/bin/bash", "entrypoint.sh"]
