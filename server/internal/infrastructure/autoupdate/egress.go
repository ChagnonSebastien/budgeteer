package autoupdate

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/netip"
	"net/url"
	"strconv"
	"syscall"
	"time"
)

var errDestinationNotAllowed = errors.New("destination not allowed")

var allowedPorts = map[int]bool{80: true, 443: true}

// Ranges that pass netip's IsGlobalUnicast/IsPrivate checks but still reach non-public hosts.
var blockedPrefixes = []netip.Prefix{
	netip.MustParsePrefix("0.0.0.0/8"),
	netip.MustParsePrefix("100.64.0.0/10"),
	netip.MustParsePrefix("192.0.0.0/24"),
	netip.MustParsePrefix("198.18.0.0/15"),
	netip.MustParsePrefix("240.0.0.0/4"),
	netip.MustParsePrefix("64:ff9b::/96"),
	netip.MustParsePrefix("64:ff9b:1::/48"),
	netip.MustParsePrefix("2001::/32"),
	netip.MustParsePrefix("2002::/16"),
}

func isPublicAddress(addr netip.Addr) bool {
	addr = addr.Unmap()
	if !addr.IsGlobalUnicast() || addr.IsPrivate() {
		return false
	}
	for _, prefix := range blockedPrefixes {
		if prefix.Contains(addr) {
			return false
		}
	}
	return true
}

func checkDialAddress(_, address string, _ syscall.RawConn) error {
	host, portText, err := net.SplitHostPort(address)
	if err != nil {
		return errDestinationNotAllowed
	}
	port, err := strconv.Atoi(portText)
	if err != nil || !allowedPorts[port] {
		return errDestinationNotAllowed
	}
	addr, err := netip.ParseAddr(host)
	if err != nil || !isPublicAddress(addr) {
		return errDestinationNotAllowed
	}
	return nil
}

// Control runs on the resolved IP of every connection, so DNS rebinding and redirects are covered too.
var egressDialer = &net.Dialer{
	Timeout: 10 * time.Second,
	Control: checkDialAddress,
}

func newEgressTransport() *http.Transport {
	return &http.Transport{
		Proxy:                  nil,
		DialContext:            egressDialer.DialContext,
		TLSHandshakeTimeout:    10 * time.Second,
		ResponseHeaderTimeout:  15 * time.Second,
		MaxResponseHeaderBytes: 64 << 10,
		MaxIdleConns:           -1,
		DisableKeepAlives:      true,
	}
}

func checkScriptURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return nil, errDestinationNotAllowed
	}
	return parsed, nil
}

var egressClient = &http.Client{
	Transport: newEgressTransport(),
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return errors.New("too many redirects")
		}
		_, err := checkScriptURL(req.URL.String())
		return err
	},
}

func fetchWithLimits(ctx context.Context, rawURL string) (string, error) {
	parsed, err := checkScriptURL(rawURL)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return "", fmt.Errorf("building request: %w", err)
	}

	resp, err := egressClient.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes+1))
	if err != nil {
		return "", fmt.Errorf("reading response body: %w", err)
	}
	if len(body) > maxResponseBytes {
		return "", errors.New("response too large")
	}
	return string(body), nil
}

// egressProxy is the only network path Chromium gets, so page scripts and redirects are held to the same rules as httpGet.
type egressProxy struct {
	forward *httputil.ReverseProxy
}

func newEgressProxy() *egressProxy {
	return &egressProxy{
		forward: &httputil.ReverseProxy{
			Rewrite:   func(*httputil.ProxyRequest) {},
			Transport: newEgressTransport(),
		},
	}
}

func (p *egressProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		p.tunnel(w, r)
		return
	}
	if r.URL.Scheme != "http" || r.URL.Host == "" {
		http.Error(w, errDestinationNotAllowed.Error(), http.StatusForbidden)
		return
	}
	p.forward.ServeHTTP(w, r)
}

func (p *egressProxy) tunnel(w http.ResponseWriter, r *http.Request) {
	upstream, err := egressDialer.DialContext(r.Context(), "tcp", r.Host)
	if err != nil {
		http.Error(w, errDestinationNotAllowed.Error(), http.StatusForbidden)
		return
	}
	defer func() { _ = upstream.Close() }()

	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "tunnelling not supported", http.StatusInternalServerError)
		return
	}
	client, buffered, err := hijacker.Hijack()
	if err != nil {
		return
	}
	defer func() { _ = client.Close() }()

	if _, err := client.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n")); err != nil {
		return
	}

	done := make(chan struct{}, 2)
	go func() {
		_, _ = io.Copy(upstream, buffered)
		done <- struct{}{}
	}()
	go func() {
		_, _ = io.Copy(client, upstream)
		done <- struct{}{}
	}()

	select {
	case <-done:
	case <-r.Context().Done():
	}
}

func startEgressProxy(ctx context.Context) (string, func(), error) {
	listener, err := (&net.ListenConfig{}).Listen(ctx, "tcp", "127.0.0.1:0")
	if err != nil {
		return "", nil, fmt.Errorf("listening for egress proxy: %w", err)
	}

	server := &http.Server{
		Handler:           newEgressProxy(),
		ReadHeaderTimeout: 10 * time.Second,
		BaseContext:       func(net.Listener) context.Context { return ctx },
	}
	go func() { _ = server.Serve(listener) }()

	return listener.Addr().String(), func() { _ = server.Close() }, nil
}
