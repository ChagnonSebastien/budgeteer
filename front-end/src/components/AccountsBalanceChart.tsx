import { IonCard, IonRadio, IonRadioGroup } from '@ionic/react'
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
import { FC, useCallback, useContext, useMemo, useState } from 'react'

import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

interface Props {
  filterByAccounts?: number[]
  fromDate: Date
  toDate: Date
}

const AccountsBalanceChart: FC<Props> = (props) => {
  const { fromDate, toDate, filterByAccounts } = props

  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { accountTotals } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)

  const [groupBy, setGroupBy] = useState<'financialInstitution' | 'type' | 'account' | 'none'>('account')

  const filteredAccounts = useMemo(() => {
    if (typeof filterByAccounts === 'undefined') return myOwnAccounts
    return myOwnAccounts.filter((account) => filterByAccounts?.includes(account.id))
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

  const stream = useMemo(() => {
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

    while (i >= 0) {
      const upTo = subN(toDate, i)
      let todaysData: { [account: string]: number } = {}

      accountTotals?.forEach((account, accountId) => {
        let total = 0
        const day = account.years.get(upTo.getFullYear())?.months.get(upTo.getMonth())?.days.get(upTo.getDate())
        if (typeof day !== 'undefined') {
          total += day.total ?? 0
          total += day.portfolio ?? 0
        }

        const groupLabel = group(filteredAccounts.find((a) => a.id === accountId)) ?? accountId.toString()
        const bigTotal = (todaysData[groupLabel] ?? 0) + total
        todaysData = { ...todaysData, [groupLabel]: bigTotal }
        groups.add(groupLabel)
      })

      labels.push(upTo)
      data.push({ ...todaysData })
      i -= 1
    }

    return (
      <>
        <IonCard
          style={{
            position: 'absolute',
            left: '6rem',
            top: '1rem',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
            padding: '.5rem',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>Group by</div>
          <IonRadioGroup
            value={groupBy}
            style={{ display: 'flex', flexDirection: 'column' }}
            onIonChange={(ev) => setGroupBy(ev.detail.value)}
          >
            <IonRadio value="none">None</IonRadio>
            <IonRadio value="account">Account</IonRadio>
            <IonRadio value="financialInstitution">Financial Institution</IonRadio>
            <IonRadio value="type">Type</IonRadio>
          </IonRadioGroup>
        </IonCard>

        <ResponsiveStream
          data={data}
          keys={[...groups.keys()].sort((a, b) => a.localeCompare(b))}
          valueFormat={(value) => `${formatFull(defaultCurrency, value)}`}
          margin={{ top: 10, right: 20, bottom: 60, left: 60 }}
          axisBottom={{
            format: (i) => (i % showLabelEveryFactor === 0 ? labels[i] && formatDate(labels[i], 'MMM d, yyyy') : ''),
            tickRotation: -45,
          }}
          axisLeft={{
            format: (i) =>
              ((i as number) / Math.pow(10, defaultCurrency?.decimalPoints)).toLocaleString(undefined, {
                notation: 'compact',
              }),
          }}
          curve="monotoneX"
          offsetType="none"
          colors={{ scheme: 'set3' }}
          borderColor={{ theme: 'background' }}
          stackTooltip={(tooltipProps) => (
            <IonCard style={{ padding: '0.5rem' }}>
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
            </IonCard>
          )}
        />
      </>
    )
  }, [defaultCurrency, filteredAccounts, groupBy, fromDate, toDate, group])

  return <>{stream}</>
}

export default AccountsBalanceChart
