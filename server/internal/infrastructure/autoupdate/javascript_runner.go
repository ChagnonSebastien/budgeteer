package autoupdate

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"chagnon.dev/budget-server/internal/logging"
	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/stealth"
	v8 "rogchap.com/v8go"
)

func RunJavascript(ctx context.Context, script string) (string, error) {
	iso := v8.NewIsolate()
	v8Ctx := v8.NewContext(iso)

	if err := bindFunction(v8Ctx, "httpGet", httpGetCallback(ctx)); err != nil {
		return "", fmt.Errorf("binding HttpGet: %s", err)
	}

	if err := bindFunction(v8Ctx, "httpGetWithStealth", httpGetWithStealthCallback(ctx)); err != nil {
		return "", fmt.Errorf("binding HttpGetWithStealth: %s", err)
	}

	val, err := v8Ctx.RunScript(script, "user.js")
	if err != nil {
		return "", fmt.Errorf("running script: %s", err)
	}

	prom, err := val.AsPromise()
	if err != nil {
		return "", fmt.Errorf("converting to promise: %s", err)
	}

	for prom.State() == v8.Pending {
		continue
	}

	return prom.Result().String(), nil
}

func bindFunction(v8Ctx *v8.Context, name string, function v8.FunctionCallback) error {
	iso := v8Ctx.Isolate()
	tmpl := v8.NewFunctionTemplate(iso, function)
	fn := tmpl.GetFunction(v8Ctx)
	return v8Ctx.Global().Set(name, fn)
}

func httpGetCallback(ctx context.Context) v8.FunctionCallback {
	return func(info *v8.FunctionCallbackInfo) *v8.Value {
		urlVal := info.Args()[0]
		url := urlVal.String()

		logger := logging.FromContext(ctx).With("url", url)

		iso := info.Context().Isolate()
		internalServerErrorMessage, _ := v8.NewValue(iso, "Internal Server Error")

		resp, err := http.Get(url)
		if err != nil {
			logger.Error("calling http get", "error", err)
			return internalServerErrorMessage
		}
		defer func() {
			err := resp.Body.Close()
			if err != nil {
				logger.Error("closing response body", "error", err)
			}
		}()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			logger.Error("reading response body", "error", err)
			return internalServerErrorMessage
		}

		result, err := v8.NewValue(iso, string(body))
		if err != nil {
			logger.Error("creating return value", "error", err)
			return internalServerErrorMessage
		}

		return result
	}
}

func httpGetWithStealthCallback(ctx context.Context) v8.FunctionCallback {
	return func(info *v8.FunctionCallbackInfo) *v8.Value {
		urlVal := info.Args()[0]
		url := urlVal.String()

		logger := logging.FromContext(ctx).With("url", url)

		iso := info.Context().Isolate()
		internalServerErrorMessage, _ := v8.NewValue(iso, "Internal Server Error")

		controlUrl, err := launcher.New().Bin("chromium").Headless(true).Launch()
		if err != nil {
			logger.Error("launching chromium", "error", err)
			return internalServerErrorMessage
		}

		browser := rod.New().ControlURL(controlUrl)
		err = browser.Connect()
		if err != nil {
			logger.Error("connecting to the browser", "error", err)
			return internalServerErrorMessage
		}
		defer func(browser *rod.Browser) {
			err := browser.Close()
			if err != nil {
				logger.Error("closing browser", "error", err)
			}
		}(browser)

		page, err := stealth.Page(browser)
		if err != nil {
			logger.Error("creating page", "error", err)
			return internalServerErrorMessage
		}

		err = page.Navigate(url)
		if err != nil {
			logger.Error("navigating to page", "error", err)
			return internalServerErrorMessage
		}

		err = page.WaitLoad()
		if err != nil {
			logger.Error("waiting for page to load", "error", err)
			return internalServerErrorMessage
		}

		preElement, err := page.Element("pre")
		if err != nil {
			logger.Error("getting pre element", "error", err)
			return internalServerErrorMessage
		}

		body, err := preElement.Text()
		if err != nil {
			logger.Error("converting pre element to text", "error", err)
			return internalServerErrorMessage
		}

		result, err := v8.NewValue(iso, body)
		if err != nil {
			logger.Error("creating return value", "error", err)
			return internalServerErrorMessage
		}

		return result
	}
}
