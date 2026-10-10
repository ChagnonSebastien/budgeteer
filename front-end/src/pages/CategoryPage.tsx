import { FC, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CategoryCard } from '../components/categories/CategoryCard'
import { CategoryList } from '../components/categories/CategoryList'
import { IconToolsContext } from '../components/icons/IconTools'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../components/shared/FancyModal'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

const CategoryPage: FC = () => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { state: categories } = useContext(CategoryServiceContext)
  const [clickedCategory, setClickedCategory] = useState<Category | null>(null)

  const scrollingContainerRef = useRef<HTMLDivElement>(null)

  return (
    <ContentWithHeader title="Categories" action="menu" withPadding>
      <ScrollingOverButton
        button={{ text: 'New', onClick: () => navigate('/categories/new') }}
        scrollingContainerRef={scrollingContainerRef}
        contentWidth="medium"
      >
        <CustomScrolling
          ref={scrollingContainerRef}
          sx={{ overflowY: 'auto', flexGrow: 1, pb: 8, position: 'relative' }}
        >
          <CategoryList
            items={categories}
            selectConfiguration={{
              mode: 'click',
              onClick: setClickedCategory,
            }}
            ItemComponent={CategoryCard}
            additionalItemsProps={{}}
          />
        </CustomScrolling>
      </ScrollingOverButton>
      <FancyDialog open={clickedCategory !== null} onClose={() => setClickedCategory(null)}>
        {clickedCategory !== null && (
          <FancyModal
            title={{
              topCategory: 'Category',
              bigTitle: clickedCategory.name,
              bottomSpec: {
                IconComponent: IconLib.MdArrowForwardIos,
                text: categories.find((c) => c.id === clickedCategory.parentId)?.name ?? '',
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Category',
                intent: 'edit',
                description: 'Modify category details',
                action: () => navigate(`/categories/edit/${clickedCategory.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Category',
                intent: 'destructive',
                description: 'Remove this category',
                action: () => {},
                disabled: true,
              },
              {
                Icon: IconLib.MdList,
                label: 'View Transactions',
                intent: 'navigate',
                description: 'See all category transactions',
                action: () => navigate(`/transactions?categories=[${clickedCategory.id}]`),
                disabled: false,
              },
            ]}
          >
            <DetailHeading>DETAILS</DetailHeading>

            <DetailCard
              delay={0}
              title="Essential expense"
              subTitle="Needs like rent, groceries or transit"
              value={clickedCategory.fixedCosts ? 'Yes' : 'No'}
            />
          </FancyModal>
        )}
      </FancyDialog>
    </ContentWithHeader>
  )
}

export default CategoryPage
