FROM golang:1.27.3-alpine3.24@sha256:b8c9b82affbbb82a020bbcf998dad2ba9516944ac7e883524642a481a9505e9c AS sqlc
WORKDIR /app
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1
COPY server/internal/infrastructure/db/queries internal/infrastructure/db/queries
COPY server/internal/infrastructure/db/migrations internal/infrastructure/db/migrations
COPY server/sqlc.yaml sqlc.yaml
RUN sqlc generate


FROM golang:1.27.3-alpine3.24@sha256:b8c9b82affbbb82a020bbcf998dad2ba9516944ac7e883524642a481a9505e9c AS protoc
WORKDIR /app
RUN apk update && apk add --no-cache make protobuf-dev nodejs npm
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.12
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.6.2
COPY docker/protoc/package.json docker/protoc/package-lock.json ./
RUN npm ci --ignore-scripts
ENV PATH="$PATH:$GOPATH/bin:/app/node_modules/.bin"
COPY protobuf protobuf
RUN protoc -I protobuf --go_out=. --go-grpc_out=. protobuf/*
RUN mkdir -p front-end/src/store/remote/dto
RUN npx protoc --ts_out ./front-end/src/store/remote/dto --proto_path protobuf protobuf/*


FROM alpine:3.22.7@sha256:2e0b81d60597f449baa56dc25d355367869d2dca4cd57e866f1e2b52af3eb55f AS commit
RUN apk add --no-cache git
WORKDIR /repo
COPY .git .git
RUN git rev-parse HEAD | cut -c1-7 > /commit


FROM node:22.23.4-alpine3.24@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS web-build
WORKDIR /app
COPY front-end/package.json front-end/package-lock.json ./
RUN npm ci
COPY front-end .
COPY --from=protoc /app/front-end/src/store/remote/dto src/store/remote/dto
COPY --from=commit /commit /commit
RUN VITE_COMMIT_HASH=$(cat /commit) npm run build


FROM golang:1.27.3-bookworm@sha256:972b4110ba0f47539a975c31e52c64765e1ff19f2d74469ae4a595c6676e80a5 AS server-build
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


FROM debian:bookworm-20261020@sha256:854dd8ab51d62866dbd8f5431d15ce77b12983a2a4a1e1fe43a2395dc7ef9f61 AS chromium
RUN apt-get update && \
    apt-get install -y --no-install-recommends chromium socat tini && \
    rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 chromium
COPY docker/chromium.sh /usr/local/bin/chromium.sh
USER chromium
EXPOSE 9222
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/bin/bash", "/usr/local/bin/chromium.sh"]


FROM gcr.io/distroless/cc-debian12:nonroot@sha256:9dac0a79194e45a7da0158a9c6da57b217585af0786db3845d1f0ec1a0dd182f
WORKDIR /app
COPY --from=server-build /app/budget-server .
COPY --from=server-build /app/configs configs
COPY --from=web-build /app/dist static/web
EXPOSE 8080
ENTRYPOINT ["/app/budget-server"]
CMD ["start"]

