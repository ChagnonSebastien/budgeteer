# Budgeteer (placeholder)

- Open source budget app
- Deploy your own server


## Development

- Install Go and Node
- Install following packages <br>
  `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest` <br>
  `go install google.golang.org/protobuf/cmd/protoc-gen-go@latest` <br>
  `go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest` <br>
  `npm install -g @protobuf-ts/plugin`
- Generate code with sqlc and protoc <br>
  `make proto-gen`
- Run dev environment
  - Database <br>
    `docker network create budgetapp-net`
    `docker run --rm --name budgetapp-postgres --network budgetapp-net -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=budgetapp -p 5432:5432 -v postgres_data:/var/lib/postgresql/data postgres:latest` <br>
    `docker run --rm --network budgetapp-net -v ./server/liquibase/changelogs:/liquibase/changelogs liquibase update --driver=org.postgresql.Driver --changelog-file=changelogs/db.changelog-master.yaml "--url=jdbc:postgresql://budgetapp-postgres:5432/budgetapp?user=postgres&password=changeme"`
  - Server <br>
    `cd server` <br>
    `go run . start`
  - Front end <br>
    `cd front-end` <br>
    `npm run dev`
- Build server <br>
  `docker build -f docker/Dockerfile -t budgeteer .`
- Build and run full stack <br>
  `docker compose up --build`
