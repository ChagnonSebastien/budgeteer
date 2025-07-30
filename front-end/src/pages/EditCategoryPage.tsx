import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import CategoryForm from '../components/categories/CategoryForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { CrudFormContainer } from '../components/shared/CrudFormContainer'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

type Params = {
  categoryId: string
}

const EditCategoryPage: FC = () => {
  const navigate = useNavigate()
  const { categoryId } = useParams<Params>()
  const { state: categories, update: updateCategory } = useContext(CategoryServiceContext)
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === parseInt(categoryId!)),
    [categories, categoryId],
  )

  const onSubmit = useCallback(
    async (data: Partial<Omit<Category, 'id' | 'hasName'>>) => {
      if (typeof selectedCategory === 'undefined') return

      await updateCategory({ id: selectedCategory!.id }, data)

      navigate(-1)
    },
    [updateCategory, selectedCategory],
  )

  if (typeof selectedCategory === 'undefined') {
    navigate('/categories', { replace: true })
    return null
  }

  return (
    <ContentWithHeader title="Edit category" button="return">
      <CrudFormContainer className="p-4">
        <CategoryForm onSubmit={onSubmit} submitText="Save changes" initialCategory={selectedCategory} />
      </CrudFormContainer>
    </ContentWithHeader>
  )
}

export default EditCategoryPage
