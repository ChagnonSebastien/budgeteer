import { Stack, Typography } from '@mui/material'

import { GradientCard } from './Layout'
import PersonAvatar from './PersonAvatar'
import { Email, Person } from '../../domain/model/transactionGroup'
import { ItemProps } from '../accounts/ItemList'

const PersonCard = (props: ItemProps<Email, Person, unknown>) => {
  const { item, onClick = () => {}, selected = false } = props
  const hasDistinctName = item.name.trim() !== '' && item.name !== item.email
  const displayName = hasDistinctName ? item.name : item.email

  return (
    <GradientCard
      $selected={selected}
      $hoverEffect
      onClick={onClick}
      $withGradientBackground={true}
      sx={{ display: 'flex', alignItems: 'center', p: { xs: 1.5, sm: 2 }, gap: 1.5 }}
    >
      <PersonAvatar email={item.email} displayName={displayName} />
      <Stack sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={500} noWrap title={displayName}>
          {displayName}
        </Typography>
        {hasDistinctName && (
          <Typography variant="body2" color="textDisabled" noWrap title={item.email}>
            {item.email}
          </Typography>
        )}
      </Stack>
    </GradientCard>
  )
}

export default PersonCard
