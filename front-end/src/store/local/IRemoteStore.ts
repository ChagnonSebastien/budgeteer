export default interface RemoteStore<T, U> {
  getAll(): Promise<T[]>
  create(data: U): Promise<T>
  update(id: number, data: Partial<U>): Promise<void>
}
