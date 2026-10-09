import React, { FC, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import ItemList from '../components/accounts/ItemList'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import { TransactionGroupCard } from '../components/transactionGroup/TransactionGroupCard'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

interface Props {
  // Guests have no currencies or categories, so they can join groups but not create them.
  canCreate?: boolean
}

const TransactionGroups: FC<Props> = ({ canCreate = true }) => {
  const navigate = useNavigate()
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)

  const scrollingContainerRef = useRef<HTMLDivElement>(null)

  const list = (
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
  )

  return (
    <ContentWithHeader title="Transaction Groups" action="menu" withPadding>
      {canCreate ? (
        <ScrollingOverButton
          button={{ text: 'New', onClick: () => navigate('/transaction-groups/new') }}
          scrollingContainerRef={scrollingContainerRef}
          contentStyle={{ maxWidth: '40rem' }}
        >
          {list}
        </ScrollingOverButton>
      ) : (
        list
      )}
    </ContentWithHeader>
  )
}

export default TransactionGroups
