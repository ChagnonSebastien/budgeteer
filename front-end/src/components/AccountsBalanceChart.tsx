import { ResponsiveStream } from '@nivo/stream'
import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  formatDate,
  isBefore,
  isSameDay,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { FC, useCallback, useContext, useMemo } from 'react'

import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import { darkColors, darkTheme } from '../utils'

export type GroupType = 'financialInstitution' | 'type' | 'account' | 'none'

interface Props {
  filterByAccounts?: number[]
  fromDate: Date
  toDate: Date
  groupBy: GroupType
  splitInvestements?: 'both' | 'split' | 'bookValue' | 'interests'
  spread?: boolean
}

const AccountsBalanceChart: FC<Props> = (props) => {
  const { fromDate, toDate, filterByAccounts, groupBy, splitInvestements = 'both', spread = false } = props

  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { augmentedTransactions, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { privacyMode } = useContext(DrawerContext)

  const filteredAccounts = useMemo(() => {
    const prefilter = myOwnAccounts.filter((account) => account?.type !== 'Credit Card')

    if (typeof filterByAccounts === 'undefined') {
      return prefilter
    }

    const filtered = prefilter.filter((account) => filterByAccounts?.includes(account.id))
    return filtered.length === 0 ? prefilter : filtered
  }, [myOwnAccounts, filterByAccounts])

  const group = useCallback(
    (account?: Account) => {
      if (typeof account === 'undefined') return undefined

      switch (groupBy) {
        case 'account':
          return account.name
        case 'financialInstitution':
          return account.financialInstitution ?? 'Other'
        case 'type':
          return account.type ?? 'Other'
        case 'none':
          return 'Total'
      }
    },
    [groupBy],
  )

  return useMemo(() => {
    if (defaultCurrency === null) return null

    const diffDays = differenceInDays(toDate, fromDate)
    const diffWeeks = differenceInWeeks(toDate, fromDate)
    const diffMonths = differenceInMonths(toDate, fromDate)

    let subN = subDays
    let showLabelEveryFactor = 1
    let i = diffDays + 1

    if (diffMonths > 5 * 12) {
      // above 5 years
      subN = subMonths
      showLabelEveryFactor = 6
      i = diffMonths
    } else if (diffMonths > 4 * 12) {
      // between 4 year and 5 years
      subN = subMonths
      showLabelEveryFactor = 3
      i = diffMonths
    } else if (diffMonths > 3 * 12) {
      // between 3 year and 4 years
      subN = (date, i) => subWeeks(date, i * 2)
      showLabelEveryFactor = 8
      i = Math.floor(diffWeeks / 2) + 1
    } else if (diffMonths > 2 * 12) {
      // between 2 year and 3 years
      subN = (date, i) => subWeeks(date, i * 2)
      showLabelEveryFactor = 4
      i = Math.floor(diffWeeks / 2) + 1
    } else if (diffMonths > 12) {
      // between 1 year and 2 years
      subN = subWeeks
      showLabelEveryFactor = 4
      i = diffWeeks
    } else if (diffWeeks > 6 * 4) {
      // between 6 months and 1 year
      subN = subWeeks
      showLabelEveryFactor = 2
      i = diffWeeks
    } else if (diffDays > 60) {
      // between 2 months and 6 months
      subN = subDays
      showLabelEveryFactor = 7
      i = diffDays
    }

    const Investments = filteredAccounts.reduce((totals, account) => {
      const groupLabel = group(account)!
      const groupData = totals.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
      for (const initialAmount of account.initialAmounts) {
        groupData.assets.set(
          initialAmount.currencyId,
          (groupData.assets.get(initialAmount.currencyId) ?? 0) + initialAmount.value,
        )
      }
      totals.set(groupLabel, groupData)
      return totals
    }, new Map<string, { bookValue: number; assets: Map<number, number> }>())

    let upTo = subN(toDate, i + 1)
    let t = augmentedTransactions.length - 1
    while (
      t >= 0 &&
      (isBefore(augmentedTransactions[t].date, upTo) || isSameDay(augmentedTransactions[t].date, upTo))
    ) {
      const transaction = augmentedTransactions[t]

      if (
        typeof transaction.receiver !== 'undefined' && // Has a Receiver
        transaction.receiver.isMine && // I am the receiver
        filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 // The account respects filters
      ) {
        const groupLabel = group(transaction.receiver)!
        const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
        data.assets.set(
          transaction.receiverCurrencyId,
          (data.assets.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
        )
        Investments.set(groupLabel, data)
      }
      if (
        typeof transaction.sender !== 'undefined' &&
        transaction.sender.isMine &&
        filteredAccounts.findIndex((a) => a.id === transaction.sender?.id) >= 0
      ) {
        const groupLabel = group(transaction.sender)!
        const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
        data.assets.set(transaction.currencyId, (data.assets.get(transaction.currencyId) ?? 0) - transaction.amount)
        Investments.set(groupLabel, data)
      }

      t -= 1
    }

    for (const groupData of Investments.values()) {
      let marketValue = 0
      for (const [currencyId, amount] of groupData.assets) {
        let factor = 1
        if (currencyId !== defaultCurrency.id) {
          factor = exchangeRateOnDay(currencyId, defaultCurrency.id, upTo)
        }
        marketValue += amount * factor
      }
      groupData.bookValue = marketValue
    }

    const data: { [account: string]: number }[] = []
    const labels: Date[] = []
    const groups = new Set<string>()

    while (i >= 0) {
      upTo = subN(toDate, i)

      while (
        t >= 0 &&
        (isBefore(augmentedTransactions[t].date, upTo) || isSameDay(augmentedTransactions[t].date, upTo))
      ) {
        const transaction = augmentedTransactions[t]

        if (
          typeof transaction.receiver !== 'undefined' && // Has a Receiver
          transaction.receiver.isMine && // I am the receiver
          filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 // The account respects filters
        ) {
          const groupLabel = group(transaction.receiver)!
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(
            transaction.receiverCurrencyId,
            (data.assets.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
          )

          if (
            !(
              (typeof transaction.sender !== 'undefined' &&
                transaction.sender.isMine &&
                filteredAccounts.findIndex((a) => a.id === transaction.sender?.id) >= 0 &&
                group(transaction.sender) === groupLabel) ||
              transaction.category?.name === 'Financial income'
            )
          ) {
            if (transaction.receiverCurrencyId === defaultCurrency.id) {
              data.bookValue += transaction.receiverAmount
            } else if (transaction.currencyId === defaultCurrency.id) {
              data.bookValue += transaction.amount
            } else {
              const factor = exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency.id, upTo)
              data.bookValue += transaction.receiverAmount * factor
            }
          }

          Investments.set(groupLabel, data)
        }
        if (
          typeof transaction.sender !== 'undefined' &&
          transaction.sender.isMine &&
          filteredAccounts.findIndex((a) => a.id === transaction.sender?.id) >= 0
        ) {
          const groupLabel = group(transaction.sender)!
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(transaction.currencyId, (data.assets.get(transaction.currencyId) ?? 0) - transaction.amount)

          if (
            !(
              (typeof transaction.receiver !== 'undefined' &&
                transaction.receiver.isMine &&
                filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 &&
                group(transaction.receiver) === groupLabel) ||
              transaction.category?.name === 'Financial income'
            )
          ) {
            if (transaction.receiverCurrencyId === defaultCurrency.id) {
              data.bookValue -= transaction.receiverAmount
            } else if (transaction.currencyId === defaultCurrency.id) {
              data.bookValue -= transaction.amount
            } else {
              const factor = exchangeRateOnDay(transaction.currencyId, defaultCurrency.id, upTo)
              data.bookValue -= transaction.amount * factor
            }
          }

          Investments.set(groupLabel, data)
        }

        t -= 1
      }

      const todaysData: { [account: string]: number } = { test: 100 }
      for (const [groupLabel, groupData] of Investments.entries()) {
        let marketValue = 0
        for (const [currencyId, amount] of groupData.assets) {
          let factor = 1
          if (currencyId !== defaultCurrency.id) {
            factor = exchangeRateOnDay(currencyId, defaultCurrency.id, upTo)
          }
          marketValue += amount * factor
        }

        if (splitInvestements === 'split') {
          todaysData[`${groupLabel} Gained`] = marketValue === 0 ? 0 : marketValue - groupData.bookValue
          todaysData[`${groupLabel} Invested`] = marketValue === 0 ? 0 : groupData.bookValue
          groups.add(`${groupLabel} Gained`)
          groups.add(`${groupLabel} Invested`)
        } else if (splitInvestements === 'bookValue') {
          todaysData[groupLabel] = marketValue === 0 ? 0 : groupData.bookValue
          groups.add(groupLabel)
        } else if (splitInvestements === 'interests') {
          todaysData[groupLabel] = marketValue === 0 ? 0 : marketValue - groupData.bookValue
          groups.add(groupLabel)
        } else {
          todaysData[groupLabel] = marketValue
          groups.add(groupLabel)
        }
      }

      labels.push(upTo)
      data.push({ ...todaysData })
      i -= 1
    }

    return (
      <>
        <ResponsiveStream
          data={data}
          keys={[...groups.keys()].sort((a, b) => a.localeCompare(b))}
          valueFormat={(value) => `${formatFull(defaultCurrency, value, privacyMode)}`}
          margin={{ top: 20, right: 25, bottom: 80, left: 70 }}
          axisBottom={{
            format: (i) =>
              (data.length - i - 1) % showLabelEveryFactor === 0
                ? labels[i] && formatDate(labels[i], 'MMM d, yyyy')
                : '',
            tickRotation: -45,
            tickSize: 8,
            tickPadding: 5,
          }}
          enableGridY={!privacyMode}
          axisLeft={{
            tickSize: privacyMode ? 0 : 8,
            tickPadding: 5,
            format: (i) => {
              if (spread) {
                return `${i * 100}%`
              }
              return privacyMode
                ? ''
                : ((i as number) / Math.pow(10, defaultCurrency?.decimalPoints)).toLocaleString(undefined, {
                    notation: 'compact',
                  })
            },
          }}
          curve="monotoneX"
          offsetType={spread ? 'expand' : 'none'}
          order="reverse"
          theme={{
            ...darkTheme,
            axis: {
              ...darkTheme.axis,
              ticks: {
                ...darkTheme.axis?.ticks,
                text: {
                  ...darkTheme.axis?.ticks?.text,
                  fontSize: 12,
                  fill: 'rgba(255, 255, 255, 0.7)',
                },
              },
            },
            grid: {
              ...darkTheme.grid,
              line: {
                ...darkTheme.grid?.line,
                stroke: 'rgba(255, 255, 255, 0.1)',
                strokeWidth: 1,
              },
            },
            background: 'transparent',
          }}
          colors={
            splitInvestements === 'split'
              ? ({ id }) => {
                  if (typeof id !== 'string') return darkColors[0]
                  const baseColorIndex = Math.floor(
                    [...groups.keys()].sort((a, b) => a.localeCompare(b)).indexOf(id) / 2,
                  )
                  const baseColor = darkColors[baseColorIndex % darkColors.length]

                  // If this is a "Gained" layer, create a lighter version of the base color
                  if (id.endsWith('Gained')) {
                    // Convert hex to RGB and lighten
                    const r = parseInt(baseColor.slice(1, 3), 16)
                    const g = parseInt(baseColor.slice(3, 5), 16)
                    const b = parseInt(baseColor.slice(5, 7), 16)
                    // Lighten by mixing with white (255,255,255)
                    const lightenFactor = 0.2 // 40% lighter
                    const lr = Math.round(r + (255 - r) * lightenFactor)
                    const lg = Math.round(g + (255 - g) * lightenFactor)
                    const lb = Math.round(b + (255 - b) * lightenFactor)
                    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
                  }

                  return baseColor
                }
              : darkColors
          }
          borderColor={{ theme: 'background' }}
          stackTooltip={(tooltipProps) => (
            <div className="graph-tooltip">
              <div className="graph-tooltip-date">{formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')}</div>
              {tooltipProps.slice.stack
                .filter((s) => s.value !== 0)
                .map((s) => (
                  <div
                    key={`line-chart-overlay-${labels[tooltipProps.slice.index] && formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')}-${s.layerLabel}`}
                    className="graph-tooltip-row"
                  >
                    <div className="graph-tooltip-color" style={{ backgroundColor: s.color }} />
                    <div className="graph-tooltip-label">{s.layerLabel}</div>
                    {!privacyMode && (
                      <>
                        <div>:</div>
                        <div style={{ minWidth: '1rem', flexGrow: 1 }} />
                        <div className="graph-tooltip-value">{s.formattedValue}</div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          )}
          animate={false}
        />
      </>
    )
  }, [defaultCurrency, filteredAccounts, groupBy, fromDate, toDate, group, privacyMode, exchangeRateOnDay])
}

export default AccountsBalanceChart
