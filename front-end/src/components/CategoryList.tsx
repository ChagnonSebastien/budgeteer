import { IonItem, IonLoading } from "@ionic/react"
import { Fragment, useMemo } from "react"
import Category from "../domain/model/category"
import IconCapsule from "./IconCapsule"

interface Props {
  categories?: Category[],
  onSelect?: (value: number) => void
}

export const CategoryList = (props: Props) => {
  const {categories, onSelect} = props

  const roots = useMemo(() => (categories?.filter(c => c.parentId === null) ?? []), [categories])

  const hierarchy = useMemo(() => {
    return categories?.reduce<{[parent: number]: Category[]}>((tree, c) => {
      if (c.parentId === null) return tree
      return {
        ...tree,
        [c.parentId]: [...(tree[c.parentId] ?? []), c],
      }
    }, {}) ?? {}
  }, [categories])

  if (!categories) {
    return <IonLoading/>
  }

  const renderCategory = (category: Category, onSelect: (value: number) => void, depth: number): JSX.Element => {
    return (
      <Fragment key={`category-list-id-${category.id}`}>
        <IonItem
          onClick={() => onSelect(category.id)}
          style={{marginLeft: `${depth * 2}rem`}}
        >
          <div style={{display: "flex", alignItems: "center"}}>
            <IconCapsule iconName={category.iconName}
                         size={"2rem"}
                         color={category.iconColor}
                         backgroundColor={category.iconBackground}
            />
            <div style={{width: "1rem"}}/>
            <p>{category.name}</p>
          </div>
        </IonItem>
        {hierarchy[category.id]?.map(c => renderCategory(c, onSelect, depth + 1))}
      </Fragment>
    )
  }

  return (
    <>
      {roots.map(category => renderCategory(
        category,
        onSelect ?? (_ => {
        }),
        0))}
    </>
  )
}