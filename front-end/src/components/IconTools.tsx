import { createContext, FC, useCallback, useEffect, useMemo, useState } from "react"
import type { IconType } from "react-icons"

type IconLibrary = {[iconName: string]: IconType}
type IconLibraries = Map<string, IconLibrary>

const loadLibrary = async (prefix: string, library: Promise<{default: any} | IconLibrary>) => {
  const {default: d, ...icons} = await library
  return {prefix, icons}
}

type IconTools = {
  iconNameList: string[],
  iconTypeFromName(iconName: string): IconType,
}

export const useIconTools = (): IconTools => {
  const [iconLibraries, setIconLibraries] = useState<IconLibraries>(new Map())

  useEffect(() => {
    const loaders: Promise<{prefix: string, icons: Omit<{default: any} | IconLibrary, "default">}>[] = [
      loadLibrary("Fa", import("react-icons/fa6")),
      loadLibrary("Md", import("react-icons/md")),
      loadLibrary("Bi", import("react-icons/bi")),
      loadLibrary("Bs", import("react-icons/bs")),
      loadLibrary("Tb", import("react-icons/tb")),
      loadLibrary("Gi", import("react-icons/gi")),
      loadLibrary("Gr", import("react-icons/gr")),
    ]

    Promise.all(loaders).then(loadedLibraries => {
      setIconLibraries(loadedLibraries.reduce<IconLibraries>((acc, item) => {
        acc.set(item.prefix, item.icons)
        return acc
      }, new Map()))
    })
  }, [])

  const iconNameList = useMemo(() => {
    if (!iconLibraries) return []

    return [...(iconLibraries?.values() ?? [])]
      .map(library => Object.getOwnPropertyNames(library))
      .reduce((prev, curr) => [...prev, ...curr], [])
      .sort((a, b) => a.length - b.length)
  }, [iconLibraries])

  const iconTypeFromName = useCallback((iconName: string): IconType | undefined => {
    const Library = iconLibraries.get(iconName.slice(0, 2))
    if (typeof Library === "undefined") {
      return undefined
    }
    return Library[iconName as keyof typeof Library]
  }, [iconLibraries])

  const iconTypeFromNameWithFallback = useCallback((iconName: string): IconType => {
    return iconTypeFromName(iconName) ?? iconTypeFromName("GrDocumentMissing") ?? (() => <div/>)
  }, [iconLibraries, iconTypeFromName])

  return {
    iconNameList,
    iconTypeFromName: iconTypeFromNameWithFallback,
  }
}

export const IconToolsContext = createContext<IconTools>({
  iconNameList: [],
  iconTypeFromName(_iconName: string) {
    return () => <div/>
  },
})
