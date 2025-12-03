FROM golang:1.25-alpine AS sqlc
WORKDIR /app
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
COPY server/internal/infrastructure/db/queries internal/infrastructure/db/queries
COPY server/liquibase/changelogs liquibase/changelogs
COPY server/sqlc.yaml sqlc.yaml
RUN sqlc generate


FROM golang:1.25-alpine AS protoc
WORKDIR /app
RUN apk update && apk add --no-cache make protobuf-dev nodejs npm
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
RUN npm install -D @protobuf-ts/plugin
ENV PATH="$PATH:$GOPATH/bin:/app/node_modules/.bin"
COPY protobuf protobuf
RUN protoc --go_out=. --go-grpc_out=. protobuf/*
RUN mkdir -p front-end/src/store/remote/dto
RUN npx protoc --ts_out ./front-end/src/store/remote/dto --proto_path protobuf protobuf/*


FROM node:22-alpine AS web-build
WORKDIR /app
COPY front-end/package.json front-end/package-lock.json ./
RUN npm install
COPY front-end .
COPY --from=protoc /app/front-end/src/store/remote/dto src/store/remote/dto
RUN npm run build


FROM golang:1.25-bookworm AS server-build
RUN apt-get update && apt-get install -y \
  build-essential \
  pkg-config \
  libv8-dev \
  python3 \
  ninja-build \
  libc++-dev \
  libc++abi-dev

ENV CGO_ENABLED=1

WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server .
COPY --from=sqlc /app/internal/infrastructure/db/dao internal/infrastructure/db/dao
COPY --from=protoc /app/server/internal/infrastructure/messaging/dto internal/infrastructure/messaging/dto

RUN go build -o budget-server .


FROM alpine:latest AS liquibase
WORKDIR /liquibase
RUN apk add --no-cache openjdk11-jre curl bash \
    && curl -L https://github.com/liquibase/liquibase/releases/download/v5.0.1/liquibase-5.0.1.tar.gz | tar -xz \
    && curl -L -o /liquibase/lib/postgresql-42.7.4.jar https://jdbc.postgresql.org/download/postgresql-42.7.4.jar


FROM debian:bookworm
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      bash \
      default-jre-headless \
      chromium && \
    rm -rf /var/lib/apt/lists/*
COPY --from=server-build /app/budget-server .
COPY --from=server-build /app/configs configs
COPY --from=web-build /app/dist static/web
COPY --from=liquibase /liquibase /liquibase
COPY server/liquibase/changelogs changelogs
#RUN chmod -R +r liquibase/changelogs
ENV PATH="/liquibase:${PATH}"
COPY docker/entrypoint.sh entrypoint.sh
RUN chmod +x budget-server
RUN chmod +x entrypoint.sh
EXPOSE 8080
CMD ["/bin/bash", "entrypoint.sh"]

