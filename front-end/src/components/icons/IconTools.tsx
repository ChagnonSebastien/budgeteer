import { createContext, useEffect, useState } from 'react'
import type { IconBaseProps, IconType } from 'react-icons'
import {
  FaChartPie,
  FaFileImport,
  FaMinus,
  FaPlus,
  FaQuestion,
  FaRegSquare,
  FaRegSquareCheck,
  FaScaleUnbalanced,
} from 'react-icons/fa6'
import {
  MdAccountBalance,
  MdArrowForwardIos,
  MdCalendarToday,
  MdCancel,
  MdCategory,
  MdCheckCircle,
  MdCurrencyExchange,
  MdDelete,
  MdEdit,
  MdGroups,
  MdInput,
  MdKeyboardBackspace,
  MdList,
  MdLogout,
  MdMenu,
  MdOutput,
  MdSettings,
  MdUndo,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md'
import {
  TbArrowsExchange,
  TbBuildingBank,
  TbCategory,
  TbChartBar,
  TbChartSankey,
  TbCircleMinus,
  TbCirclePlus,
  TbCoins,
  TbFileText,
  TbFileUnknown,
  TbGauge,
  TbLayoutDashboard,
  TbLayoutDashboardFilled,
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLockOpen,
  TbPigMoney,
  TbPresentation,
  TbReportMoney,
  TbScale,
  TbSearch,
  TbTrendingDown,
  TbTrendingUp,
  TbUserShield,
  TbUsersGroup,
} from 'react-icons/tb'
import { loadIcon, loadIconNames } from 'virtual:icon-chunks'

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

const IconLib: PreparedIconLib = {
  FaPlus,
  FaMinus,
  FaQuestion,
  MdOutput,
  MdInput,
  TbTrendingDown,
  FaChartPie,
  MdCancel,
  MdKeyboardBackspace,
  MdMenu,
  FaRegSquare,
  FaRegSquareCheck,
  FaScaleUnbalanced,
  TbArrowsExchange,
  MdCategory,
  MdAccountBalance,
  MdCurrencyExchange,
  TbFileText,
  MdArrowForwardIos,
  TbSearch,
  MdVisibility,
  MdVisibilityOff,
  MdSettings,
  MdEdit,
  MdLogout,
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  MdDelete,
  MdList,
  MdGroups,
  MdCalendarToday,
  TbChartSankey,
  TbLayoutDashboardFilled,
  TbCirclePlus,
  TbCircleMinus,
  MdCheckCircle,
  TbLayoutDashboard,
  TbCategory,
  TbBuildingBank,
  TbCoins,
  TbScale,
  TbGauge,
  TbChartBar,
  TbReportMoney,
  TbTrendingUp,
  TbUsersGroup,
  TbUserShield,
  TbPigMoney,
  TbPresentation,
  FaFileImport,
  MdUndo,
  TbLockOpen,
}

const loadedIcons = new Map<string, IconType>(Object.entries(IconLib))
const lazyIcons = new Map<string, IconType>()

const lazyIcon = (iconName: string): IconType => {
  const LazyIcon = (props: IconBaseProps) => {
    const [Icon, setIcon] = useState(() => loadedIcons.get(iconName))

    useEffect(() => {
      if (Icon) return
      let cancelled = false
      loadIcon(iconName).then(
        (loaded) => {
          const resolved = loaded ?? TbFileUnknown
          loadedIcons.set(iconName, resolved)
          if (!cancelled) setIcon(() => resolved)
        },
        () => {
          if (!cancelled) setIcon(() => TbFileUnknown)
        },
      )
      return () => {
        cancelled = true
      }
    }, [Icon])

    return Icon ? <Icon {...props} /> : <svg width={props.size ?? '1em'} height={props.size ?? '1em'} />
  }
  return LazyIcon
}

const iconTypeFromName = (iconName: string): IconType => {
  const prepared = IconLib[iconName as PreparedIcon]
  if (prepared) return prepared

  let Icon = lazyIcons.get(iconName)
  if (!Icon) {
    Icon = lazyIcon(iconName)
    lazyIcons.set(iconName, Icon)
  }
  return Icon
}

type IconTools = {
  IconLib: PreparedIconLib
  iconTypeFromName(iconName: string): IconType
}

export const useIconNameList = (): string[] => {
  const [iconNameList, setIconNameList] = useState<string[]>([])

  useEffect(() => {
    loadIconNames().then(setIconNameList)
  }, [])

  return iconNameList
}

export const IconToolsContext = createContext<IconTools>({ IconLib, iconTypeFromName })
