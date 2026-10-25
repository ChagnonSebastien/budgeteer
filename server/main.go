package main

import (
	"chagnon.dev/budget-server/cmd"
	"chagnon.dev/budget-server/internal/infrastructure/autoupdate"
)

func main() {
	if autoupdate.IsScriptHost() {
		autoupdate.ServeScriptHost()
	}
	cmd.Execute()
}
