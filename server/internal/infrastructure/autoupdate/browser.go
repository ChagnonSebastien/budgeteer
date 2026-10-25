package autoupdate

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"net/url"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
	"github.com/go-rod/stealth"
)

var errStealthUnavailable = errors.New("httpGetWithStealth is not available: this server has no browser configured")

type remoteBrowser struct {
	host string
}

func newRemoteBrowser(controlURL string) (*remoteBrowser, error) {
	if controlURL == "" {
		return nil, nil
	}
	parsed, err := url.Parse(controlURL)
	if err != nil || parsed.Scheme != "http" || parsed.Port() == "" {
		return nil, fmt.Errorf("browser url %q must look like http://host:port", controlURL)
	}
	return &remoteBrowser{host: parsed.Host}, nil
}

func (b *remoteBrowser) fetch(ctx context.Context, rawURL string) (string, error) {
	if b == nil {
		return "", errStealthUnavailable
	}
	parsed, err := checkScriptURL(rawURL)
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel() // also closes the DevTools connection

	local, browserAddr, err := b.route(ctx)
	if err != nil {
		return "", err
	}

	proxyAddr, stopProxy, err := startEgressProxy(ctx, local, browserAddr.Addr())
	if err != nil {
		return "", err
	}
	defer stopProxy()

	wsURL, err := devToolsURL(ctx, browserAddr)
	if err != nil {
		return "", err
	}
	browser := rod.New().Context(ctx).ControlURL(wsURL)
	if err := browser.Connect(); err != nil {
		return "", fmt.Errorf("connecting to the browser: %w", err)
	}

	// Chromium skips the proxy for loopback unless told otherwise.
	browserContext, err := proto.TargetCreateBrowserContext{
		ProxyServer:     "http://" + proxyAddr,
		ProxyBypassList: "<-loopback>",
		DisposeOnDetach: true,
	}.Call(browser)
	if err != nil {
		return "", fmt.Errorf("creating a browser context: %w", err)
	}
	browser.BrowserContextID = browserContext.BrowserContextID
	defer func() { _ = browser.Close() }() // with the context id set, Close disposes the context, not the shared browser

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

func (b *remoteBrowser) route(ctx context.Context) (netip.Addr, netip.AddrPort, error) {
	conn, err := (&net.Dialer{}).DialContext(ctx, "tcp", b.host)
	if err != nil {
		return netip.Addr{}, netip.AddrPort{}, fmt.Errorf("reaching the browser: %w", err)
	}
	defer func() { _ = conn.Close() }()

	local := conn.LocalAddr().(*net.TCPAddr).AddrPort()
	remote := conn.RemoteAddr().(*net.TCPAddr).AddrPort()
	return local.Addr().Unmap(), netip.AddrPortFrom(remote.Addr().Unmap(), remote.Port()), nil
}

func devToolsURL(ctx context.Context, browserAddr netip.AddrPort) (string, error) {
	// DevTools rejects a Host header that is a hostname.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+browserAddr.String()+"/json/version", nil)
	if err != nil {
		return "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("asking the browser for its DevTools url: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	var version struct {
		WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&version); err != nil {
		return "", fmt.Errorf("reading the browser's DevTools url: %w", err)
	}
	wsURL, err := url.Parse(version.WebSocketDebuggerURL)
	if err != nil || wsURL.Path == "" {
		return "", fmt.Errorf("browser returned an invalid DevTools url %q", version.WebSocketDebuggerURL)
	}
	wsURL.Host = browserAddr.String()
	return wsURL.String(), nil
}
