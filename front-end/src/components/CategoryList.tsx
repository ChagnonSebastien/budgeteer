import { IonItem, IonLoading } from "@ionic/react"
import { Fragment, useContext, useMemo } from "react"
import Category from "../domain/model/category"
import { CategoryServiceContext } from "../service/ServiceContext"
import { doNothing } from "../utils"
import IconCapsule from "./IconCapsule"

interface Props {
  categories?: Category[],
  onSelect?: (value: number) => void
}

export const CategoryList = (props: Props) => {
  const {categories, onSelect} = props
  const {root, subCategories} = useContext(CategoryServiceContext)

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
        {subCategories[category.id]?.map(c => renderCategory(c, onSelect, depth + 1))}
      </Fragment>
    )
  }

  return renderCategory(root, onSelect ?? doNothing, 0)
}