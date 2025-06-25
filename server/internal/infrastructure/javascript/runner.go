package javascript

import (
	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/stealth"
	"io/ioutil"
	"log"
	"net/http"
	v8 "rogchap.com/v8go"
)

func Runner(script string) (string, error) {
	iso := v8.NewIsolate()
	ctx := v8.NewContext(iso)
	if err := bindHTTPGet(ctx); err != nil {
		log.Printf("bindingHttpGet: %s", err)
		return "", err
	}
	if err := bindHTTPGetWithStealth(ctx); err != nil {
		log.Printf("bindingHttpGetWithStealth: %s", err)
		return "", err
	}

	val, err := ctx.RunScript(script, "user.js")
	if err != nil {
		log.Printf("error running script: %s", err)
		return "", err
	}

	prom, err := val.AsPromise()
	if err != nil {
		log.Printf("error converting to promise: %s", err)
		return "", err
	}
	for prom.State() == v8.Pending {
		continue
	}

	return prom.Result().String(), nil
}

func bindHTTPGet(ctx *v8.Context) error {
	iso := ctx.Isolate()
	tmpl := v8.NewFunctionTemplate(iso, httpGetCallback)
	fn := tmpl.GetFunction(ctx)
	return ctx.Global().Set("httpGet", fn)
}

func bindHTTPGetWithStealth(ctx *v8.Context) error {
	iso := ctx.Isolate()
	tmpl := v8.NewFunctionTemplate(iso, httpGetWithStealthCallback)
	fn := tmpl.GetFunction(ctx)
	return ctx.Global().Set("httpGetWithStealth", fn)
}

func httpGetCallback(info *v8.FunctionCallbackInfo) *v8.Value {
	// Extract URL argument from JS
	urlVal := info.Args()[0]
	urlStr := urlVal.String()
	// Perform HTTP GET
	resp, err := http.Get(urlStr)
	if err != nil {
		// Return JS rejection string or throw
		iso := info.Context().Isolate()
		val, _ := v8.NewValue(iso, "")
		return val
	}
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)

	// Return HTML string back to JS
	iso := info.Context().Isolate()
	result, _ := v8.NewValue(iso, string(body))
	return result
}

func httpGetWithStealthCallback(info *v8.FunctionCallbackInfo) *v8.Value {
	// Extract URL argument from JS
	urlVal := info.Args()[0]
	urlStr := urlVal.String()
	// Perform HTTP GET
	body, err := fetchWithStealth(urlStr)
	if err != nil {
		// Return JS rejection string or throw
		log.Printf("Error while fetching with chromedp: %s", err)
		iso := info.Context().Isolate()
		val, _ := v8.NewValue(iso, "")
		return val
	}

	// Return HTML string back to JS
	iso := info.Context().Isolate()
	result, _ := v8.NewValue(iso, string(body))
	return result
}

func fetchWithStealth(url string) (string, error) {
	// Download a compatible Chromium if you don’t have one
	ws := launcher.New().
		Bin("chromium").
		Headless(true).
		MustLaunch()

	browser := rod.New().ControlURL(ws).MustConnect()
	defer browser.MustClose()

	page := stealth.MustPage(browser)

	// give Cloudflare a moment to settle
	page = page.MustNavigate(url)
	page.MustWaitLoad()

	// grab your JSON
	return page.MustElement("pre").MustText(), nil
}
