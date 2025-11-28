export interface Result<Value> {
  isOk(): boolean
  isErr(): boolean
  unwrap(): Value
  get error(): string
}

export class Ok<Value> implements Result<Value> {
  constructor(private value: Value) {}

  isErr(): boolean {
    return false
  }

  isOk(): boolean {
    return true
  }

  unwrap(): Value {
    return this.value
  }

  get error(): string {
    return ''
  }
}

export class Err<Value> implements Result<Value> {
  constructor(public error: string) {}

  isErr(): boolean {
    return true
  }

  isOk(): boolean {
    return false
  }

  unwrap(): Value {
    throw new Error('Cannot unwrap error result')
  }
}

export interface Validator {
  validate(value: string): Result<unknown>
}

export class NotEmptyValidator implements Validator {
  validate(value: string): Result<unknown> {
    if (value.trim() === '') return new Err('Cannot be empty')

    return new Ok(1)
  }
}

const emailRegex =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export class EmailValidator extends NotEmptyValidator {
  validate(value: string): Result<unknown> {
    const result = super.validate(value)
    if (result.isErr()) return result

    if (!emailRegex.test(value)) return new Err('Not a valid email')

    return new Ok(1)
  }
}
