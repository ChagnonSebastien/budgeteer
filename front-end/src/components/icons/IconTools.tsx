import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { IconType } from 'react-icons'

type IconLibrary = { [iconName: string]: IconType }
type IconLibraries = Map<string, IconLibrary>

export enum PreparedIcon {
  FaPlus = 'FaPlus',
  FaMinus = 'FaMinus',
  FaQuestion = 'FaQuestion',
  MdOutput = 'MdOutput',
  MdInput = 'MdInput',
  TbTrendingDown = 'TbTrendingDown',
  FaChartPie = 'FaChartPie',
  MdCancel = 'MdCancel',
  MdKeyboardBackspace = 'MdKeyboardBackspace',
  MdMenu = 'MdMenu',
  FaRegSquare = 'FaRegSquare',
  FaRegSquareCheck = 'FaRegSquareCheck',
  FaScaleUnbalanced = 'FaScaleUnbalanced',
  TbArrowsExchange = 'TbArrowsExchange',
  MdCategory = 'MdCategory',
  MdAccountBalance = 'MdAccountBalance',
  MdCurrencyExchange = 'MdCurrencyExchange',
  TbFileText = 'TbFileText',
  MdArrowForwardIos = 'MdArrowForwardIos',
  TbSearch = 'TbSearch',
  MdVisibility = 'MdVisibility',
  MdVisibilityOff = 'MdVisibilityOff',
  MdSettings = 'MdSettings',
  MdEdit = 'MdEdit',
  MdLogout = 'MdLogout',
  TbLayoutSidebarLeftCollapse = 'TbLayoutSidebarLeftCollapse',
  TbLayoutSidebarLeftExpand = 'TbLayoutSidebarLeftExpand',
  MdDelete = 'MdDelete',
  MdList = 'MdList',
  MdGroups = 'MdGroups',
  MdCalendarToday = 'MdCalendarToday',
  TbChartSankey = 'TbChartSankey',
  TbLayoutDashboardFilled = 'TbLayoutDashboardFilled',
  TbCirclePlus = 'TbCirclePlus',
  TbCircleMinus = 'TbCircleMinus',
  MdCheckCircle = 'MdCheckCircle',
  TbLayoutDashboard = 'TbLayoutDashboard',
  TbCategory = 'TbCategory',
  TbBuildingBank = 'TbBuildingBank',
  TbCoins = 'TbCoins',
  TbScale = 'TbScale',
  TbGauge = 'TbGauge',
  TbChartBar = 'TbChartBar',
  TbReportMoney = 'TbReportMoney',
  TbTrendingUp = 'TbTrendingUp',
  TbUsersGroup = 'TbUsersGroup',
  TbUserShield = 'TbUserShield',
  TbPigMoney = 'TbPigMoney',
  TbPresentation = 'TbPresentation',
  FaFileImport = 'FaFileImport',
  MdUndo = 'MdUndo',
  TbLockOpen = 'TbLockOpen',
}

type PreparedIconLib = {
  [iconName in PreparedIcon]: IconType
}

function generatePreparedIcons(fetcher: (iconName: string) => IconType): PreparedIconLib {
  return Object.values(PreparedIcon)
    .map((name) => ({ [name]: fetcher(name as string) }))
    .reduce((lib, icon) => ({ ...lib, ...icon }), {}) as unknown as PreparedIconLib
}

const loadLibrary = async (prefix: string, library: Promise<{ default: unknown } | IconLibrary>) => {
  const { default: d, ...icons } = await library
  return { prefix, icons }
}

type IconTools = {
  IconLib: PreparedIconLib
  iconNameList: string[]
  iconTypeFromName(iconName: string): IconType
}

export const useIconTools = (): IconTools => {
  const [iconLibraries, setIconLibraries] = useState<IconLibraries>(new Map())

  useEffect(() => {
    const loaders: Promise<{ prefix: string; icons: Omit<{ default: unknown } | IconLibrary, 'default'> }>[] = [
      loadLibrary('Fa', import('react-icons/fa6')),
      loadLibrary('Md', import('react-icons/md')),
      loadLibrary('Tb', import('react-icons/tb')),
      loadLibrary('Gi', import('react-icons/gi')),
    ]

    Promise.all(loaders).then((loadedLibraries) => {
      setIconLibraries(
        loadedLibraries.reduce<IconLibraries>((acc, item) => {
          acc.set(item.prefix, item.icons)
          return acc
        }, new Map()),
      )
    })
  }, [])

  const iconNameList = useMemo(() => {
    if (!iconLibraries) return []

    return [...(iconLibraries?.values() ?? [])]
      .map((library) => Object.getOwnPropertyNames(library))
      .reduce((prev, curr) => [...prev, ...curr], [])
      .sort((a, b) => a.length - b.length)
  }, [iconLibraries])

  const iconTypeFromName = useCallback(
    (iconName: string): IconType | undefined => {
      const Library = iconLibraries.get(iconName.slice(0, 2))
      if (typeof Library === 'undefined') {
        return undefined
      }
      return Library[iconName as keyof typeof Library]
    },
    [iconLibraries],
  )

  const iconTypeFromNameWithFallback = useCallback(
    (iconName: string): IconType => {
      return iconTypeFromName(iconName) ?? iconTypeFromName('TbFileUnknown') ?? (() => <div />)
    },
    [iconLibraries, iconTypeFromName],
  )

  const IconLib = useMemo(() => {
    return generatePreparedIcons(iconTypeFromNameWithFallback)
  }, [iconTypeFromNameWithFallback])

  return {
    IconLib,
    iconNameList,
    iconTypeFromName: iconTypeFromNameWithFallback,
  }
}

export const IconToolsContext = createContext<IconTools>({
  iconNameList: [],
  iconTypeFromName(_iconName: string) {
    return () => <div />
  },
  IconLib: generatePreparedIcons((_iconName) => () => <div />),
})
