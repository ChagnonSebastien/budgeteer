import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  getDaysInMonth,
  isWeekend,
  nextMonday,
  previousFriday,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'

import { AccountID } from './model/account'
import { AugmentedTransaction } from './model/transaction'

const lookbackDays = 183
// Covers paydays moved for weekends and holidays.
const toleranceDays = 3
// Net pay moves with overtime and tax thresholds; bonuses and reimbursements fall outside.
const amountTolerance = 0.15
const minSemiMonthlyGapDays = 10

type Paydays = (from: Date, to: Date) => Date[]

interface Cadence {
  paydays: Paydays
  minPayments: number
}

export interface RecurringIncome {
  senderId: AccountID
  lastPayment: AugmentedTransaction
  upcomingPaydays: (from: Date, before: Date) => Date[]
}

const isOnOrBefore = (day: Date, other: Date) => differenceInCalendarDays(other, day) >= 0

const everyNDays =
  (anchor: Date, n: number): Paydays =>
  (from, to) => {
    const days: Date[] = []
    let day = addDays(anchor, Math.ceil(differenceInCalendarDays(from, anchor) / n) * n)
    for (; isOnOrBefore(day, to); day = addDays(day, n)) days.push(day)
    return days
  }

const onDaysOfMonth =
  (daysOfMonth: number[]): Paydays =>
  (from, to) => {
    const days: Date[] = []
    for (let month = startOfMonth(from); isOnOrBefore(month, to); month = addMonths(month, 1)) {
      for (const dayOfMonth of daysOfMonth) {
        const day = new Date(month.getFullYear(), month.getMonth(), Math.min(dayOfMonth, getDaysInMonth(month)))
        if (isOnOrBefore(from, day) && isOnOrBefore(day, to)) days.push(day)
      }
    }
    return days
  }

const candidateCadences = (payments: Date[]): Cadence[] => {
  const daysOfMonth = [...new Set(payments.map((day) => day.getDate()))].sort((a, b) => a - b)
  return [
    ...payments.flatMap((day) => [
      { paydays: everyNDays(day, 7), minPayments: 8 },
      { paydays: everyNDays(day, 14), minPayments: 6 },
    ]),
    ...daysOfMonth.map((day) => ({ paydays: onDaysOfMonth([day]), minPayments: 4 })),
    ...daysOfMonth.flatMap((first) =>
      daysOfMonth
        .filter((second) => second - first >= minSemiMonthlyGapDays)
        .map((second) => ({ paydays: onDaysOfMonth([first, second]), minPayments: 6 })),
    ),
  ]
}

const fit = (cadence: Cadence, payments: Date[]) => {
  if (payments.length < cadence.minPayments) return null
  const slots = cadence.paydays(
    subDays(payments[0], toleranceDays),
    addDays(payments[payments.length - 1], toleranceDays),
  )
  if (slots.length !== payments.length) return null
  const gaps = payments.map((payment, i) => differenceInCalendarDays(payment, slots[i]))
  if (gaps.some((gap) => Math.abs(gap) > toleranceDays)) return null
  return { slots, gaps, deviation: gaps.reduce((sum, gap) => sum + Math.abs(gap), 0) / gaps.length }
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const detectFromSender = (
  senderId: AccountID,
  transactions: AugmentedTransaction[],
  today: Date,
): RecurringIncome | null => {
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime())
  const currencyId = sorted[sorted.length - 1].receiverCurrencyId
  const sameCurrency = sorted.filter((t) => t.receiverCurrencyId === currencyId)
  const typical = median(sameCurrency.map((t) => t.receiverAmount))
  const regular = sameCurrency.filter((t) => Math.abs(t.receiverAmount - typical) <= typical * amountTolerance)
  const payments = regular.map((t) => startOfDay(t.date))

  let best: { cadence: Cadence; slots: Date[]; gaps: number[]; deviation: number } | null = null
  for (const cadence of candidateCadences(payments)) {
    const result = fit(cadence, payments)
    if (result && (best === null || result.deviation < best.deviation)) best = { cadence, ...result }
  }
  if (best === null) return null

  const { cadence, slots, gaps } = best
  const lastSlot = slots[slots.length - 1]
  const [nextSlot] = cadence.paydays(addDays(lastSlot, 1), addDays(lastSlot, 31))
  if (differenceInCalendarDays(today, nextSlot) > toleranceDays) return null

  const weekendGaps = gaps.filter((_, i) => isWeekend(slots[i]))
  const paysAfterWeekend = weekendGaps.filter((gap) => gap > 0).length > weekendGaps.filter((gap) => gap < 0).length
  const expectedDay = (slot: Date) =>
    !isWeekend(slot) ? slot : paysAfterWeekend ? nextMonday(slot) : previousFriday(slot)

  return {
    senderId,
    lastPayment: regular[regular.length - 1],
    upcomingPaydays: (from, before) =>
      cadence
        .paydays(addDays(lastSlot, 1), addDays(before, 2))
        .map(expectedDay)
        .filter((day) => isOnOrBefore(from, day) && differenceInCalendarDays(before, day) > 0),
  }
}

export const detectRecurringIncomes = (transactions: AugmentedTransaction[], today: Date): RecurringIncome[] => {
  const since = subDays(today, lookbackDays)
  const bySender = new Map<AccountID, AugmentedTransaction[]>()
  for (const t of transactions) {
    if (t.senderId === null || t.getType() !== 'income' || !t.receiver?.isMine) continue
    if (!isOnOrBefore(since, t.date) || !isOnOrBefore(t.date, today)) continue
    bySender.set(t.senderId, [...(bySender.get(t.senderId) ?? []), t])
  }
  return [...bySender].flatMap(([senderId, senderTransactions]) => {
    const income = detectFromSender(senderId, senderTransactions, today)
    return income ? [income] : []
  })
}
