import Unique from "../domain/model/Unique"

export interface BasicCrudService<T extends Unique> {
  state: T[]

  create(data: Omit<T, "id">): Promise<T>
}
