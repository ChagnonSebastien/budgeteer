import { Category } from "../../domain/model/category";
import { Category as CategoryDto } from "../dto/category";
import { Converter } from "./converter";

export class AccountConverter implements Converter<CategoryDto, Category> {

    toDTO(model: CategoryDto): Category {
            return new Category(model.id, model.name, model.iconName, model.parentId)
    }

    toModel(dto: Category): CategoryDto {
        return CategoryDto.create({
            id: dto.id,
            name: dto.name,
            iconName: dto.iconName,
            parentId: dto.parentId,
        })
    }
    
} 