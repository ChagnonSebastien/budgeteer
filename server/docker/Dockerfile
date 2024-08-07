FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o budget-server .


FROM alpine:latest AS liquibase

WORKDIR /liquibase
RUN apk add --no-cache openjdk11-jre wget bash \
    && wget https://github.com/liquibase/liquibase/releases/download/v4.7.1/liquibase-4.7.1.tar.gz \
    && tar -xzf liquibase-4.7.1.tar.gz \
    && rm liquibase-4.7.1.tar.gz \
    && wget https://jdbc.postgresql.org/download/postgresql-42.2.23.jar -P /liquibase/lib/ \
    && wget https://repo1.maven.org/maven2/org/yaml/snakeyaml/1.27/snakeyaml-1.27.jar -P /liquibase/lib/


FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache bash openjdk11-jre

COPY --from=builder /app/budget-server .
COPY --from=builder /app/configs /app/configs
COPY --from=builder /app/liquibase /app/liquibase

COPY --from=liquibase /liquibase /liquibase
ENV PATH="/liquibase:${PATH}"

RUN chmod +x /liquibase/liquibase
RUN chmod -R 777 /app/liquibase
RUN liquibase --version

EXPOSE 8080

CMD ["./budget-server", "start"]
