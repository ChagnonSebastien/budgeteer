PROTO_FILES := protobuf/*


generate-proto:
	protoc -I protobuf --go_out=. --go-grpc_out=. $(PROTO_FILES)
	npx protoc --ts_out ./front-end/src/store/remote/dto --proto_path protobuf $(PROTO_FILES)

dev-front-end:
	npm run --prefix front-end dev

dev-server:
	cd server; \
	go run . start

build-and-serve:
	docker compose up --build


MIGRATIONS_DIR := ./server/internal/infrastructure/db/migrations

new-migration:
	@if [ -z "$(NAME)" ]; then echo "Usage: make new-migration NAME=<name>"; exit 1; fi
	@last=$$(ls $(MIGRATIONS_DIR) | grep -oE '^[0-9]+' | sort -n | tail -1); \
	file=$(MIGRATIONS_DIR)/$$(echo $$last | awk '{printf "%03d", $$1 + 1}')_$(NAME).sql; \
	echo '-- +goose Up' > $$file; \
	echo "Created $$file"


.PHONY: proto-gen
