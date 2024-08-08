export class Transaction {
    id: number
    amount: number
    currency: number
    sender?: number
    receiver?: number
    category: number
    date: Date
    note?: string

    constructor(id: number, amount: number, currency: number, category: number, date: Date, sender?: number, receiver?: number, note?: string) {
        this.id = id
        this.amount = amount
        this.currency = currency
        this.sender = sender
        this.receiver = receiver
        this.category = category
        this.date = date
        this.note = note
    }
}