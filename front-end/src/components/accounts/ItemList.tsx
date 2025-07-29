import { FC, useMemo } from 'react'

import Unique from '../../domain/model/Unique'

export interface ClickConfiguration<ItemID, Item extends Unique<ItemID, Item>> {
  mode: 'click'
  onClick: (item: Item) => void
}

export interface SingleSelectConfiguration<ItemID, Item extends Unique<ItemID, Item>> {
  mode: 'single'
  selectedItem: ItemID | null
  onSelectItem: (item: ItemID) => void
}

export interface MultiSelectConfiguration<ItemID, Item extends Unique<ItemID, Item>> {
  mode: 'multi'
  selectedItems: ItemID[]
  onSelectItems: (items: ItemID[]) => void
}

export type SelectConfiguration<ItemID, Item extends Unique<ItemID, Item>> =
  | ClickConfiguration<ItemID, Item>
  | SingleSelectConfiguration<ItemID, Item>
  | MultiSelectConfiguration<ItemID, Item>

export type ItemProps<ItemID, Item extends Unique<ItemID, Item>, AdditionalItemProps> = {
  item: Item
  selected?: boolean
  onClick?(): void
} & AdditionalItemProps

export interface ItemListProps<ItemID, Item extends Unique<ItemID, Item>, AdditionalItemProps> {
  items: Item[]
  filter?(item: Item): boolean
  selectConfiguration?: SelectConfiguration<ItemID, Item>
  ItemComponent: FC<ItemProps<ItemID, Item, AdditionalItemProps>>
  additionalItemsProps: AdditionalItemProps
}

const ItemList = <ItemID, Item extends Unique<ItemID, Item>, AdditionalItemProps>(
  props: ItemListProps<ItemID, Item, AdditionalItemProps>,
) => {
  const {
    items,
    filter = (_item: Item) => {
      return true
    },
    selectConfiguration,
    ItemComponent,
    additionalItemsProps,
  } = props

  const filteredList = useMemo(() => items.filter(filter), [items, filter])

  const isSelected = (id: ItemID) => {
    if (typeof selectConfiguration === 'undefined') return false

    if (selectConfiguration.mode === 'single') {
      const config = selectConfiguration as SingleSelectConfiguration<ItemID, Item>
      return config.selectedItem === id
    }

    if (selectConfiguration.mode === 'multi') {
      const config = selectConfiguration as MultiSelectConfiguration<ItemID, Item>
      return config.selectedItems.findIndex((i) => i === id) >= 0
    }

    return false
  }

  const click = (item: Item) => {
    if (typeof selectConfiguration === 'undefined') return false

    if (selectConfiguration.mode === 'click') {
      const config = selectConfiguration as ClickConfiguration<ItemID, Item>
      config.onClick(item)
      return
    }

    if (selectConfiguration.mode === 'single') {
      const config = selectConfiguration as SingleSelectConfiguration<ItemID, Item>
      config.onSelectItem(item.id)
      return
    }

    if (selectConfiguration.mode === 'multi') {
      const config = selectConfiguration as MultiSelectConfiguration<ItemID, Item>
      if (config.selectedItems.findIndex((i) => i === item.id) >= 0) {
        config.onSelectItems(config.selectedItems.filter((i) => i !== item.id))
      } else {
        config.onSelectItems([...config.selectedItems, item.id])
      }
      return
    }
  }

  return filteredList.map((item) => (
    <ItemComponent
      key={`item-component-${item.id}`}
      item={item}
      selected={isSelected(item.id)}
      onClick={() => click(item)}
      {...additionalItemsProps}
    />
  ))
}

export default ItemList
