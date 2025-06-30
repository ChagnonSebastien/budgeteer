import { BudgeteerDB, ExchangeRateCompositeKey } from './IndexedDB'
import ExchangeRate, {
  ExchangeRateIdentifiableFields,
  ExchangeRateUpdatableFields,
} from '../../domain/model/exchangeRate'

export default class ExchangeRateLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<ExchangeRate[]> {
    const exchangeRates = await this.db.exchangeRates.toCollection().toArray()
    return exchangeRates.map((er) => new ExchangeRate(new ExchangeRateIdentifiableFields(er.a, er.b, er.date), er.rate))
  }

  public async create(
    data: ExchangeRateUpdatableFields,
    identity: ExchangeRateIdentifiableFields,
  ): Promise<ExchangeRate> {
    await this.db.exchangeRates.put({
      a: identity.currencyA,
      b: identity.currencyB,
      date: identity.date,
      rate: data.rate,
    })

    return new ExchangeRate(
      new ExchangeRateIdentifiableFields(identity.currencyA, identity.currencyB, identity.date),
      data.rate,
    )
  }

  public async createKnown(data: ExchangeRate): Promise<void> {
    await this.db.exchangeRates.put({
      a: data.currencyA,
      b: data.currencyB,
      date: data.date,
      rate: data.rate,
    })
  }

  public async update(
    identity: ExchangeRateIdentifiableFields,
    data: Partial<ExchangeRateUpdatableFields>,
  ): Promise<void> {
    await this.db.exchangeRates.update(
      [identity.currencyA, identity.currencyB, identity.date] as ExchangeRateCompositeKey,
      { rate: data.rate },
    )
  }

  public async sync(rates: ExchangeRate[]): Promise<void> {
    await this.db.exchangeRates.clear()
    await this.db.exchangeRates.bulkPut(
      rates.map((er) => ({
        a: er.currencyA,
        b: er.currencyB,
        date: er.date,
        rate: er.rate,
      })),
    )
  }
}
