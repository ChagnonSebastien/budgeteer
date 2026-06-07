#!/bin/sh

connectionstring="jdbc:postgresql://$DATABASE_HOST:$DATABASE_PORT/$DATABASE_NAME?user=$DATABASE_USER&password=$DATABASE_PASSWORD&sslmode=${DATABASE_SSLMODE:-disable}"
/liquibase/liquibase update \
  --driver=org.postgresql.Driver \
  --url=$connectionstring \
  --changeLogFile=./changelogs/db.changelog-master.yaml

./budget-server start
