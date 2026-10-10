export function doNothing(..._params: unknown[]) {}

export function notImplemented(..._params: never) {
  throw new Error('Not implemented')
}

// Validated on #0E1014 for contrast and color-blind separation of neighbours; re-run the check before editing.
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
  text: {
    fill: 'rgba(244, 245, 247, 0.85)',
    fontFamily: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
  },
  axis: {
    domain: {
      line: {
        stroke: 'rgba(255, 255, 255, 0.18)',
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fill: 'rgba(244, 245, 247, 0.68)',
      },
    },
    ticks: {
      line: {
        stroke: 'rgba(255, 255, 255, 0.18)',
        strokeWidth: 1,
      },
      text: {
        fill: 'rgba(244, 245, 247, 0.6)',
      },
    },
  },
  grid: {
    line: {
      stroke: 'rgba(255, 255, 255, 0.06)',
    },
  },
  legends: {
    text: {
      fill: 'rgba(244, 245, 247, 0.85)',
    },
  },
  tooltip: {
    container: {
      background: '#1A1D25',
      color: '#F4F5F7',
      borderRadius: '0.75rem',
    },
  },
}
