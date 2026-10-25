#!/bin/bash

# Chromium ignores --remote-debugging-address and only listens on loopback.
socat TCP-LISTEN:9222,fork,reuseaddr TCP:127.0.0.1:9223 &

chromium \
  --headless \
  --no-sandbox \
  --remote-debugging-port=9223 \
  --user-data-dir=/tmp/chromium \
  --force-webrtc-ip-handling-policy=disable_non_proxied_udp \
  --no-first-run \
  --no-startup-window \
  --disable-features=site-per-process,TranslateUI \
  --disable-dev-shm-usage \
  --disable-background-networking \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-breakpad \
  --disable-client-side-phishing-detection \
  --disable-component-extensions-with-background-pages \
  --disable-default-apps \
  --disable-hang-monitor \
  --disable-ipc-flooding-protection \
  --disable-popup-blocking \
  --disable-prompt-on-repost \
  --disable-renderer-backgrounding \
  --disable-sync \
  --disable-site-isolation-trials \
  --enable-automation \
  --enable-features=NetworkService,NetworkServiceInProcess \
  --force-color-profile=srgb \
  --metrics-recording-only \
  --use-mock-keychain &

wait -n
exit 1
