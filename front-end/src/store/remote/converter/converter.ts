export interface Converter<Model, ModelDTO, UpdatableFields, UpdatableFieldsDTO> {
  toModel(dto: ModelDTO): Model
  toDTO(model: Model): ModelDTO
  toUpdateDTO(dto: Partial<UpdatableFields>): UpdatableFieldsDTO
}
