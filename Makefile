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


TRIVY_IMAGE := aquasec/trivy:0.75.0@sha256:af6acf9a6b85dfe389a1941505c0ce9efef52a4719635e1a962f022a3d855daa
TRIVY_EXIT ?= 1
TRIVY_FLAGS := --exit-code $(TRIVY_EXIT) --severity HIGH,CRITICAL --ignore-unfixed
TRIVY := docker run --rm -v trivy-cache:/root/.cache/trivy -v "$$PWD":/src:ro -w /src
IMAGE ?= budgeteer:local

trivy-fs:
	$(TRIVY) $(TRIVY_IMAGE) fs $(TRIVY_FLAGS) --scanners vuln,secret,misconfig --skip-dirs "**/node_modules" .

trivy-image:
	$(TRIVY) -v /var/run/docker.sock:/var/run/docker.sock $(TRIVY_IMAGE) image $(TRIVY_FLAGS) $(IMAGE)


.PHONY: proto-gen
