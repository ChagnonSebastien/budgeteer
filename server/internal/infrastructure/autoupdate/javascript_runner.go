package autoupdate

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"time"

	"chagnon.dev/budget-server/internal/logging"
)

const (
	MaxScriptBytes   = 64 << 10
	scriptTimeout    = 60 * time.Second
	maxFetchesPerRun = 10
	maxResponseBytes = 2 << 20
)

var errFetchBudgetExceeded = fmt.Errorf("a script may fetch at most %d pages per run", maxFetchesPerRun)

type JavascriptRunner struct {
	browser *remoteBrowser
}

func NewJavascriptRunner(browserURL string) (*JavascriptRunner, error) {
	browser, err := newRemoteBrowser(browserURL)
	if err != nil {
		return nil, err
	}
	return &JavascriptRunner{browser: browser}, nil
}

func (r *JavascriptRunner) Run(ctx context.Context, script string) (string, error) {
	if len(script) > MaxScriptBytes {
		return "", fmt.Errorf("script is larger than %d bytes", MaxScriptBytes)
	}

	ctx, cancel := context.WithTimeout(ctx, scriptTimeout)
	defer cancel()

	executable, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("locating the script host: %w", err)
	}

	// The host gets no inherited environment, so the script's process never sees server secrets.
	host := exec.CommandContext(ctx, executable)
	host.Env = []string{scriptHostEnv + "=1"}
	host.WaitDelay = time.Second
	stdin, err := host.StdinPipe()
	if err != nil {
		return "", err
	}
	stdout, err := host.StdoutPipe()
	if err != nil {
		return "", err
	}
	if err := host.Start(); err != nil {
		return "", fmt.Errorf("starting the script host: %w", err)
	}

	output := &io.LimitedReader{R: stdout, N: maxHostOutputBytes}
	result, protocolErr := r.driveScriptHost(ctx, script, stdin, output)
	if protocolErr != nil {
		_ = host.Process.Kill()
	}
	_ = stdin.Close()
	waitErr := host.Wait()

	switch {
	case ctx.Err() != nil:
		return "", fmt.Errorf("script did not finish within %s", scriptTimeout)
	case protocolErr != nil && output.N <= 0:
		return "", fmt.Errorf("script produced more than %d MB of output", maxHostOutputBytes>>20)
	case protocolErr != nil:
		logging.FromContext(ctx).Warn("script host failed", "error", protocolErr, "exit", waitErr)
		return "", errors.New("script crashed, most likely by running out of memory")
	}
	return result.Result, result.err()
}

func (m hostMessage) err() error {
	if m.Error == "" {
		return nil
	}
	return errors.New(m.Error)
}

func (r *JavascriptRunner) driveScriptHost(ctx context.Context, script string, stdin io.Writer, stdout io.Reader) (hostMessage, error) {
	encoder := json.NewEncoder(stdin)
	decoder := json.NewDecoder(stdout)

	if err := encoder.Encode(scriptInput{Script: script}); err != nil {
		return hostMessage{}, fmt.Errorf("sending the script: %w", err)
	}

	fetches := 0
	for {
		var message hostMessage
		if err := decoder.Decode(&message); err != nil {
			return hostMessage{}, fmt.Errorf("reading from the script host: %w", err)
		}
		if message.Done {
			return message, nil
		}

		body := r.fetchForScript(ctx, message.FetchURL, message.Stealth, &fetches)
		if err := encoder.Encode(fetchReply{Body: body}); err != nil {
			return hostMessage{}, fmt.Errorf("answering the script host: %w", err)
		}
	}
}

func (r *JavascriptRunner) fetchForScript(ctx context.Context, url string, stealth bool, fetches *int) string {
	if url == "" {
		return "A URL is required"
	}

	*fetches++
	if *fetches > maxFetchesPerRun {
		return errFetchBudgetExceeded.Error()
	}

	fetch := fetchWithLimits
	if stealth {
		fetch = r.browser.fetch
	}
	body, err := fetch(ctx, url)
	if errors.Is(err, errDestinationNotAllowed) {
		return "Destination not allowed: only public http(s) addresses on ports 80 and 443 can be fetched"
	}
	if errors.Is(err, errStealthUnavailable) {
		return err.Error()
	}
	if err != nil {
		logging.FromContext(ctx).With("url", url).Error("fetching url for script", "error", err)
		return "Internal Server Error"
	}
	return body
}
