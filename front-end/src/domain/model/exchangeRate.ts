import Unique from './Unique'

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${month}-${day}`
}

export type ExchangeRateId = string

export class ExchangeRateIdentifiableFields implements Unique<ExchangeRateId, ExchangeRateIdentifiableFields> {
  constructor(
    public readonly currencyA: number,
    public readonly currencyB: number,
    public readonly date: Date,
  ) {}

  get id(): ExchangeRateId {
    return `${this.currencyA},${this.currencyB},${formatDate(this.date)}`
  }

  equals(other: ExchangeRateIdentifiableFields): boolean {
    if (this.currencyA !== other.currencyA) return false
    if (this.currencyB !== other.currencyB) return false
    return this.date === other.date
  }
}

export default class ExchangeRate extends ExchangeRateIdentifiableFields {
  constructor(
    exchangeRateIdentifiableFields: ExchangeRateIdentifiableFields,
    public readonly rate: number,
  ) {
    super(
      exchangeRateIdentifiableFields.currencyA,
      exchangeRateIdentifiableFields.currencyB,
      exchangeRateIdentifiableFields.date,
    )
  }

  override equals(other: ExchangeRate): boolean {
    if (this.currencyA !== other.currencyA) return false
    if (this.currencyB !== other.currencyB) return false
    if (this.date.getTime() !== other.date.getTime()) return false
    return this.rate === other.rate
  }
}

export type ExchangeRateUpdatableFields = Pick<ExchangeRate, 'rate'>
