import { BudgeteerDB } from './indexedDb/db'
import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from '../../domain/model/currency'
import { IdIdentifier } from '../../domain/model/Unique'

export default class CurrencyLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<Currency[]> {
    const currencies: Currency[] = []
    await this.db.currencies.each((currency) => {
      currencies.push(
        new Currency(
          currency.id,
          currency.name,
          currency.symbol,
          currency.decimalPoints,
          new RateAutoupdateSettings(currency.rateFetchScript, currency.autoUpdate),
        ),
      )
    })
    return currencies
  }

  public async create(data: CurrencyUpdatableFields): Promise<Currency> {
    const newID = await this.db.currencies.add({
      rateFetchScript: data.rateAutoupdateSettings.script,
      autoUpdate: data.rateAutoupdateSettings.enabled,
      symbol: data.symbol,
      name: data.name,
      decimalPoints: data.decimalPoints,
    })

    const rateAutoupdateSettings = new RateAutoupdateSettings(
      data.rateAutoupdateSettings.script,
      data.rateAutoupdateSettings.enabled,
    )

    return new Currency(newID, data.name, data.symbol, data.decimalPoints, rateAutoupdateSettings)
  }

  public async createKnown(data: Currency): Promise<void> {
    await this.db.currencies.add({
      id: data.id,
      rateFetchScript: data.rateAutoupdateSettings.script,
      autoUpdate: data.rateAutoupdateSettings.enabled,
      symbol: data.symbol,
      name: data.name,
      decimalPoints: data.decimalPoints,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<CurrencyUpdatableFields>): Promise<void> {
    await this.db.currencies.update(identity.id, {
      rateFetchScript: data.rateAutoupdateSettings?.script,
      autoUpdate: data.rateAutoupdateSettings?.enabled,
      symbol: data.symbol,
      name: data.name,
      decimalPoints: data.decimalPoints,
    })
  }

  public async sync(currencies: Currency[]): Promise<void> {
    await this.db.currencies.clear()
    await Promise.all(
      currencies.map((currency) =>
        this.db.currencies.add({
          id: currency.id,
          rateFetchScript: currency.rateAutoupdateSettings.script,
          autoUpdate: currency.rateAutoupdateSettings.enabled,
          symbol: currency.symbol,
          name: currency.name,
          decimalPoints: currency.decimalPoints,
        }),
      ),
    )
  }
}
