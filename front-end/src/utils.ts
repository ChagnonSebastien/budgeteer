export function doNothing(..._params: unknown[]) {}

export function notImplemented(..._params: never) {
  throw new Error('Not implemented')
}

// Validated on #1F1F1F for contrast and color-blind separation of neighbours; re-run the check before editing.
export const darkColors = [
  '#A76239',
  '#A472AF',
  '#966E1F',
  '#B76C91',
  '#7A7B27',
  '#3493BB',
  '#538548',
  '#877CC3',
  '#1A896C',
  '#6288C7',
  '#AB5B5C',
  '#099AA1',
]

export const darkTheme = {
  textColor: '#ffffff',
  axis: {
    domain: {
      line: {
        stroke: '#777777',
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fill: '#aaaaaa',
      },
    },
    ticks: {
      line: {
        stroke: '#777777',
        strokeWidth: 1,
      },
      text: {
        fill: '#ffffff',
      },
    },
  },
  grid: {
    line: {
      stroke: '#444444',
    },
  },
  legends: {
    text: {
      fill: '#ffffff',
    },
  },
  tooltip: {
    container: {
      background: '#333333',
      color: '#ffffff',
    },
  },
}
