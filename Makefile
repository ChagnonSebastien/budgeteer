PROTO_FILES := protobuf/*

proto-gen:
	protoc --plugin=./front-end/node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=./front-end/src/messaging/dao $(PROTO_FILES)
	protoc --go_out=. --go-grpc_out=. $(PROTO_FILES)

start-dev-front-end:
	npm run --prefix front-end dev

start-server:
	docker compose up --build

.PHONY: proto-gen
