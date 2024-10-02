import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import CategoryForm from '../components/CategoryForm'
import ContentWithHeader from '../components/ContentWithHeader'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

const CreateCategoryPage: FC = () => {
  const navigate = useNavigate()

  const { create: createCategory } = useContext(CategoryServiceContext)

  const onSubmit = useCallback(async (data: Omit<Category, 'id'>) => {
    await createCategory(data)
    navigate('/categories', { replace: true })
  }, [])

  return (
    <ContentWithHeader title="Create new category" button="return">
      <CategoryForm onSubmit={onSubmit} submitText="Create" />
    </ContentWithHeader>
  )
}

export default CreateCategoryPage
