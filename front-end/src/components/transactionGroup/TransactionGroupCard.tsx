import { Stack, Typography, useTheme } from '@mui/material'
import { format, isSameDay, isSameYear } from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import { UserContext } from '../../App'
import Currency, { formatFull } from '../../domain/model/currency'
import TransactionGroup, { TransactionGroupID } from '../../domain/model/transactionGroup'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { ItemProps } from '../accounts/ItemList'
import IconCapsule from '../icons/IconCapsule'
import { PreparedIcon } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import { GradientCard } from '../shared/Layout'

export interface GroupBalance {
  balance: number
  currency: Currency
}

export interface GroupSummary extends GroupBalance {
  firstDate: Date | null
  lastDate: Date | null
}

export const dateRange = ({ firstDate, lastDate }: GroupSummary): string => {
  if (!firstDate || !lastDate) return 'No transactions yet'
  if (isSameDay(firstDate, lastDate)) return format(lastDate, 'MMM d, yyyy')
  if (isSameYear(firstDate, lastDate)) return `${format(firstDate, 'MMM d')} – ${format(lastDate, 'MMM d, yyyy')}`
  return `${format(firstDate, 'MMM d, yyyy')} – ${format(lastDate, 'MMM d, yyyy')}`
}

type Props = ItemProps<TransactionGroupID, TransactionGroup, { summaries?: Map<TransactionGroupID, GroupSummary> }>

export const BalanceText: FC<GroupBalance & { settledLabel?: string }> = ({
  balance,
  currency,
  settledLabel = 'Settled up',
}) => {
  const { privacyMode } = useContext(DrawerContext)
  const amount = formatFull(currency, Math.abs(balance), privacyMode)

  return (
    <Typography
      variant="body2"
      fontWeight="500"
      whiteSpace="nowrap"
      color={balance > 0 ? 'success.main' : balance < 0 ? 'error.main' : 'textDisabled'}
    >
      {balance > 0 ? `You are owed ${amount}` : balance < 0 ? `You owe ${amount}` : settledLabel}
    </Typography>
  )
}

export const TransactionGroupCard = (props: Props) => {
  const theme = useTheme()
  const { item, selected = false, onClick, summaries } = props
  const summary = summaries?.get(item.id)

  const { state: categories } = useContext(CategoryServiceContext)
  const { email, authentification_method } = useContext(UserContext)

  const invited = !item.hasJoined(email)

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
        padding: theme.spacing(2),
        gap: theme.spacing(2),
        opacity: item.hidden ? 0.55 : 1,
      }}
    >
      {authentification_method !== 'guest' && (
        <IconCapsule
          iconName={tgCategory?.iconName ?? PreparedIcon.FaQuestion}
          color={tgCategory?.iconColor ?? theme.palette.text.secondary}
          backgroundColor={tgCategory?.iconBackground ?? theme.palette.grey[800]}
          size="2rem"
        />
      )}
      <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle1">{item.name}</Typography>
        {summary && (
          <Typography variant="caption" color="textDisabled">
            {dateRange(summary)}
          </Typography>
        )}
      </Stack>
      {invited ? (
        <Typography variant="caption" color="warning">
          Invited
        </Typography>
      ) : item.hidden ? (
        <Typography variant="caption" color="textDisabled">
          Hidden
        </Typography>
      ) : (
        summary && <BalanceText {...summary} />
      )}
    </GradientCard>
  )
}
