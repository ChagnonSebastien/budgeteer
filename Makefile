PROTO_FILES := protobuf/*


generate-proto:
	protoc --go_out=. --go-grpc_out=. $(PROTO_FILES)
	npx protoc --ts_out ./front-end/src/store/remote/dto --proto_path protobuf $(PROTO_FILES)

dev-front-end:
	npm run --prefix front-end dev

dev-server:
	cd server; \
	go run . start

build-and-serve:
	docker compose up --build


USER_ID := $(shell id -u)
GROUP_ID := $(shell id -g)

CHANGELOG_DIR := ./server/liquibase/changelogs
MASTER_CHANGELOG := db.changelog-master.yaml

define find-next-number
$(shell ls $(CHANGELOG_DIR)/*.sql 2>/dev/null | \
		grep -oE '[0-9]{3}' | \
		sort -n | \
		awk 'NR==1{prev=$$1+1; next} {if ($$1!=prev) {print prev; exit} prev=$$1+1} END {print prev}' | \
		xargs printf "%03d")
endef

validate-change:
	@if [ -z "$(CHANGE)" ]; then \
		echo "Error: CHANGE variable is required."; \
		echo "Usage: make create-sql-file CHANGE=<change>"; \
		exit 1; \
	fi

start-diff-db:
	docker run --rm -d \
		--name diff-budgetapp-postgres \
		--network budgetapp-net \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=changeme \
		-e POSTGRES_DB=budgetapp \
		-v diff_budgetapp_postgres_data:/var/lib/postgresql/data \
		postgres:latest
	@until docker exec diff-budgetapp-postgres pg_isready -U postgres; do \
		echo "Waiting for PostgreSQL to be ready..."; \
		sleep 2; \
	done

cleanup-diff-db:
	docker container kill diff-budgetapp-postgres
	docker volume rm diff_budgetapp_postgres_data

generate-liquibase-changelogs: validate-change start-diff-db
	@trap '$(MAKE) cleanup-diff-db' INT TERM EXIT; \
	docker run --rm \
		--network budgetapp-net \
		-v $(CHANGELOG_DIR):/liquibase/changelogs \
		liquibase update \
			"--url=jdbc:postgresql://diff-budgetapp-postgres:5432/budgetapp?user=postgres&password=changeme" \
			--driver=org.postgresql.Driver \
			--changelog-file=changelogs/$(MASTER_CHANGELOG); \
	next_number=$(call find-next-number); \
	new_file_name="$$next_number-$(CHANGE).sql"; \
	echo "Creating new SQL file: $$new_file_name"; \
	docker run --rm \
		--user=$(USER_ID):$(GROUP_ID) \
		--network budgetapp-net \
		-v $(CHANGELOG_DIR):/liquibase/changelogs \
		liquibase diffChangeLog \
			"--url=jdbc:postgresql://diff-budgetapp-postgres:5432/budgetapp?user=postgres&password=changeme" \
			--driver=org.postgresql.Driver \
			"--referenceUrl=jdbc:postgresql://budgetapp-postgres:5432/budgetapp?user=postgres&password=changeme" \
			--referenceDriver=org.postgresql.Driver \
			"--changelog-file=changelogs/$$new_file_name"
	@echo "Adding entry to changelogs/$(MASTER_CHANGELOG)"; \
	next_number=$(call find-next-number); \
	new_file_name="$$next_number-$(CHANGE).sql"; \
	echo "  - include:" >> $(CHANGELOG_DIR)/$(MASTER_CHANGELOG); \
	echo "      file: ./changelogs/$$new_file_name" >> $(CHANGELOG_DIR)/$(MASTER_CHANGELOG); \


.PHONY: proto-gen
