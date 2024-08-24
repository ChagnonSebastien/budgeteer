export interface Converter<Model, DTO> {
  toModel(dto: DTO): Promise<Model>

  toDTO(model: Model): DTO
}
