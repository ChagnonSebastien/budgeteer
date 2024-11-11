{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.go
    pkgs.sqlc
    pkgs.grpc-tools
    pkgs.nodejs
  ];
  
  shellHook = ''
    if [ -f .env ]; then
      export $(grep -v '^#' .env | xargs)
    fi
    
    export GOBIN=$PWD/bin
    mkdir -p $GOBIN

    export CPATH="${pkgs.postgresql.dev}/include/server:$CPATH"
    export LIBRARY_PATH="${pkgs.postgresql.dev}/lib:\$LIBRARY_PATH"
    export PATH="$GOBIN:$PATH"

    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

    mkdir -p node_modules
    npm install --prefix ./ @protobuf-ts/plugin
  '';
}

