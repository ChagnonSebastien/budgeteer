export interface Converter<Model, DTO> {
    toModel(dto: DTO): Model
    toDTO(model: Model): DTO
}