import { ChangeEventHandler, useState } from 'react'
import { parse as papaparse } from 'papaparse';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { AccountServiceClient } from '../messaging/dto/account.client';
import { CreateAccountRequest } from '../messaging/dto/account';

import './ImportSpreadsheet.css';
import { TransactionServiceClient } from '../messaging/dto/transaction.client';
import { CategoryServiceClient } from '../messaging/dto/category.client';
import { CurrencyServiceClient } from '../messaging/dto/currency.client';
import { CreateCategoryRequest } from '../messaging/dto/category';
import { CreateCurrencyRequest } from '../messaging/dto/currency';
import { CreateTransactionRequest } from '../messaging/dto/transaction';
import { Account } from '../domain/model/account';
import { Category } from '../domain/model/category';
import { Currency } from '../domain/model/currency';
import { Transaction } from '../domain/model/transaction';
import { Timestamp } from '../messaging/dto/google/protobuf/timestamp';

const transport = new GrpcWebFetchTransport({
  baseUrl: 'http://localhost:8080',
});

const accountService = new AccountServiceClient(transport)
const currencyService = new CurrencyServiceClient(transport)
const categoryService = new CategoryServiceClient(transport)
const transactionService = new TransactionServiceClient(transport)

const ImportSpreadsheet: React.FC = () => {

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (!event.target.files?.length) {
      return
    } 

    const file = event.target.files[0];
    if (file) {

          const currencies: Currency[] = [await createCurrency()]
          const accounts: Account[] = []
          const categories: Category[] = []
          const transactionPromises: Promise<Transaction>[] = []

      papaparse(file, {
        header: true,
        complete: async (results: {data: {
          Account: string,
          Category: string,
          Currency: string,
          Date: string,
          "From/To": string,
          Notes: string,
          Value: string,
        }[]}) => {  

          for (const line of results.data) {

            var currency = currencies.find(c => c.symbol === line.Currency)
            if (typeof currency === "undefined") {
              break
            }

            var category = categories.find(c => c.name === line.Category)
            if (typeof category === "undefined") {
              category = await createCategory(line.Category)
              categories.push(category)
            }

            let account = accounts.find(a => a.name === line.Account)
            if (typeof account === "undefined") {
              account = await createAccount(0, line.Account)
              accounts.push(account)
            }

            let fromto: Account | undefined
            if (line['From/To'] != "") {
              fromto = accounts.find(a => a.name === line['From/To'])
              if (typeof fromto === "undefined") {
                fromto = await createAccount(0, line['From/To'])
                accounts.push(fromto)
              }
            }

            let amount = Number.parseInt(line.Value.replace(".", ""))
            let date = new Date(line.Date)
            let note = line.Notes === "" ? undefined : line.Notes

            let sender: Account | undefined
            let receiver: Account | undefined
            if (amount < 0) {
              sender = account
              receiver = fromto
            } else {
              sender = fromto
              receiver = account
            }

            transactionPromises.push(createTransaction(Math.abs(amount), currency, category, date, sender, receiver, note))
          }
          
          console.log(await Promise.all(transactionPromises))
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
        },
      });
    }
  };

  const createAccount = async (initialAmount: number, name: string): Promise<Account> => {
    let response = await accountService.createAccount(CreateAccountRequest.create({
      initialAmount,
      name,
    })).response

    return new Account(response.id, name, initialAmount)
  }

  const createCategory = async (name: string): Promise<Category> => {
    let response = await categoryService.createCategory(CreateCategoryRequest.create({
      iconName: name,
      name,
    })).response

    return new Category(response.id, name, name)
  }

  const createCurrency = async () => {
    const name = "Canadian Dollar"
    const symbol = "CAD"

    let response = await currencyService.createCurrency(CreateCurrencyRequest.create({
      name,
      symbol
    })).response

    return new Currency(response.id, name, symbol)
  }

  const createTransaction = async (amount: number, currency: Currency, category: Category, date: Date, sender?: Account, receiver?: Account, note?: string) => {
    let response = await transactionService.createTransaction(CreateTransactionRequest.create({
      amount,
      category: category.id,
      currency: currency.id,
      date: Timestamp.fromDate(date),
      note: note,
      receiver: receiver?.id,
      sender: sender?.id,
    })).response

    return new Transaction(response.id, amount, currency.id, category.id, date, sender?.id, receiver?.id, note)
  }

  return (
    <div id="container">
      <p>Import spreadsheet</p>
      <label>Select a file:
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="csvFileInput"
      />
      </label>
    </div>
  );
};

export default ImportSpreadsheet;
