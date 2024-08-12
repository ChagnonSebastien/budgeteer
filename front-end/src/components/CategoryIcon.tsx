import { FC } from "react"
import Category from "../domain/model/category"

interface Props {
  category: Category
}

const CategoryIcon: FC<Props> = ({category}) => {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "2.4rem",
      width: "2.4rem",
      borderRadius: "1.2rem",
      backgroundColor: "lime",
      flexShrink: 0,
      fontSize: "1.5rem",
    }}>
      {category.name.charAt(0).toUpperCase()}
    </div>
  )
}