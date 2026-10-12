import { differenceInMonths } from 'date-fns'

// Grace period so a fresh setup is not hidden before its first transaction.
const youngItemMonths = 1

export const isOldAndUnused = (createdAt: Date, balances: Iterable<number>): boolean =>
  differenceInMonths(new Date(), createdAt) >= youngItemMonths && ![...balances].some((balance) => balance !== 0)
