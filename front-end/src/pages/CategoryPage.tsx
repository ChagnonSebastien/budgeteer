import { Typography } from '@mui/material'
import { FC, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CategoryCard } from '../components/categories/CategoryCard'
import { CategoryList } from '../components/categories/CategoryList'
import { IconToolsContext } from '../components/icons/IconTools'
import ContentDialog from '../components/shared/ContentDialog'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, FancyModal } from '../components/shared/FancyModalComponents'
import ScrollingOverButton, { CustomScrollbarContainer } from '../components/shared/ScrollingOverButton'
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
      >
        <CustomScrollbarContainer
          ref={scrollingContainerRef}
          style={{
            overflowY: 'auto',
            flexGrow: 1,
            paddingBottom: '4rem',
            position: 'relative',
          }}
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
        </CustomScrollbarContainer>
      </ScrollingOverButton>
      <ContentDialog
        open={clickedCategory !== null}
        onClose={() => setClickedCategory(null)}
        slotProps={{
          paper: {
            style: {
              backgroundColor: 'transparent',
              borderRadius: '24px',
              border: '0',
              overflow: 'hidden',
            },
          },
        }}
      >
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
                color: '#64B5F6',
                description: 'Modify category details',
                action: () => navigate(`/categories/edit/${clickedCategory.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Category',
                color: '#EF5350',
                description: 'Remove this category',
                action: () => {},
                disabled: true,
              },
              {
                Icon: IconLib.MdList,
                label: 'View Transactions',
                color: '#81C784',
                description: 'See all category transactions',
                action: () => navigate(`/transactions?categories=[${clickedCategory.id}]`),
                disabled: false,
              },
            ]}
          >
            <Typography
              variant="subtitle2"
              style={{
                opacity: 0.6,
                marginBottom: '16px',
                letterSpacing: '0.05em',
                fontSize: '0.75rem',
              }}
            >
              DETAILS
            </Typography>

            <DetailCard
              delay={0}
              title="Fixed Costs"
              subTitle="Recurring expenses"
              value={clickedCategory.fixedCosts ? 'Yes' : 'No'}
            />
          </FancyModal>
        )}
      </ContentDialog>
    </ContentWithHeader>
  )
}

export default CategoryPage
