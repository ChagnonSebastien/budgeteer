package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
)

func runAsInit() int {
	executable, err := os.Executable()
	if err != nil {
		fmt.Fprintln(os.Stderr, "locating the server executable:", err)
		return 1
	}

	server := exec.Command(executable, os.Args[1:]...)
	server.Stdin, server.Stdout, server.Stderr = os.Stdin, os.Stdout, os.Stderr
	if err := server.Start(); err != nil {
		fmt.Fprintln(os.Stderr, "starting the server:", err)
		return 1
	}

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGTERM, syscall.SIGINT, syscall.SIGHUP, syscall.SIGQUIT)
	go func() {
		for sig := range signals {
			_ = server.Process.Signal(sig)
		}
	}()

	for {
		var status syscall.WaitStatus
		pid, err := syscall.Wait4(-1, &status, 0, nil)
		if errors.Is(err, syscall.EINTR) {
			continue
		}
		if err != nil {
			fmt.Fprintln(os.Stderr, "waiting for the server:", err)
			return 1
		}
		if pid != server.Process.Pid {
			continue
		}
		if status.Signaled() {
			return 128 + int(status.Signal())
		}
		return status.ExitStatus()
	}
}
