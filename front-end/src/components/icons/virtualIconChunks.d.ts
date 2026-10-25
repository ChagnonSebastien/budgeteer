declare module 'virtual:icon-chunks' {
  import type { IconType } from 'react-icons'

  export function loadIcon(iconName: string): Promise<IconType | undefined>
  export function loadIconNames(): Promise<string[]>
}
