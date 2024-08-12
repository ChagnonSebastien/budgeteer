import { FC } from "react"
import IconList from "../components/IconList"
import PageWithHeader from "../components/PageWithHeader"

const CategoryPage: FC = () => {
  return (
    <PageWithHeader title="Categories" button="menu">
      <IconList/>
    </PageWithHeader>
  )
}

export default CategoryPage
