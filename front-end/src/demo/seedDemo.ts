import { generateDemoData } from './generateDemoData'
import User from '../domain/model/user'
import IndexedDB from '../store/local/IndexedDB'

export const seedDemo = async (): Promise<User> => {
  const data = generateDemoData(new Date(), Math.floor(Math.random() * 2 ** 32))
  await IndexedDB.transaction('rw', IndexedDB.tables, async () => {
    await Promise.all(IndexedDB.tables.map((table) => table.clear()))
    await IndexedDB.currencies.bulkAdd(data.currencies)
    await IndexedDB.categories.bulkAdd(data.categories)
    await IndexedDB.accounts.bulkAdd(data.accounts)
    await IndexedDB.exchangeRates.bulkAdd(data.exchangeRates)
    await IndexedDB.transactions.bulkAdd(data.transactions)
    await IndexedDB.transactionGroups.bulkAdd(data.transactionGroups)
    await IndexedDB.settlements.bulkAdd(data.settlements)
  })
  return data.user
}
