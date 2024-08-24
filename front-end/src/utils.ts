export function doNothing(..._params: never) {}

export function notImplemented(..._params: never) {
  throw new Error('Not implemented')
}
