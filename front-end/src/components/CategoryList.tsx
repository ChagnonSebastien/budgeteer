import { IonItem } from "@ionic/react"
import Category from "../domain/model/category"
import IconCapsule from "./IconCapsule"

interface Props {
  categories?: Category[],
  onSelect?: (value: number) => void
}

export const CategoryList = (props: Props) => {
  const {categories, onSelect} = props

  return (
    <>
      {categories?.map(category => (
        <IonItem key={`category-list-id-${category.id}`} onClick={() => {
          onSelect && onSelect(category.id)
        }}>
          <div style={{display: "flex", alignItems: "center"}}>
            <IconCapsule iconName={category.iconName} size={"2rem"} color={"darkslategray"} backgroundColor={"orange"}/>
            <div style={{width: "1rem"}}/>
            <p>{category.name}</p>
          </div>
        </IonItem>
      ))}
    </>
  )
}