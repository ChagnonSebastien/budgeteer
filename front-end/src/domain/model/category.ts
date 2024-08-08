export class Category {
    id: number
    name: string
    iconName: string
    parentId?: number

    constructor(id: number, name: string, iconName: string, parentId?: number) {
        this.id = id
        this.name = name
        this.iconName = iconName
        this.parentId = parentId
    }
}