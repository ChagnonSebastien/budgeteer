package main

import (
	"fmt"
	"os"
	"syscall"

	"chagnon.dev/budget-server/cmd"
	"chagnon.dev/budget-server/internal/infrastructure/autoupdate"
)

func main() {
	if autoupdate.IsScriptHost() {
		autoupdate.ServeScriptHost()
	}

	// Script hosts run as this same user: non-dumpable makes /proc/<pid>/environ and mem root-only.
	if _, _, errno := syscall.RawSyscall(syscall.SYS_PRCTL, syscall.PR_SET_DUMPABLE, 0, 0); errno != 0 {
		fmt.Fprintln(os.Stderr, "marking the process non-dumpable:", errno)
		os.Exit(1)
	}
	cmd.Execute()
}
