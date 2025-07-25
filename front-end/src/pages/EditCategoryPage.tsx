import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import CategoryForm from '../components/categories/CategoryForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

const FormContainer = styled.div`
  width: 100%;
  max-width: 35rem;
  margin: auto;
`

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
      <FormContainer className="p-4">
        <CategoryForm onSubmit={onSubmit} submitText="Save changes" initialCategory={selectedCategory} />
      </FormContainer>
    </ContentWithHeader>
  )
}

export default EditCategoryPage
