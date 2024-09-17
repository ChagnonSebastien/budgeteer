export function doNothing(..._params: unknown[]) {}

export function notImplemented(..._params: never) {
  throw new Error('Not implemented')
}

export const darkColors = [
  '#26D9D9AA', // Cyan
  '#D98F26AA', // Dark Orange
  '#D92626AA', // Red
  '#4A26D9AA', // Indigo
  '#D9C726AA', // Yellow
  '#D926C7AA', // Magenta
  '#266DD9AA', // Azure
  '#D95C26AA', // Reddish Orange
  '#26A3D9AA', // Sky Blue
  '#D9265DAA', // Crimson
  '#4AD926AA', // Lime Green
  '#B526D9AA', // Purple
  '#D99126AA', // Orange
  '#2638D9AA', // Blue
  '#D92692AA', // Pink
  '#26D96FAA', // Turquoise
  '#7F26D9AA', // Violet
  '#A85F26AA', // Brown
  '#B5D926AA', // Yellow-Green
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
