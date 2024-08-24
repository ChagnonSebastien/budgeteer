import { IonPage, useIonRouter } from '@ionic/react'
import { FC, useCallback, useContext, useMemo } from 'react'
import { useParams } from 'react-router'

import CategoryForm from '../components/CategoryForm'
import ContentWithHeader from '../components/ContentWithHeader'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

interface Params {
  categoryId: string
}

const EditCategoryPage: FC = () => {
  const router = useIonRouter()

  const { categoryId } = useParams<Params>()
  const { state: categories, update: updateCategory } = useContext(CategoryServiceContext)
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === parseInt(categoryId)),
    [categories, categoryId],
  )

  const onSubmit = useCallback(
    async (data: Omit<Category, 'id'>) => {
      if (typeof selectedCategory === 'undefined') return

      await updateCategory(selectedCategory!.id, data)

      if (router.canGoBack()) {
        router.goBack()
      } else {
        router.push('/categories', 'back', 'replace')
      }
    },
    [updateCategory, selectedCategory],
  )

  if (typeof selectedCategory === 'undefined') {
    router.push('/categories', 'back', 'replace')
    return null
  }

  return (
    <IonPage>
      <ContentWithHeader title="Edit category" button="return">
        <CategoryForm onSubmit={onSubmit} submitText="Save changes" initialCategory={selectedCategory} />
      </ContentWithHeader>
    </IonPage>
  )
}

export default EditCategoryPage
