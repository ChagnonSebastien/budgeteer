export function doNothing(..._params: unknown[]) {}

export function notImplemented(..._params: never) {
  throw new Error('Not implemented')
}

export const darkColors = [
  '#CC6619CC', // Deep Orange
  '#7B3B99CC', // Deep Purple
  '#1B8599CC', // Deep Cyan
  '#B33B73CC', // Deep Rose
  '#739926CC', // Deep Lime
  '#CC5B73CC', // Deep Coral
  '#1B7A73CC', // Deep Teal
  '#8B5BBFCC', // Deep Violet
  '#B34D2BCC', // Deep Terra Cotta
  '#BFA673CC', // Rich Beige
  '#992626CC', // Dark Red
  '#3B8B8BCC', // Deep Aqua
  '#737326CC', // Deep Olive
  '#BF704DCC', // Rich Copper
  '#4D4D99CC', // Deep Indigo
  '#CC3B3BCC', // Deep Red
  '#2D995BCC', // Rich Green
  '#CC9B20CC', // Deep Gold
  '#2B5CADCC', // Deep Blue
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
