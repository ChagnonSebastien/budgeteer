import {
  IonButton,
  IonPage,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext } from "react"
import { CategoryList } from "../components/CategoryList"
import ContentWithHeader from "../components/ContentWithHeader"
import { CategoryServiceContext } from "../service/ServiceContext"


const CategoryPage: FC = () => {
  const router = useIonRouter()

  const {state: categories} = useContext(CategoryServiceContext)

  return (
    <IonPage>
      <ContentWithHeader title="Categories" button="menu">
        <div style={{margin: "1rem"}}>
          <IonButton expand="block" onClick={() => router.push("/categories/new")}>
            New
          </IonButton>
          <div style={{height: "1rem"}}/>
          <CategoryList categories={categories} onSelect={categoryId => router.push(`/categories/edit/${categoryId}`)}/>
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default CategoryPage
