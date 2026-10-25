package autoupdate

import (
	"errors"
	"testing"
)

func TestCheckDialAddress(t *testing.T) {
	cases := map[string]bool{
		"8.8.8.8:443":            true,
		"[2606:4700::1111]:443":  true,
		"1.1.1.1:80":             true,
		"1.1.1.1:5432":           false,
		"127.0.0.1:443":          false,
		"10.0.0.5:443":           false,
		"172.17.0.2:80":          false,
		"192.168.1.1:443":        false,
		"169.254.169.254:80":     false,
		"100.100.100.200:80":     false,
		"0.0.0.0:80":             false,
		"[::1]:443":              false,
		"[fd00::1]:443":          false,
		"[fe80::1]:443":          false,
		"[::ffff:127.0.0.1]:443": false,
		"[64:ff9b::a00:1]:443":   false,
		"[2001:0:4136:e378:8000:63bf:3fff:fdd2]:443": false,
		"[2002:a00:1::1]:443":                        false,
		"not-an-address":                             false,
		"example.com:443":                            false,
	}

	for address, allowed := range cases {
		err := checkDialAddress("tcp", address, nil)
		if allowed && err != nil {
			t.Errorf("%s: expected allowed, got %v", address, err)
		}
		if !allowed && !errors.Is(err, errDestinationNotAllowed) {
			t.Errorf("%s: expected blocked, got %v", address, err)
		}
	}
}

func TestCheckScriptURL(t *testing.T) {
	cases := map[string]bool{
		"https://api.example.com/rate": true,
		"http://example.com":           true,
		"file:///proc/self/environ":    false,
		"data:text/html,<pre>1</pre>":  false,
		"chrome://version":             false,
		"javascript:alert(1)":          false,
		"ftp://example.com/rate":       false,
		"https:///no-host":             false,
	}

	for raw, allowed := range cases {
		_, err := checkScriptURL(raw)
		if allowed != (err == nil) {
			t.Errorf("%s: allowed=%v, got err %v", raw, allowed, err)
		}
	}
}
