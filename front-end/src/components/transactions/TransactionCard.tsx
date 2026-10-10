import { Box, ButtonBase, Stack, Typography } from '@mui/material'
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
  'GrTransaction',
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
      '&:hover': { bgcolor: 'action.hover' },
    }}
  >
    {icon}
    <Typography variant="body2" fontWeight={500}>
      {label}
    </Typography>
  </ButtonBase>
)

export const CardTitleRow: FC<{ amount: ReactNode; date: ReactNode }> = ({ amount, date }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
    <Typography fontWeight={600} whiteSpace="nowrap">
      {amount}
    </Typography>
    <Typography variant="body2" color="textDisabled" whiteSpace="nowrap">
      {date}
    </Typography>
  </Stack>
)

const TransactionCard: FC<ItemProps<TransactionID, AugmentedTransaction, object>> = memo((props) => {
  const { item, onClick } = props
  const group = item.augmentedTransactionGroupData?.transactionGroup ?? item.settlementGroup

  const { privacyMode } = useContext(DrawerContext)

  const cardType = item.getType()
  const tint = cardType === 'expense' || cardType === 'income' || cardType === 'financialIncome' ? cardType : 'transfer'
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
      <CardTitleRow
        amount={
          <>
            {formatFull(item.currency, item.amount, privacyMode)}
            {item.currency.id !== item.receiverCurrency.id &&
              ` ➜ ${formatFull(item.receiverCurrency, item.receiverAmount, privacyMode)}`}
          </>
        }
        date={item.date.toDateString()}
      />

      <Stack direction="row" justifyContent="space-between" spacing={1.5}>
        <Stack sx={{ whiteSpace: 'nowrap', ...ellipsis }}>
          {[
            ['From:', item.sender?.name],
            ['To:', item.receiver?.name],
          ].map(([label, name]) => (
            <Stack key={label} direction="row" spacing={1}>
              <Typography variant="body2" color="textDisabled">
                {label}
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={ellipsis}>
                {name ?? '-'}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Typography
          variant="body2"
          align="right"
          sx={{ alignSelf: 'stretch', flexShrink: 4, minWidth: 0, ...ellipsis }}
        >
          {item.note}
        </Typography>
      </Stack>
    </CardShell>
  )
})

export default TransactionCard
