package autoupdate

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/launcher/flags"
	"github.com/go-rod/stealth"
	v8 "rogchap.com/v8go"

	"chagnon.dev/budget-server/internal/logging"
)

const (
	MaxScriptBytes    = 64 << 10
	scriptTimeout     = 60 * time.Second
	maxFetchesPerRun  = 10
	maxResponseBytes  = 2 << 20
	maxConcurrentRuns = 2
)

var runSlots = make(chan struct{}, maxConcurrentRuns)

var errFetchBudgetExceeded = fmt.Errorf("a script may fetch at most %d pages per run", maxFetchesPerRun)

func RunJavascript(ctx context.Context, script string) (string, error) {
	if len(script) > MaxScriptBytes {
		return "", fmt.Errorf("script is larger than %d bytes", MaxScriptBytes)
	}

	select {
	case runSlots <- struct{}{}:
		defer func() { <-runSlots }()
	case <-ctx.Done():
		return "", errors.New("too many scripts are running, try again later")
	}

	ctx, cancel := context.WithTimeout(ctx, scriptTimeout)
	defer cancel()

	iso := v8.NewIsolate()
	v8Ctx := v8.NewContext(iso)

	// TerminateExecution must not race Dispose: stop the watchdog before freeing the isolate.
	finished := make(chan struct{})
	var watchdog sync.WaitGroup
	watchdog.Add(1)
	go func() {
		defer watchdog.Done()
		select {
		case <-ctx.Done():
			iso.TerminateExecution()
		case <-finished:
		}
	}()
	defer func() {
		close(finished)
		watchdog.Wait()
		v8Ctx.Close()
		iso.Dispose()
	}()

	fetches := 0
	budget := func() error {
		fetches++
		if fetches > maxFetchesPerRun {
			return errFetchBudgetExceeded
		}
		return nil
	}

	if err := bindFunction(v8Ctx, "httpGet", fetchCallback(ctx, budget, fetchWithLimits)); err != nil {
		return "", fmt.Errorf("binding HttpGet: %s", err)
	}

	if err := bindFunction(v8Ctx, "httpGetWithStealth", fetchCallback(ctx, budget, fetchWithBrowser)); err != nil {
		return "", fmt.Errorf("binding HttpGetWithStealth: %s", err)
	}

	val, err := v8Ctx.RunScript(script, "user.js")
	if ctx.Err() != nil {
		return "", fmt.Errorf("script did not finish within %s", scriptTimeout)
	}
	if err != nil {
		return "", fmt.Errorf("running script: %s", err)
	}

	prom, err := val.AsPromise()
	if err != nil {
		return "", fmt.Errorf("converting to promise: %s", err)
	}

	v8Ctx.PerformMicrotaskCheckpoint() // one drain suffices only while every binding stays synchronous
	if ctx.Err() != nil {
		return "", fmt.Errorf("script did not finish within %s", scriptTimeout)
	}

	switch prom.State() {
	case v8.Fulfilled:
		return prom.Result().String(), nil
	case v8.Rejected:
		return "", fmt.Errorf("script rejected: %s", prom.Result().String())
	default:
		return "", errors.New("script promise never settled")
	}
}

func bindFunction(v8Ctx *v8.Context, name string, function v8.FunctionCallback) error {
	iso := v8Ctx.Isolate()
	tmpl := v8.NewFunctionTemplate(iso, function)
	fn := tmpl.GetFunction(v8Ctx)
	return v8Ctx.Global().Set(name, fn)
}

type fetcher func(ctx context.Context, url string) (string, error)

func fetchCallback(ctx context.Context, budget func() error, fetch fetcher) v8.FunctionCallback {
	return func(info *v8.FunctionCallbackInfo) *v8.Value {
		iso := info.Context().Isolate()
		failure := func(message string) *v8.Value {
			value, _ := v8.NewValue(iso, message)
			return value
		}

		if len(info.Args()) == 0 {
			return failure("A URL is required")
		}
		url := info.Args()[0].String()
		logger := logging.FromContext(ctx).With("url", url)

		if err := budget(); err != nil {
			return failure(err.Error())
		}

		body, err := fetch(ctx, url)
		if errors.Is(err, errDestinationNotAllowed) {
			return failure("Destination not allowed: only public http(s) addresses on ports 80 and 443 can be fetched")
		}
		if err != nil {
			logger.Error("fetching url for script", "error", err)
			return failure("Internal Server Error")
		}

		result, err := v8.NewValue(iso, body)
		if err != nil {
			logger.Error("creating return value", "error", err)
			return failure("Internal Server Error")
		}
		return result
	}
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
