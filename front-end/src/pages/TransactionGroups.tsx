import { Typography } from '@mui/material'
import React, { FC, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ItemList from '../components/accounts/ItemList'
import { IconToolsContext } from '../components/icons/IconTools'
import BasicModal from '../components/shared/BasicModal'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, FancyModal } from '../components/shared/FancyModal'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import { TransactionGroupCard } from '../components/transactionGroup/TransactionGroupCard'
import TransactionGroup, { SplitTypeToString } from '../domain/model/transactionGroup'
import {
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionGroupServiceContext,
} from '../service/ServiceContext'

const TransactionGroups: FC = () => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { state: categories } = useContext(CategoryServiceContext)
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
              topCategory: 'Transaction Group',
              bigTitle: clickedTransactionGroup.name,
              bottomSpec: {
                IconComponent: IconLib.MdArrowForwardIos,
                text: `With: ${clickedTransactionGroup.members.map((m) => m.name).join(', ')}`,
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdList,
                label: 'View Transaction Group',
                color: '#81C784',
                description: 'See all transactions in the group',
                action: () => navigate(`/transactions?categories=[${clickedTransactionGroup.id}]`),
                disabled: false,
              },
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Transaction Group',
                color: '#64B5F6',
                description: 'Modify transaction group details',
                action: () => navigate(`/categories/edit/${clickedTransactionGroup.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete transaction group',
                color: '#EF5350',
                description: 'Remove this transaction group',
                action: () => {},
                disabled: true,
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
              title="Split type"
              subTitle=""
              value={SplitTypeToString(clickedTransactionGroup.splitType)}
            />

            <DetailCard
              delay={0}
              title="Currency"
              subTitle=""
              value={currencies.find((c) => c.id === clickedTransactionGroup.currency)?.name ?? 'Undefined'}
            />

            <DetailCard
              delay={0}
              title="Category"
              subTitle=""
              value={categories.find((c) => c.id === clickedTransactionGroup.category)?.name ?? 'Undefined'}
            />
          </FancyModal>
        )}
      </BasicModal>
    </ContentWithHeader>
  )
}

export default TransactionGroups
