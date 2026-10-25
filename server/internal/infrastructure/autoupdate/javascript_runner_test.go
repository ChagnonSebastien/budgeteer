package autoupdate

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"
)

func TestMain(m *testing.M) {
	if IsScriptHost() {
		ServeScriptHost()
	}
	os.Exit(m.Run())
}

func runWithin(t *testing.T, timeout time.Duration, script string) (string, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	start := time.Now()
	result, err := RunJavascript(ctx, script)
	if elapsed := time.Since(start); elapsed > timeout+2*time.Second {
		t.Fatalf("script ran for %s, past its %s deadline", elapsed, timeout)
	}
	return result, err
}

func TestRunJavascriptReturnsFulfilledValue(t *testing.T) {
	result, err := runWithin(t, 5*time.Second, `(async () => "1.37")()`)
	if err != nil || result != "1.37" {
		t.Fatalf("got %q, %v", result, err)
	}
}

func TestRunJavascriptReportsRejection(t *testing.T) {
	_, err := runWithin(t, 5*time.Second, `(async () => { throw new Error("boom") })()`)
	if err == nil || !strings.Contains(err.Error(), "boom") {
		t.Fatalf("expected rejection error, got %v", err)
	}
}

func TestRunJavascriptFailsOnNeverSettlingPromise(t *testing.T) {
	_, err := runWithin(t, 5*time.Second, `new Promise(() => {})`)
	if err == nil || !strings.Contains(err.Error(), "never settled") {
		t.Fatalf("expected never settled error, got %v", err)
	}
}

func TestRunJavascriptTerminatesInfiniteLoop(t *testing.T) {
	_, err := runWithin(t, time.Second, `(async () => { while (true) {} })()`)
	if err == nil || !strings.Contains(err.Error(), "did not finish") {
		t.Fatalf("expected timeout error, got %v", err)
	}
}

func TestRunJavascriptRejectsOversizedScript(t *testing.T) {
	_, err := runWithin(t, time.Second, strings.Repeat(" ", MaxScriptBytes+1))
	if err == nil {
		t.Fatal("expected size error")
	}
}

func TestHttpGetBlocksInternalDestinations(t *testing.T) {
	for _, target := range []string{
		"http://127.0.0.1/",
		"http://169.254.169.254/latest/meta-data/",
		"file:///etc/passwd",
		"http://localhost:5432/",
	} {
		result, err := runWithin(t, 10*time.Second, `(async () => httpGet("`+target+`"))()`)
		if err != nil || !strings.HasPrefix(result, "Destination not allowed") {
			t.Errorf("%s: expected blocked, got %q, %v", target, result, err)
		}
	}
}

func TestHttpGetEnforcesFetchBudget(t *testing.T) {
	script := fmt.Sprintf(`(async () => {
		let last = "";
		for (let i = 0; i <= %d; i++) { last = httpGet("http://127.0.0.1/") }
		return last;
	})()`, maxFetchesPerRun)
	result, err := runWithin(t, 10*time.Second, script)
	if err != nil || !strings.Contains(result, "at most") {
		t.Fatalf("expected budget message, got %q, %v", result, err)
	}
}

func TestRunJavascriptSurvivesAMemoryBomb(t *testing.T) {
	for name, script := range map[string]string{
		"heap":         `(async () => { const a = []; while (true) a.push(new Array(1e6).fill(1)) })()`,
		"array buffer": `(async () => { const a = []; while (true) a.push(new Uint8Array(64 << 20).fill(1)) })()`,
	} {
		_, err := runWithin(t, 30*time.Second, script)
		if err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}

	result, err := runWithin(t, 5*time.Second, `(async () => "still alive")()`)
	if err != nil || result != "still alive" {
		t.Fatalf("got %q, %v", result, err)
	}
}

func TestRunJavascriptCapsOutput(t *testing.T) {
	_, err := runWithin(t, 10*time.Second, fmt.Sprintf(`(async () => "x".repeat(%d))()`, maxHostOutputBytes))
	if err == nil || !strings.Contains(err.Error(), "output") {
		t.Fatalf("expected output error, got %v", err)
	}
}
