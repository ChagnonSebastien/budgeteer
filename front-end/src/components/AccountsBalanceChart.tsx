import { Card } from '@mui/material'
import { ResponsiveStream } from '@nivo/stream'
import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  formatDate,
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
  splitInvestements?: boolean
}

const AccountsBalanceChart: FC<Props> = (props) => {
  const { fromDate, toDate, filterByAccounts, groupBy, splitInvestements = false } = props

  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { accountTotals } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { anonymity } = useContext(DrawerContext)

  const filteredAccounts = useMemo(() => {
    if (typeof filterByAccounts === 'undefined') return myOwnAccounts
    const filtered = myOwnAccounts
      // .filter((account) => account?.type !== 'Credit Card')
      .filter((account) => filterByAccounts?.includes(account.id))
    return filtered.length === 0 ? myOwnAccounts : filtered
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

    if (diffMonths > 72) {
      subN = subMonths
      showLabelEveryFactor = 12
      i = diffMonths + 1
    } else if (diffMonths > 36) {
      subN = subMonths
      showLabelEveryFactor = 6
      i = diffMonths + 1
    } else if (diffMonths > 24) {
      subN = subMonths
      showLabelEveryFactor = 2
      i = diffMonths + 1
    } else if (diffWeeks > 50) {
      subN = subWeeks
      showLabelEveryFactor = 4
      i = diffWeeks + 1
    } else if (diffDays > 50) {
      subN = subDays
      showLabelEveryFactor = 7
      i = diffDays + 1
    }

    const data: { [account: string]: number }[] = []
    const labels: Date[] = []
    const groups = new Set<string>()
    let interestsDiff = 0

    outerLoop: while (i >= 0) {
      const upTo = subN(toDate, i)
      let todaysData: { [account: string]: number } = {}
      let rawTotal = 0

      for (const [accountId, accountData] of accountTotals ?? []) {
        const item = filteredAccounts.find((a) => a.id === accountId)
        const day = accountData.years.get(upTo.getFullYear())?.months.get(upTo.getMonth())?.days.get(upTo.getDate())
        if (typeof day !== 'undefined') {
          rawTotal += day.raw ?? 0
        } else {
          i -= 1
          continue outerLoop
        }

        if (item?.type === 'Credit Card') continue

        let total = 0
        if (typeof day !== 'undefined') {
          total += day.total ?? 0
          total += day.portfolio ?? 0
        }

        const groupLabel = group(item)
        if (typeof groupLabel === 'undefined') {
          continue
        }

        const bigTotal = (todaysData[groupLabel] ?? 0) + total
        todaysData = { ...todaysData, [groupLabel]: bigTotal }

        groups.add(groupLabel)
      }

      if (splitInvestements && groupBy === 'none') {
        let total = rawTotal;
        let interests = todaysData['Total'] - rawTotal
        
        if (interestsDiff == 0) {
          interestsDiff = interests
        }

        total += interestsDiff
        interests -= interestsDiff

        //if (interests < 0) {
        //  total -= interests
        //  interests = 0
        //}
        todaysData = {...todaysData, ['Total']: total, ['Interests']: interests }
        groups.add('Interests')
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
          valueFormat={(value) => `${formatFull(defaultCurrency, value, anonymity)}`}
          margin={{ top: 10, right: 50, bottom: 70, left: 60 }}
          axisBottom={{
            format: (i) =>
              (data.length - i - 1) % showLabelEveryFactor === 0
                ? labels[i] && formatDate(labels[i], 'MMM d, yyyy')
                : '',
            tickRotation: -45,
          }}
          axisLeft={{
            format: (i) =>
              anonymity
                ? 'XX'
                : ((i as number) / Math.pow(10, defaultCurrency?.decimalPoints)).toLocaleString(undefined, {
                    notation: 'compact',
                  }),
          }}
          curve="monotoneX"
          offsetType="none"
          order="reverse"
          theme={darkTheme}
          colors={darkColors}
          borderColor={{ theme: 'background' }}
          stackTooltip={(tooltipProps) => (
            <Card style={{ padding: '0.5rem' }}>
              <div>{formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')}</div>
              {tooltipProps.slice.stack
                .filter((s) => s.value !== 0)
                .map((s) => (
                  <div
                    key={`line-chart-overlay-${labels[tooltipProps.slice.index] && formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')}-${s.layerLabel}`}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <div
                      style={{
                        width: '1rem',
                        height: '1rem',
                        backgroundColor: s.color,
                        borderRadius: '.25rem',
                        marginRight: '.25rem',
                      }}
                    />
                    <div>{s.layerLabel}:</div>
                    <div style={{ minWidth: '1rem', flexGrow: 1 }} />
                    <div>{s.formattedValue}</div>
                  </div>
                ))}
            </Card>
          )}
          animate={false}
        />
      </>
    )
  }, [defaultCurrency, filteredAccounts, groupBy, fromDate, toDate, group, anonymity])
}

export default AccountsBalanceChart
