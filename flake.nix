{
  description = "A Nix flake providing the project development shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
    go = pkgs.go_1_25;
  in {
    devShells.${system}.default = pkgs.mkShell {
      buildInputs = [
        go
        pkgs.sqlc
        pkgs.grpc-tools
        pkgs.nodejs
        pkgs.postgresql.dev
      ];

      shellHook = ''
        if [ -f .env ]; then
          export $(grep -v '^#' .env | xargs)
        fi

        export GOROOT=${pkgs.go}/share/go
        export GOBIN=$PWD/bin
        export GOPROXY=https://proxy.golang.org,direct
        export GOSUMDB=sum.golang.org
        mkdir -p $GOBIN

        export CPATH="${pkgs.postgresql.dev}/include/server:$CPATH"
        export LIBRARY_PATH="${pkgs.postgresql.dev}/lib:$LIBRARY_PATH"
        export PATH="$GOBIN:$PATH"

        go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
        go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

        mkdir -p node_modules
        npm install --prefix ./ @protobuf-ts/plugin
      '';
    };
  };
}

