import { useTheme } from '@mui/material'
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

import CustomChart from './CustomChart'
import Currency, { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import { darkColors, darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'

import '../../styles/graphs-tailwind.css'

export type GroupType = 'currency' | 'risk' | 'type' | 'none'

interface Props {
  filterByAccounts?: number[]
  fromDate: Date
  toDate: Date
  groupBy: GroupType
  baselineConfig?: 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
  scale?: 'absolute' | 'cropped-absolute' | 'relative'
}

const CurrenciesBalanceChart: FC<Props> = (props) => {
  const { fromDate, toDate, filterByAccounts, groupBy, baselineConfig = 'none', scale = 'absolute' } = props
  const theme = useTheme()

  const { augmentedTransactions, exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
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
    (currency?: Currency) => {
      if (typeof currency === 'undefined') return 'Total'

      switch (groupBy) {
        case 'currency':
          return currency.name
        case 'risk':
          return currency.risk !== '' ? currency.risk : 'Unknown'
        case 'type':
          return currency.type !== '' ? currency.type : 'Unknown'
        case 'none':
          return 'Total'
      }
    },
    [groupBy],
  )

  return useMemo(() => {
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
      subN = subWeeks
      showLabelEveryFactor = 16
      i = diffWeeks
    } else if (diffMonths > 3 * 12) {
      // between 3 year and 4 years
      subN = (date, i) => subWeeks(date, i * 2)
      showLabelEveryFactor = 8
      i = Math.floor(diffWeeks / 2) + 1
    } else if (diffMonths > 2 * 12) {
      // between 2 year and 3 years
      subN = subWeeks
      showLabelEveryFactor = 8
      i = diffWeeks
    } else if (diffMonths > 12) {
      // between 1 year and 2 years
      subN = subWeeks
      showLabelEveryFactor = 6
      i = diffWeeks
    } else if (diffWeeks > 6 * 4) {
      // between 6 months and 1 year
      subN = subDays
      showLabelEveryFactor = 30
      i = diffDays
    } else if (diffDays > 60) {
      // between 2 months and 6 months
      subN = subDays
      showLabelEveryFactor = 7
      i = diffDays
    }

    const Investments = filteredAccounts.reduce((totals, account) => {
      for (const initialAmount of account.initialAmounts) {
        const groupLabel = group(currencies.find((c) => c.id === initialAmount.currencyId))
        const groupData = totals.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
        groupData.assets.set(
          initialAmount.currencyId,
          (groupData.assets.get(initialAmount.currencyId) ?? 0) + initialAmount.value,
        )
        totals.set(groupLabel, groupData)
      }
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
        const groupLabel = group(transaction.receiverCurrency)!
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
        const groupLabel = group(transaction.currency)!
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

    const data: { baseline?: number; values: { [account: string]: { amount: number; baseline?: number } } }[] = []
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
          const groupLabel = group(transaction.receiverCurrency)!
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
                group(transaction.currency) === groupLabel) ||
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
          const groupLabel = group(transaction.currency)!
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(transaction.currencyId, (data.assets.get(transaction.currencyId) ?? 0) - transaction.amount)

          if (
            !(
              (typeof transaction.receiver !== 'undefined' &&
                transaction.receiver.isMine &&
                filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 &&
                group(transaction.receiverCurrency) === groupLabel) ||
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

      const todaysData: { [account: string]: { amount: number; baseline?: number } } = {}
      let todaysBookValue = 0
      for (const [groupLabel, groupData] of Investments.entries()) {
        let marketValue = 0
        for (const [currencyId, amount] of groupData.assets) {
          let factor = 1
          if (currencyId !== defaultCurrency.id) {
            factor = exchangeRateOnDay(currencyId, defaultCurrency.id, upTo)
          }
          marketValue += amount * factor
        }

        todaysBookValue += groupData.bookValue
        todaysData[groupLabel] = { amount: marketValue, baseline: groupData.bookValue }
        groups.add(groupLabel)
      }

      labels.push(upTo)
      data.push({ values: { ...todaysData }, baseline: todaysBookValue })
      i -= 1
    }

    let minYValue = 0
    if (scale === 'cropped-absolute' && groups.size === 1) {
      minYValue = Number.MAX_SAFE_INTEGER
      const groupLabel = [...groups.keys()][0]
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].values[groupLabel].amount < minYValue) {
          minYValue = data[i].values[groupLabel].amount
        }
        if (
          baselineConfig == 'showIndividualBaselines' &&
          (data[i].values[groupLabel].baseline ?? Number.MAX_SAFE_INTEGER) < minYValue
        ) {
          minYValue = data[i].values[groupLabel].baseline!
        }
        if (baselineConfig == 'showGlobalBaseline' && (data[i].baseline ?? Number.MAX_SAFE_INTEGER) < minYValue) {
          minYValue = data[i].baseline!
        }
      }
    }

    return (
      <>
        <CustomChart
          data={data}
          keys={[...groups.keys()].sort((a, b) => a.localeCompare(b))}
          valueFormat={(value) => `${formatFull(defaultCurrency, value, privacyMode)}`}
          margin={{ top: 20, right: 25, bottom: 80, left: 70 }}
          showGlobalBaseline={baselineConfig === 'showGlobalBaseline'}
          showIndividualBaselines={baselineConfig === 'showIndividualBaselines'}
          minYValue={minYValue}
          axisBottom={{
            format: (i) =>
              (data.length - i - 1) % showLabelEveryFactor === 0
                ? labels[i] && formatDate(labels[i], 'MMM d, yyyy')
                : '',
            tickRotation: -45,
            tickSize: 5,
            tickPadding: 8,
          }}
          enableGridY={!privacyMode}
          axisLeft={{
            tickSize: privacyMode ? 0 : 5,
            tickPadding: 5,
            format: (i) => {
              if (scale == 'relative') {
                return `${Math.round(i * 100)}%`
              }
              return privacyMode
                ? ''
                : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                    notation: 'compact',
                  })
            },
          }}
          offsetType={scale == 'relative' ? 'expand' : 'normal'}
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
          colors={darkColors}
          stackTooltip={(tooltipProps) => {
            const date = formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')
            const totalGain = tooltipProps.slice.stack.map((s) => s.gain ?? 0).reduce((sum, g) => sum + g, 0)
            const showGlobalGain = !privacyMode && totalGain !== 0 && baselineConfig === 'showGlobalBaseline'

            return (
              <div className="graph-tooltip">
                <div className="graph-tooltip-date">{date}</div>

                {tooltipProps.slice.stack
                  .filter((s) => s.value !== 0)
                  .map((s) => {
                    const showGain = !privacyMode && s.gain !== 0 && baselineConfig === 'showIndividualBaselines'
                    return (
                      <div key={`${date}-${s.layerLabel}`} className="graph-tooltip-group">
                        {/* main row */}
                        <div className="graph-tooltip-row">
                          <div className="graph-tooltip-color" style={{ backgroundColor: s.color }} />
                          <div className="graph-tooltip-label">{s.layerLabel}</div>

                          {!privacyMode && (
                            <>
                              <div>:</div>
                              <div className="min-w-4 flex-grow" />
                              <div className="graph-tooltip-value">{s.formattedValue}</div>
                            </>
                          )}
                        </div>

                        {/* indented gain row */}
                        {showGain && (
                          <div className="graph-tooltip-row">
                            <div
                              className={'graph-tooltip-value'}
                              style={{
                                fontSize: 'small',
                                color: s.gain < 0 ? theme.palette.error.light : theme.palette.success.light,
                              }}
                            >
                              {s.gainFormatted}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                {showGlobalGain && (
                  <div>
                    <hr />
                    <div className="graph-tooltip-row">
                      <div
                        className="graph-tooltip-value"
                        style={{
                          color: totalGain < 0 ? theme.palette.error.light : theme.palette.success.light,
                        }}
                      >
                        Total Gains: {formatFull(defaultCurrency, totalGain, privacyMode)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          }}
        />
      </>
    )
  }, [defaultCurrency, filteredAccounts, groupBy, fromDate, toDate, group, privacyMode, exchangeRateOnDay])
}

export default CurrenciesBalanceChart
