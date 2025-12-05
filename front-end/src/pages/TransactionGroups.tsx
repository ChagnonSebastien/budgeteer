import React, { FC, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import ItemList from '../components/accounts/ItemList'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import { TransactionGroupCard } from '../components/transactionGroup/TransactionGroupCard'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

const TransactionGroups: FC = () => {
  const navigate = useNavigate()
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)

  const scrollingContainerRef = useRef<HTMLDivElement>(null)

  return (
    <ContentWithHeader title="Transaction Groups" action="menu" withPadding>
      <ScrollingOverButton
        button={{ text: 'New', onClick: () => navigate('/transaction-groups/new') }}
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
              onClick: (clicked) => navigate(`/transaction-groups/manage/${clicked.id}`),
            }}
            ItemComponent={TransactionGroupCard}
            additionalItemsProps={{}}
          />
        </CustomScrolling>
      </ScrollingOverButton>
    </ContentWithHeader>
  )
}

export default TransactionGroups
