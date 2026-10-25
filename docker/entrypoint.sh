#!/bin/sh

LIQUIBASE_COMMAND_USERNAME="$DATABASE_USER" \
LIQUIBASE_COMMAND_PASSWORD="$DATABASE_PASSWORD" \
/liquibase/liquibase update \
  --driver=org.postgresql.Driver \
  --url="jdbc:postgresql://$DATABASE_HOST:$DATABASE_PORT/$DATABASE_NAME?sslmode=${DATABASE_SSLMODE:-require}" \
  --changeLogFile=./changelogs/db.changelog-master.yaml

exec ./budget-server start
