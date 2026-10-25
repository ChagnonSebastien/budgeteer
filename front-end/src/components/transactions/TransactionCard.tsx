import { Box, ButtonBase, Stack, Typography } from '@mui/material'
import { formatDate, isSameYear } from 'date-fns'
import { FC, memo, ReactNode, useContext } from 'react'

import Category from '../../domain/model/category'
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { ItemProps } from '../accounts/ItemList'
import IconCapsule from '../icons/IconCapsule'
import { DrawerContext } from '../Menu'

const defaultCategory = new Category(
  0,
  'Transfer Between accounts',
  'TbArrowsExchange',
  'var(--ion-color-dark-contrast)',
  'var(--ion-color-dark)',
  null,
  false,
  0,
)

export const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis' }

export const CardShell: FC<{
  header?: ReactNode
  footer?: ReactNode
  tint?: string
  icon?: ReactNode
  aside?: ReactNode
  onClick?(): void
  children: ReactNode
}> = ({ header, footer, tint = 'surface.muted', icon, aside, onClick, children }) => (
  <Stack sx={{ bgcolor: 'surface.raised', border: 1, borderColor: 'surface.raised', borderRadius: (t) => t.radius.md }}>
    {header && (
      <Typography variant="body2" fontWeight={500} textAlign="center" sx={{ py: 0.25, ...ellipsis }}>
        {header}
      </Typography>
    )}
    <Box sx={{ bgcolor: 'background.default', borderRadius: (t) => t.radius.md, overflow: 'hidden' }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        onClick={onClick}
        sx={{ bgcolor: tint, py: 1, px: 1.5, overflowX: 'auto' }}
      >
        {icon}
        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Stack>
        {aside && (
          <Stack alignItems="center" textAlign="center" sx={{ width: '6.5rem', flexShrink: 0 }}>
            {aside}
          </Stack>
        )}
      </Stack>
    </Box>
    {footer}
  </Stack>
)

export const CardAction: FC<{
  onClick(): void
  disabled?: boolean
  color: string
  icon: ReactNode
  label: string
}> = ({ onClick, disabled, color, icon, label }) => (
  <ButtonBase
    onClick={onClick}
    disabled={disabled}
    sx={{
      gap: 0.5,
      py: 0.5,
      px: 1,
      borderRadius: (t) => `0 0 ${t.radius.md} ${t.radius.md}`,
      color,
      '@media (hover: hover)': { '&:hover': { bgcolor: 'action.hover' } },
    }}
  >
    {icon}
    <Typography variant="body2" fontWeight={500}>
      {label}
    </Typography>
  </ButtonBase>
)

export const CardTitleRow: FC<{ amount: ReactNode; date: ReactNode; convertedAmount?: ReactNode }> = ({
  amount,
  date,
  convertedAmount,
}) => (
  <>
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography fontWeight={600} whiteSpace="nowrap" sx={{ minWidth: 0, ...ellipsis }}>
        {amount}
      </Typography>
      <Typography variant="body2" color="textDisabled" whiteSpace="nowrap" sx={{ flexShrink: 0 }}>
        {date}
      </Typography>
    </Stack>
    {convertedAmount && (
      <Typography variant="body2" color="text.secondary" whiteSpace="nowrap" sx={ellipsis}>
        ➜ {convertedAmount}
      </Typography>
    )}
  </>
)

const shortDate = (date: Date) => formatDate(date, isSameYear(date, new Date()) ? 'EEE MMM d' : 'EEE MMM d, yyyy')

const TransactionCard: FC<ItemProps<TransactionID, AugmentedTransaction, object>> = memo((props) => {
  const { item, onClick } = props
  const group = item.augmentedTransactionGroupData?.transactionGroup ?? item.settlementGroup

  const { privacyMode } = useContext(DrawerContext)

  const cardType = item.getType()
  const tint = cardType === 'expense' || cardType === 'income' || cardType === 'financialIncome' ? cardType : 'transfer'
  const incoming = !!item.receiver?.isMine && !item.sender?.isMine
  const title = item.note || item.category?.name || 'Transfer'
  const converted = item.currency.id !== item.receiverCurrency.id

  return (
    <CardShell
      header={group && !group.hidden ? group.name : undefined}
      tint={`transactionTint.${tint}`}
      onClick={onClick}
      icon={
        <IconCapsule
          iconName={item.category?.iconName ?? defaultCategory.iconName}
          size="2.4rem"
          backgroundColor={item.category?.iconBackground ?? defaultCategory.iconBackground}
          color={item.category?.iconColor ?? defaultCategory.iconColor}
        />
      }
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} noWrap title={title}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {item.sender?.name ?? '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            <Box component="span" sx={{ color: 'text.disabled', mr: 0.5 }}>
              ↳
            </Box>
            {item.receiver?.name ?? '-'}
          </Typography>
        </Stack>

        <Stack alignItems="flex-end" sx={{ flexShrink: 0, maxWidth: '55%' }}>
          <Typography
            fontWeight={600}
            noWrap
            sx={{
              maxWidth: '100%',
              color: incoming ? 'money.gain' : 'text.primary',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {incoming && !privacyMode && '+'}
            {formatFull(item.currency, item.amount, privacyMode)}
          </Typography>
          {converted && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '100%' }}>
              ➜ {formatFull(item.receiverCurrency, item.receiverAmount, privacyMode)}
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled" noWrap>
            {shortDate(item.date)}
          </Typography>
        </Stack>
      </Stack>
    </CardShell>
  )
})

export default TransactionCard
