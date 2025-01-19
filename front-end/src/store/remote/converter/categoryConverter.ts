import { Converter } from './converter'
import Category from '../../../domain/model/category'
import { Category as CategoryDto } from '../dto/category'

export class CategoryConverter implements Converter<Category, CategoryDto> {
  toModel(model: CategoryDto): Promise<Category> {
    return Promise.resolve(
      new Category(
        model.id,
        model.name,
        model.iconName,
        model.iconColor,
        model.iconBackground,
        model.parentId === 0 ? null : model.parentId,
        model.fixedCosts,
        model.ordering,
      ),
    )
  }

  toDTO(dto: Category): CategoryDto {
    return CategoryDto.create({
      id: dto.id,
      name: dto.name,
      iconName: dto.iconName,
      iconColor: dto.iconColor,
      iconBackground: dto.iconBackground,
      parentId: dto.parentId ?? undefined,
      fixedCosts: dto.fixedCosts,
      ordering: dto.ordering,
    })
  }
}
