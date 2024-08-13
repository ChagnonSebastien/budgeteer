import {
  IonButton,
  IonPage, IonRoute, IonRouterOutlet,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext, useEffect, useState } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import Category from "../domain/model/category"
import { CategoryRepositoryContext } from "../service/RepositoryContexts"


const CategoryPage: FC = () => {
  const router = useIonRouter()

  const [categories, setCategories] = useState<Category[]>()

  const categoryRepository = useContext(CategoryRepositoryContext)

  useEffect(() => {
    categoryRepository.getAll().then(setCategories)
  }, [categoryRepository.getAll])

  return (
    <IonPage>
      <ContentWithHeader title="Categories" button="menu">
        <IonButton expand="block" onClick={() => router.push("/categories/new")}>
          New
        </IonButton>
      </ContentWithHeader>
    </IonPage>

  )
}

export default CategoryPage
