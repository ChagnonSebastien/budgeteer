# Budgeteer

A sophisticated personal finance management application that helps you track expenses, analyze spending patterns, and manage your financial health across multiple currencies and accounts.

## Features

### Account Management
- Track multiple financial accounts (checking, savings, investments, etc.)
- Support for different account types (e.g., TFSA)
- Track financial institutions
- Multi-currency support with exchange rate handling
- Initial balance tracking per currency

### Transaction Management
- Record income, expenses, and transfers
- Multi-currency transactions with exchange rate support
- Categorize transactions with hierarchical categories
- Customizable category icons and colors
- Transaction notes and date tracking
- Support for both personal and external accounts

### Financial Analysis
- Fixed vs Variable costs analysis
- Income analysis (gross and net)
- Investment tracking
- Monthly and yearly views
- Category-based spending analysis
- Multi-currency calculations
- Privacy mode for sensitive data

### Data Visualization
- Account balance trends
- Spending patterns by category
- Cost analysis charts
- Transaction history views

## Technology Stack

### Frontend
- React with TypeScript
- Material-UI for design system
- Nivo for data visualization
- gRPC-Web for API communication
- Vite for build tooling
- PWA support

### Backend
- Go server with domain-driven design
- gRPC and HTTP APIs
- PostgreSQL database
- goose for database migrations, applied by the server at startup
- JWT authentication
- Multi-user support

### Infrastructure
- Docker containerization
- Make-based build system
- Nix development environment

## Development Setup

### Prerequisites
- Go and Node.js
- Docker and Docker Compose
- Required Go packages:
  ```bash
  go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
  go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
  ```
- Required Node packages:
  ```bash
  npm install -g @protobuf-ts/plugin
  ```

### Generate Protocol Buffers
```bash
make proto-gen
```

### Local Development

1. Set up the database:
   ```bash
   # Create network
   docker network create budgetapp-net

   # Start PostgreSQL
   docker run --rm --name budgetapp-postgres \
     --network budgetapp-net \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=changeme \
     -e POSTGRES_DB=budgetapp \
     -p 5432:5432 \
     -v postgres_data:/var/lib/postgresql/data \
     postgres:latest
   ```

2. Start the backend server. It applies pending migrations from `server/internal/infrastructure/db/migrations` before serving (`make new-migration NAME=<name>` creates the next one):
   ```bash
   cd server
   go run . start
   ```

3. Start the frontend development server:
   ```bash
   cd front-end
   npm install
   npm run dev
   ```

### Docker Deployment

Build and run the entire stack:
```bash
docker compose up --build
```

### Upgrading from the Liquibase image

Releases up to the `ci: remove the broken publish job` commit ran Liquibase from a shell entrypoint. Since then:

- The server applies migrations itself at startup with goose. On first start it reads Liquibase's `databasechangelog` table, records the migrations already applied in `goose_db_version`, and applies only the missing ones. No action is needed, and the database user needs the same rights as before.
- It refuses to start, with an error naming the file, if Liquibase left a migration half applied or still holds `databasechangeloglock`. Run the previous image once so Liquibase finishes (or clear a stale lock), then upgrade.
- The image no longer runs `entrypoint.sh`: drop any `entrypoint` or `command` override.
- The `databasechangelog` and `databasechangeloglock` tables stay in place so the previous image can still be rolled back to. Drop them once you no longer need that.

## Project Structure

```
.
├── front-end/              # React/TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── domain/        # Domain models
│   │   ├── pages/         # Application pages
│   │   ├── service/       # Business logic
│   │   └── store/         # State management
│
├── server/                # Go backend
│   ├── cmd/              # CLI commands
│   ├── configs/          # Configuration
│   └── internal/
│       ├── domain/       # Business logic & models
│       └── infrastructure/
│           ├── db/       # Database layer
│           └── messaging/ # API endpoints
│
├── protobuf/             # Protocol buffer definitions
└── docker/               # Docker configuration
```

## License

Open source software. Deploy and modify for your own use.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Support

For issues and feature requests, please use the GitHub issue tracker.
