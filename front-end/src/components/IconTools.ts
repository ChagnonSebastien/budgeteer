import type { IconType } from "react-icons"
import * as FaIcons from "react-icons/fa6"
import * as GiIcons from "react-icons/gi"
import * as MdIcons from "react-icons/md"

type IconLibrary = Record<string, IconType>

class IconLibraryWrapper<T extends IconLibrary> {
  constructor(private IconLib: T) {
  }

  getIconType(iconName: string): IconType {
    return this.IconLib[iconName as keyof typeof this.IconLib]
  }
}

const IconLibraryWrappers: {prefix: string, wrapper: IconLibraryWrapper<IconLibrary>, library: IconLibrary}[] = [
  {prefix: "Fa", wrapper: new IconLibraryWrapper<typeof FaIcons>(FaIcons), library: FaIcons},
  {prefix: "Md", wrapper: new IconLibraryWrapper<typeof MdIcons>(MdIcons), library: MdIcons},
  {prefix: "Gi", wrapper: new IconLibraryWrapper<typeof GiIcons>(GiIcons), library: GiIcons},
]
export const iconTools = IconLibraryWrappers.map(({library}) => Object.getOwnPropertyNames(library)).reduce((prev, curr) => [...prev, ...curr], [])

export const iconComponentTypeFromName = (iconName: string): IconType => {
  return IconLibraryWrappers.filter(({prefix}) => iconName.startsWith(prefix))[0].wrapper.getIconType(iconName)
}
