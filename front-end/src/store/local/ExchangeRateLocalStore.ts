import { BudgeteerDB, ExchangeRateCompositeKey } from './indexedDb/db'
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
    const rates: ExchangeRate[] = []
    await this.db.exchangeRates.each((er) => {
      rates.push(new ExchangeRate(new ExchangeRateIdentifiableFields(er.a, er.b, er.date), er.rate))
    })
    return rates
  }

  public async create(
    data: ExchangeRateUpdatableFields,
    identity: ExchangeRateIdentifiableFields,
  ): Promise<ExchangeRate> {
    await this.db.exchangeRates.add({
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
    await this.db.exchangeRates.add({
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
    await Promise.all(
      rates.map((er) =>
        this.db.exchangeRates.add({
          a: er.currencyA,
          b: er.currencyB,
          date: er.date,
          rate: er.rate,
        }),
      ),
    )
  }
}
