import React, { FC } from 'react'

import ContentWithHeader from '../components/shared/ContentWithHeader'

const TransactionGroups: FC = () => {
  return (
    <ContentWithHeader title="Transaction Groups" action="menu" withPadding>
      <p>Hello Groups!</p>
    </ContentWithHeader>
  )
}

export default TransactionGroups
