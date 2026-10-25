package autoupdate

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"syscall"

	"github.com/dop251/goja"
	"github.com/dop251/goja/parser"
)

const scriptHostEnv = "BUDGETEER_SCRIPT_HOST"

const (
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
	vm := goja.New()
	// Otherwise a sourceMappingURL comment makes the parser read that path from disk.
	vm.SetParserOptions(parser.WithDisableSourceMaps)

	if err := bindFetch(vm, "httpGet", false, fetch); err != nil {
		return "", fmt.Errorf("binding httpGet: %s", err)
	}
	if err := bindFetch(vm, "httpGetWithStealth", true, fetch); err != nil {
		return "", fmt.Errorf("binding httpGetWithStealth: %s", err)
	}

	val, err := vm.RunScript("user.js", script)
	if err != nil {
		return "", fmt.Errorf("running script: %s", err)
	}

	prom, ok := val.Export().(*goja.Promise)
	if !ok {
		return "", errors.New("converting to promise: the script did not return a promise")
	}

	// Jobs drain once RunScript returns, enough only while every binding stays synchronous.
	switch prom.State() {
	case goja.PromiseStateFulfilled:
		return prom.Result().String(), nil
	case goja.PromiseStateRejected:
		return "", fmt.Errorf("script rejected: %s", prom.Result().String())
	default:
		return "", errors.New("script promise never settled")
	}
}

func bindFetch(vm *goja.Runtime, name string, stealth bool, fetch func(url string, stealth bool) (string, error)) error {
	return vm.Set(name, func(call goja.FunctionCall) goja.Value {
		url := ""
		if len(call.Arguments) > 0 {
			url = call.Argument(0).String()
		}
		body, err := fetch(url, stealth)
		if err != nil {
			vm.Interrupt(err)
			return goja.Undefined()
		}
		return vm.ToValue(body)
	})
}
