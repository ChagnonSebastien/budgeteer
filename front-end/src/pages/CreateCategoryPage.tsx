import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import CategoryForm from '../components/CategoryForm'
import ContentWithHeader from '../components/ContentWithHeader'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

const FormContainer = styled.div`
  width: 100%;
  max-width: 35rem;
  margin: auto;
`

const CreateCategoryPage: FC = () => {
  const navigate = useNavigate()

  const { create: createCategory } = useContext(CategoryServiceContext)

  const onSubmit = useCallback(async (data: Partial<Omit<Category, 'id'>>) => {
    if (typeof data.name === 'undefined') throw new Error('Name cannot be undefined')
    if (typeof data.iconName === 'undefined') throw new Error('iconName cannot be undefined')
    if (typeof data.iconColor === 'undefined') throw new Error('iconColor cannot be undefined')
    if (typeof data.iconBackground === 'undefined') throw new Error('iconBackground cannot be undefined')
    if (typeof data.parentId === 'undefined') throw new Error('parentId cannot be undefined')
    if (typeof data.fixedCosts === 'undefined') throw new Error('fixedCosts cannot be undefined')
    if (typeof data.ordering === 'undefined') throw new Error('ordering cannot be undefined')

    await createCategory({
      name: data.name,
      iconName: data.iconName,
      iconColor: data.iconColor,
      iconBackground: data.iconBackground,
      parentId: data.parentId,
      fixedCosts: data.fixedCosts,
      ordering: data.ordering,
    })
    navigate('/categories', { replace: true })
  }, [])

  return (
    <ContentWithHeader title="Create new category" button="return">
      <FormContainer className="p-4">
        <CategoryForm onSubmit={onSubmit} submitText="Create" />
      </FormContainer>
    </ContentWithHeader>
  )
}

export default CreateCategoryPage
