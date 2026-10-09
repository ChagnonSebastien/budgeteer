import Account, { AccountID } from './account'
import { AugmentedCategory, CategoryID } from './category'
import Currency, { CurrencyID } from './currency'
import {
  AugmentedTransactionGroup,
  Email,
  SplitType as TransactionGroupSplitType,
  TransactionGroupID,
} from './transactionGroup'
import Unique from './Unique'

export type TransactionID = number

export type TransactionType = 'income' | 'expense' | 'transfer' | 'financialIncome'

export enum SplitType {
  EQUAL,
  PERCENTAGE,
  SHARES,
  EXACT_AMOUNT,
}

export const SplitTypeOverrideToString = (splitType: SplitType) => {
  switch (splitType) {
    case SplitType.EQUAL:
      return 'Equal'
    case SplitType.PERCENTAGE:
      return 'Percentage'
    case SplitType.SHARES:
      return 'Shares'
    case SplitType.EXACT_AMOUNT:
      return 'Exact amounts'
  }
}

export function transactionGroupSplitTypeToInternal(splitType: TransactionGroupSplitType): SplitType {
  switch (splitType) {
    case TransactionGroupSplitType.EQUAL:
      return SplitType.EQUAL
    case TransactionGroupSplitType.PERCENTAGE:
      return SplitType.PERCENTAGE
    case TransactionGroupSplitType.SHARES:
      return SplitType.SHARES
    default:
      return SplitType.EQUAL
  }
}

export class MemberValue {
  constructor(
    readonly email: Email,
    readonly value: number | null,
  ) {}

  equals(other: MemberValue): boolean {
    if (this.email !== other.email) return false
    if (this.value !== other.value) return false
    return true
  }
}

export class SplitOverride {
  constructor(
    readonly splitTypeOverride: SplitType,
    readonly memberValues: MemberValue[],
  ) {}

  equals(other: SplitOverride): boolean {
    if (this.splitTypeOverride !== other.splitTypeOverride) return false
    if (this.memberValues.length !== other.memberValues.length) return false
    if (this.memberValues.reduce((prev, m, i) => prev || !m.equals(other.memberValues[i]), false)) return false
    return true
  }
}

export class TransactionGroupData {
  constructor(
    readonly transactionGroupId: TransactionGroupID,
    readonly splitOverride: SplitOverride | null,
  ) {}

  equals(other: TransactionGroupData): boolean {
    if (this.transactionGroupId !== other.transactionGroupId) return false
    if ((this.splitOverride === null) !== (other.splitOverride === null)) return false
    if (this.splitOverride !== null && !this.splitOverride.equals(other.splitOverride!)) return false
    return true
  }
}

export class FinancialIncomeData {
  constructor(readonly relatedCurrencyId: CurrencyID) {}

  equals(other: FinancialIncomeData): boolean {
    return this.relatedCurrencyId === other.relatedCurrencyId
  }
}

export default class Transaction implements Unique<TransactionID, Transaction> {
  constructor(
    readonly id: TransactionID,
    readonly owner: Email,
    readonly amount: number,
    readonly currencyId: CurrencyID,
    readonly categoryId: CategoryID | null,
    readonly date: Date,
    readonly senderId: AccountID | null,
    readonly receiverId: AccountID | null,
    readonly note: string,
    readonly receiverCurrencyId: CurrencyID,
    readonly receiverAmount: number,
    readonly financialIncomeData: FinancialIncomeData | null,
    readonly transactionGroupData: TransactionGroupData | null,
  ) {}

  equals(other: Transaction): boolean {
    if (this.id !== other.id) return false
    if (this.amount !== other.amount) return false
    if (this.currencyId !== other.currencyId) return false
    if (this.categoryId !== other.categoryId) return false
    if (this.date.getTime() !== other.date.getTime()) return false
    if (this.senderId !== other.senderId) return false
    if (this.receiverId !== other.receiverId) return false
    if (this.note !== other.note) return false
    if (this.receiverCurrencyId !== other.receiverCurrencyId) return false
    if (this.receiverAmount !== other.receiverAmount) return false
    if ((this.financialIncomeData === null) !== (other.financialIncomeData === null)) return false
    if (this.financialIncomeData !== null && !this.financialIncomeData.equals(other.financialIncomeData!)) return false
    if ((this.transactionGroupData === null) !== (other.transactionGroupData === null)) return false
    if (this.transactionGroupData !== null && !this.transactionGroupData.equals(other.transactionGroupData!))
      return false
    return true
  }
}

export class AugmentedTransactionGroupData extends TransactionGroupData {
  constructor(
    transactionGroupData: TransactionGroupData,
    public readonly transactionGroup: AugmentedTransactionGroup,
  ) {
    super(transactionGroupData.transactionGroupId, transactionGroupData.splitOverride)
  }
}

export class AugmentedFinancialIncomeData extends FinancialIncomeData {
  constructor(
    financialIncomeData: FinancialIncomeData,
    public readonly relatedCurrency: Currency,
  ) {
    super(financialIncomeData.relatedCurrencyId)
  }
}

export class AugmentedTransaction extends Transaction {
  constructor(
    transaction: Transaction,
    public readonly augmentedFinancialIncomeData: AugmentedFinancialIncomeData | null,
    public readonly augmentedTransactionGroupData: AugmentedTransactionGroupData | null,
    public readonly currency: Currency,
    public readonly receiverCurrency: Currency,
    public readonly category?: AugmentedCategory,
    public readonly sender?: Account,
    public readonly receiver?: Account,
  ) {
    super(
      transaction.id,
      transaction.owner,
      transaction.amount,
      transaction.currencyId,
      transaction.categoryId,
      transaction.date,
      transaction.senderId,
      transaction.receiverId,
      transaction.note,
      transaction.receiverCurrencyId,
      transaction.receiverAmount,
      transaction.financialIncomeData,
      transaction.transactionGroupData,
    )
  }

  getType(): TransactionType {
    if (this?.financialIncomeData !== null) return 'financialIncome'
    if (this?.categoryId === null) return 'transfer'
    if (this?.sender?.isMine ?? false) return 'expense'
    return 'income'
  }

  getUserContribution(user: string): number {
    if (this.augmentedTransactionGroupData === null) {
      return this.amount
    }

    const { splitType, memberValues } = this.resolvedSplit()
    const paid = this.owner === user ? this.amount : 0
    return paid - this.userShare(user, splitType, memberValues)
  }

  memberParts(): { email: string; part: number }[] {
    return this.augmentedTransactionGroupData!.transactionGroup.members.map((m) => ({
      email: m.email,
      part: (m.email === this.owner ? this.amount : 0) - this.getUserContribution(m.email),
    }))
  }

  splitSummary(user: string): string | null {
    const { splitType, memberValues } = this.resolvedSplit()
    const memberCount = this.augmentedTransactionGroupData!.transactionGroup.members.length
    const userValue = memberValues.find((m) => m.email === user)?.value ?? 0
    switch (splitType) {
      case SplitType.EQUAL: {
        const participantCount = this.participants(memberValues).length
        return participantCount >= memberCount ? null : `Between ${participantCount} of ${memberCount} members`
      }
      case SplitType.PERCENTAGE:
        return `Your portion: ${userValue}%`
      case SplitType.SHARES: {
        const total = memberValues.reduce((sum, m) => sum + (m.value ?? 0), 0)
        return `Your portion: ${userValue} of ${total} shares`
      }
      case SplitType.EXACT_AMOUNT:
        return 'Fixed amounts'
    }
  }

  private resolvedSplit(): { splitType: SplitType; memberValues: MemberValue[] } {
    const groupData = this.augmentedTransactionGroupData!
    if (groupData.splitOverride) {
      return {
        splitType: groupData.splitOverride.splitTypeOverride,
        memberValues: groupData.splitOverride.memberValues,
      }
    }
    return {
      splitType: transactionGroupSplitTypeToInternal(groupData.transactionGroup.splitType),
      memberValues: groupData.transactionGroup.members.map((m) => new MemberValue(m.email, m.splitValue)),
    }
  }

  // A pinned split lists who was in the group then; members who joined later aren't part of it.
  private participants(memberValues: MemberValue[]): string[] {
    return memberValues.length > 0
      ? memberValues.map((m) => m.email)
      : this.augmentedTransactionGroupData!.transactionGroup.members.map((m) => m.email)
  }

  // Others' shares round down to whole cents and the payer takes the rest, so shares always sum to the amount.
  private userShare(user: string, splitType: SplitType, memberValues: MemberValue[]): number {
    const participants = this.participants(memberValues)
    const share = (email: string) =>
      participants.includes(email)
        ? Math.floor(this.exactShare(email, splitType, memberValues, participants.length))
        : 0

    if (user !== this.owner) return share(user)
    return participants
      .filter((email) => email !== this.owner)
      .reduce((rest, email) => rest - share(email), this.amount)
  }

  private exactShare(
    user: string,
    splitType: SplitType,
    memberValues: MemberValue[],
    participantCount: number,
  ): number {
    const userValue = memberValues.find((m) => m.email === user)?.value ?? 0
    switch (splitType) {
      case SplitType.EQUAL:
        return participantCount === 0 ? 0 : this.amount / participantCount
      case SplitType.EXACT_AMOUNT:
        return userValue
      case SplitType.PERCENTAGE:
      case SplitType.SHARES: {
        const total = memberValues.reduce((sum, m) => sum + (m.value ?? 0), 0)
        return total === 0 ? 0 : (this.amount * userValue) / total
      }
    }
  }
}

export type TransactionUpdatableFields = Pick<
  Transaction,
  | 'amount'
  | 'currencyId'
  | 'categoryId'
  | 'date'
  | 'senderId'
  | 'receiverId'
  | 'note'
  | 'receiverCurrencyId'
  | 'receiverAmount'
  | 'financialIncomeData'
  | 'transactionGroupData'
  | 'owner'
>
