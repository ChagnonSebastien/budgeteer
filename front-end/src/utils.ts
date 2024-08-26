export function doNothing(..._params: unknown[]) {}

export function notImplemented(..._params: never) {
  throw new Error('Not implemented')
}
