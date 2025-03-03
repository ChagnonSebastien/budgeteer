import Unique from '../domain/model/Unique'

export interface BasicCrudService<T extends Unique> {
  state: T[]

  create(data: Omit<T, 'id' | 'hasName'>): Promise<T>

  update(id: number, data: Partial<Omit<T, 'id' | 'hasName'>>): Promise<void>
}
