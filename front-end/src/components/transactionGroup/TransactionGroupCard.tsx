import { Typography } from '@mui/material'
import { useContext, useMemo } from 'react'

import TransactionGroup, { TransactionGroupID } from '../../domain/model/transactionGroup'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { ItemProps } from '../accounts/ItemList'
import IconCapsule from '../icons/IconCapsule'
import { PreparedIcon } from '../icons/IconTools'
import { GradientCard } from '../shared/Layout'

type Props = ItemProps<TransactionGroupID, TransactionGroup, unknown>

export const TransactionGroupCard = (props: Props) => {
  const { item, selected = false, onClick } = props

  const { state: categories } = useContext(CategoryServiceContext)

  const tgCategory = useMemo(
    () => categories.find((category) => category.id === item.category),
    [item.category, categories],
  )

  return (
    <GradientCard
      $selected={selected}
      $hoverEffect
      onClick={onClick}
      $withGradientBackground={true}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1rem',
        gap: '1rem',
      }}
    >
      <IconCapsule
        iconName={tgCategory?.iconName ?? PreparedIcon.FaQuestion}
        color={tgCategory?.iconColor ?? '#DDD'}
        backgroundColor={tgCategory?.iconBackground ?? '#444'}
        size="2rem"
      />
      <Typography flexGrow={1} variant="subtitle1">
        {item.name}
      </Typography>
    </GradientCard>
  )
}
