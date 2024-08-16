import {
  IonPage, useIonRouter,
} from "@ionic/react"
import { FC, useCallback, useContext } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import Category from "../domain/model/category"
import { CategoryServiceContext } from "../service/ServiceContext"
import CategoryForm from "../components/CategoryForm"

const CreateCategoryPage: FC = () => {
  const router = useIonRouter()

  const {create: createCategory} = useContext(CategoryServiceContext)

  const onSubmit = useCallback(async (data: Omit<Category, "id">) => {
    await createCategory(data)
    if (router.canGoBack()) {
      router.goBack()
    } else {
      router.push("/categories", "back", "replace")
    }
  }, [])

  return (
    <IonPage>
      <ContentWithHeader title="Create new category" button="return">
        <CategoryForm
          onSubmit={onSubmit}
          submitText="Create"
        />
      </ContentWithHeader>
    </IonPage>

  )
}

export default CreateCategoryPage