import { Converter } from './converter'
import Category, { CategoryUpdatableFields } from '../../../domain/model/category'
import { Category as CategoryDto, UpdateCategoryFields } from '../dto/category'

export class CategoryConverter
  implements Converter<Category, CategoryDto, CategoryUpdatableFields, UpdateCategoryFields>
{
  toModel(dto: CategoryDto): Category {
    return new Category(
      dto.id,
      dto.name,
      dto.iconName,
      dto.iconColor,
      dto.iconBackground,
      dto.parentId === 0 ? null : dto.parentId,
      dto.fixedCosts,
      dto.ordering,
    )
  }

  toDTO(model: Category): CategoryDto {
    return CategoryDto.create({
      id: model.id,
      name: model.name,
      iconName: model.iconName,
      iconColor: model.iconColor,
      iconBackground: model.iconBackground,
      parentId: model.parentId ?? undefined,
      fixedCosts: model.fixedCosts,
      ordering: model.ordering,
    })
  }

  toUpdateDTO(model: Partial<CategoryUpdatableFields>): UpdateCategoryFields {
    return UpdateCategoryFields.create({
      name: model.name,
      iconName: model.iconName,
      iconColor: model.iconColor,
      iconBackground: model.iconBackground,
      updateParentId: typeof model.parentId !== 'undefined',
      parentId: model.parentId ?? undefined,
      fixedCosts: model.fixedCosts,
      ordering: model.ordering,
    })
  }
}
