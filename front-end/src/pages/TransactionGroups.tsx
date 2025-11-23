import { Typography } from '@mui/material'
import React, { FC, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ItemList from '../components/accounts/ItemList'
import { IconToolsContext } from '../components/icons/IconTools'
import BasicModal from '../components/shared/BasicModal'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, FancyModal } from '../components/shared/FancyModal'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import { TransactionGroupCard } from '../components/transactionGroup/transactionGroupCard'
import TransactionGroup from '../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

const TransactionGroups: FC = () => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const [clickedTransactionGroup, setClickedTransactionGroup] = useState<TransactionGroup | null>(null)

  const scrollingContainerRef = useRef<HTMLDivElement>(null)

  return (
    <ContentWithHeader title="Transaction Groups" action="menu" withPadding>
      <ScrollingOverButton
        button={{ text: 'New', onClick: () => navigate('/transaction-group/new') }}
        scrollingContainerRef={scrollingContainerRef}
        contentStyle={{ maxWidth: '40rem' }}
      >
        <CustomScrolling
          ref={scrollingContainerRef}
          style={{
            overflowY: 'auto',
            flexGrow: 1,
            paddingBottom: '4rem',
            position: 'relative',
          }}
        >
          <ItemList
            items={transactionGroups}
            selectConfiguration={{
              mode: 'click',
              onClick: setClickedTransactionGroup,
            }}
            ItemComponent={TransactionGroupCard}
            additionalItemsProps={{}}
          />
        </CustomScrolling>
      </ScrollingOverButton>
      <BasicModal
        open={clickedTransactionGroup !== null}
        onClose={() => setClickedTransactionGroup(null)}
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
        {clickedTransactionGroup !== null && (
          <FancyModal
            title={{
              topCategory: 'Category',
              bigTitle: clickedTransactionGroup.name,
              bottomSpec: {
                IconComponent: IconLib.MdArrowForwardIos,
                text: 'tbd',
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Category',
                color: '#64B5F6',
                description: 'Modify category details',
                action: () => navigate(`/categories/edit/${clickedTransactionGroup.id}`),
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
                label: 'View Transaction Group',
                color: '#81C784',
                description: 'See all transactions in the group',
                action: () => navigate(`/transactions?categories=[${clickedTransactionGroup.id}]`),
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

            <DetailCard delay={0} title="tbd" subTitle="tbd" value={'tbd'} />
          </FancyModal>
        )}
      </BasicModal>
    </ContentWithHeader>
  )
}

export default TransactionGroups
