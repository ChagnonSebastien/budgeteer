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
    `docker run -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=budgetapp -p 5432:5432 -v postgres_data:/var/lib/postgresql/data postgres:latest` <br>
    Run liquibase update
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
