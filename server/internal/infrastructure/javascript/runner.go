package javascript

import (
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
	log.Printf(prom.Result().String())

	return prom.Result().String(), nil
}

func bindHTTPGet(ctx *v8.Context) error {
	iso := ctx.Isolate()
	tmpl := v8.NewFunctionTemplate(iso, httpGetCallback)
	fn := tmpl.GetFunction(ctx)
	return ctx.Global().Set("httpGet", fn)
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
