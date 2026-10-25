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

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/launcher/flags"
	"github.com/go-rod/stealth"

	"chagnon.dev/budget-server/internal/logging"
)

const (
	MaxScriptBytes   = 64 << 10
	scriptTimeout    = 60 * time.Second
	maxFetchesPerRun = 10
	maxResponseBytes = 2 << 20
)

var errFetchBudgetExceeded = fmt.Errorf("a script may fetch at most %d pages per run", maxFetchesPerRun)

func RunJavascript(ctx context.Context, script string) (string, error) {
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
	result, protocolErr := driveScriptHost(ctx, script, stdin, output)
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

func driveScriptHost(ctx context.Context, script string, stdin io.Writer, stdout io.Reader) (hostMessage, error) {
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

		body := fetchForScript(ctx, message.FetchURL, message.Stealth, &fetches)
		if err := encoder.Encode(fetchReply{Body: body}); err != nil {
			return hostMessage{}, fmt.Errorf("answering the script host: %w", err)
		}
	}
}

func fetchForScript(ctx context.Context, url string, stealth bool, fetches *int) string {
	if url == "" {
		return "A URL is required"
	}

	*fetches++
	if *fetches > maxFetchesPerRun {
		return errFetchBudgetExceeded.Error()
	}

	fetch := fetchWithLimits
	if stealth {
		fetch = fetchWithBrowser
	}
	body, err := fetch(ctx, url)
	if errors.Is(err, errDestinationNotAllowed) {
		return "Destination not allowed: only public http(s) addresses on ports 80 and 443 can be fetched"
	}
	if err != nil {
		logging.FromContext(ctx).With("url", url).Error("fetching url for script", "error", err)
		return "Internal Server Error"
	}
	return body
}

func fetchWithBrowser(ctx context.Context, rawURL string) (string, error) {
	parsed, err := checkScriptURL(rawURL)
	if err != nil {
		return "", err
	}

	proxyAddr, stopProxy, err := startEgressProxy(ctx)
	if err != nil {
		return "", err
	}
	defer stopProxy()

	// Chromium skips the proxy for loopback unless told otherwise, and WebRTC would bypass it over UDP.
	l := launcher.New().
		Context(ctx).
		Bin("chromium").
		Env("PATH=/usr/bin:/bin", "HOME="+os.TempDir()).
		Headless(true).
		Proxy(proxyAddr).
		Set(flags.Flag("proxy-bypass-list"), "<-loopback>").
		Set(flags.Flag("force-webrtc-ip-handling-policy"), "disable_non_proxied_udp")

	controlURL, err := l.Launch()
	if err != nil {
		return "", fmt.Errorf("launching chromium: %w", err)
	}
	defer func() {
		l.Kill()
		l.Cleanup()
	}()

	browser := rod.New().Context(ctx).ControlURL(controlURL)
	if err := browser.Connect(); err != nil {
		return "", fmt.Errorf("connecting to the browser: %w", err)
	}
	defer func() { _ = browser.Close() }()

	page, err := stealth.Page(browser)
	if err != nil {
		return "", fmt.Errorf("creating page: %w", err)
	}

	if err := page.Navigate(parsed.String()); err != nil {
		return "", fmt.Errorf("navigating to page: %w", err)
	}
	if err := page.WaitLoad(); err != nil {
		return "", fmt.Errorf("waiting for page to load: %w", err)
	}

	preElement, err := page.Element("pre")
	if err != nil {
		return "", fmt.Errorf("getting pre element: %w", err)
	}

	body, err := preElement.Text()
	if err != nil {
		return "", fmt.Errorf("converting pre element to text: %w", err)
	}
	if len(body) > maxResponseBytes {
		return "", errors.New("response too large")
	}
	return body, nil
}
