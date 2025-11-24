import { CategoryID } from './category'
import { CurrencyID } from './currency'
import Unique from './Unique'

export type TransactionGroupID = number

export enum SplitType {
  EQUAL,
  PERCENTAGE,
  SHARES,
}

export const SplitTypeToString = (st: SplitType) => {
  switch (st) {
    case SplitType.EQUAL:
      return 'Equal'
    case SplitType.PERCENTAGE:
      return 'Percentage'
    case SplitType.SHARES:
      return 'Shares'
    default:
      return 'Unknown'
  }
}

export const ParseSplitType = (st: string) => {
  switch (st) {
    case 'Equal':
      return SplitType.EQUAL
    case 'Percentage':
      return SplitType.PERCENTAGE
    case 'Shares':
      return SplitType.SHARES
  }
}

export class Member {
  constructor(
    readonly email: string,
    readonly name: string,
    readonly splitValue: number | null,
  ) {}

  equals(other: Member): boolean {
    if (this.email !== other.email) return false
    if (this.splitValue !== other.splitValue) return false
    return true
  }
}

export default class TransactionGroup implements Unique<TransactionGroupID, TransactionGroup> {
  constructor(
    readonly id: TransactionGroupID,
    readonly name: string,
    readonly originalCurrency: string,
    readonly splitType: SplitType,
    readonly members: Member[],
    readonly currency: CurrencyID | null,
    readonly category: CategoryID | null,
  ) {}

  equals(other: TransactionGroup): boolean {
    if (this.id !== other.id) return false
    if (this.name !== other.name) return false
    if (this.originalCurrency !== other.originalCurrency) return false
    if (this.splitType !== other.splitType) return false
    if (this.members.length != this.members.length) return false
    if (this.members.reduce((prev, m, i) => prev || !m.equals(other.members[i]), false)) return false
    if (this.currency !== other.currency) return false
    if (this.category !== other.category) return false
    return true
  }
}

export type TransactionGroupUpdatableFields = Pick<TransactionGroup, 'name' | 'splitType' | 'currency' | 'category'>
