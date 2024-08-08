export class Account {
    id: number
    name: string
    initialAmount: number

    constructor(id: number, name: string, initialAmount: number) {
        this.id = id
        this.name = name
        this.initialAmount = initialAmount
    }
}