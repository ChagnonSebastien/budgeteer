package autoupdate

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"syscall"

	v8 "rogchap.com/v8go"
)

const scriptHostEnv = "BUDGETEER_SCRIPT_HOST"

const (
	scriptHeapLimitMB  = 128
	scriptMemoryLimit  = 512 << 20
	maxHostOutputBytes = 1 << 20
)

type scriptInput struct {
	Script string `json:"script"`
}

type fetchReply struct {
	Body string `json:"body"`
}

type hostMessage struct {
	FetchURL string `json:"fetchUrl,omitempty"`
	Stealth  bool   `json:"stealth,omitempty"`
	Done     bool   `json:"done,omitempty"`
	Result   string `json:"result,omitempty"`
	Error    string `json:"error,omitempty"`
}

func IsScriptHost() bool {
	return os.Getenv(scriptHostEnv) == "1"
}

func ServeScriptHost() {
	if err := syscall.Setrlimit(syscall.RLIMIT_DATA, &syscall.Rlimit{Cur: scriptMemoryLimit, Max: scriptMemoryLimit}); err != nil {
		fmt.Fprintln(os.Stderr, "limiting memory:", err)
		os.Exit(1)
	}

	err := hostScript(os.Stdin, os.Stdout)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	os.Exit(0)
}

func hostScript(in io.Reader, out io.Writer) error {
	decoder := json.NewDecoder(in)
	encoder := json.NewEncoder(out)

	var input scriptInput
	if err := decoder.Decode(&input); err != nil {
		return fmt.Errorf("reading script: %w", err)
	}

	fetch := func(url string, stealth bool) (string, error) {
		if err := encoder.Encode(hostMessage{FetchURL: url, Stealth: stealth}); err != nil {
			return "", err
		}
		var reply fetchReply
		if err := decoder.Decode(&reply); err != nil {
			return "", err
		}
		return reply.Body, nil
	}

	result, err := evaluate(input.Script, fetch)
	done := hostMessage{Done: true, Result: result}
	if err != nil {
		done.Error = err.Error()
	}
	return encoder.Encode(done)
}

func evaluate(script string, fetch func(url string, stealth bool) (string, error)) (string, error) {
	v8.SetFlags(fmt.Sprintf("--max-old-space-size=%d", scriptHeapLimitMB))
	iso := v8.NewIsolate()
	defer iso.Dispose()
	v8Ctx := v8.NewContext(iso)
	defer v8Ctx.Close()

	if err := bindFetch(v8Ctx, "httpGet", false, fetch); err != nil {
		return "", fmt.Errorf("binding httpGet: %s", err)
	}
	if err := bindFetch(v8Ctx, "httpGetWithStealth", true, fetch); err != nil {
		return "", fmt.Errorf("binding httpGetWithStealth: %s", err)
	}

	val, err := v8Ctx.RunScript(script, "user.js")
	if err != nil {
		return "", fmt.Errorf("running script: %s", err)
	}

	prom, err := val.AsPromise()
	if err != nil {
		return "", fmt.Errorf("converting to promise: %s", err)
	}

	v8Ctx.PerformMicrotaskCheckpoint() // one drain suffices only while every binding stays synchronous

	switch prom.State() {
	case v8.Fulfilled:
		return prom.Result().String(), nil
	case v8.Rejected:
		return "", fmt.Errorf("script rejected: %s", prom.Result().String())
	default:
		return "", errors.New("script promise never settled")
	}
}

func bindFetch(v8Ctx *v8.Context, name string, stealth bool, fetch func(url string, stealth bool) (string, error)) error {
	iso := v8Ctx.Isolate()
	tmpl := v8.NewFunctionTemplate(iso, func(info *v8.FunctionCallbackInfo) *v8.Value {
		url := ""
		if len(info.Args()) > 0 {
			url = info.Args()[0].String()
		}
		body, err := fetch(url, stealth)
		if err != nil {
			iso.TerminateExecution()
			return nil
		}
		value, _ := v8.NewValue(iso, body)
		return value
	})
	return v8Ctx.Global().Set(name, tmpl.GetFunction(v8Ctx))
}
