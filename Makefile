PROTO_FILES := protobuf/*

proto-gen:
	protoc --go_out=. --go-grpc_out=. $(PROTO_FILES)
	npx protoc --ts_out ./front-end/src/messaging/dto --proto_path protobuf $(PROTO_FILES)

start-dev-front-end:
	npm run --prefix front-end dev

start-server:
	docker compose up --build

.PHONY: proto-gen
