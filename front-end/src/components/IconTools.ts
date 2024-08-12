import type { IconType } from "react-icons"
import * as BiIcons from "react-icons/bi"
import * as BsIcons from "react-icons/bs"
import * as FaIcons from "react-icons/fa6"
import * as GiIcons from "react-icons/gi"
import * as MdIcons from "react-icons/md"
import * as TbIcons from "react-icons/tb"

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
  {prefix: "Bi", wrapper: new IconLibraryWrapper<typeof BiIcons>(BiIcons), library: BiIcons},
  {prefix: "Tb", wrapper: new IconLibraryWrapper<typeof TbIcons>(TbIcons), library: TbIcons},
  {prefix: "Bs", wrapper: new IconLibraryWrapper<typeof BsIcons>(BsIcons), library: BsIcons},
]
export const iconList = IconLibraryWrappers.map(({library}) => Object.getOwnPropertyNames(library)).reduce((prev, curr) => [...prev, ...curr], []).sort((a, b) => a.length - b.length)

export const iconComponentTypeFromName = (iconName: string): IconType => {
  return IconLibraryWrappers.filter(({prefix}) => iconName.startsWith(prefix))[0].wrapper.getIconType(iconName)
}
