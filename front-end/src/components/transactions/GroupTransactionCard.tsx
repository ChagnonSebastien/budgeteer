import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, memo, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { CardAction, CardShell, CardTitleRow, ellipsis } from './TransactionCard'
import { UserContext, useGuestView } from '../../App'
import { formatFull } from '../../domain/model/currency'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { UnconfirmedAugmentedTransaction } from '../../domain/model/unconfirmedTransaction'
import { ItemProps } from '../accounts/ItemList'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import SettlementCard from '../transactionGroup/SettlementCard'

const GroupTransactionCard: FC<ItemProps<TransactionID, AugmentedTransaction, object>> = memo((props) => {
  const { item, onClick } = props

  const { privacyMode } = useContext(DrawerContext)
  const { email } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const navigate = useNavigate()
  const isGuest = useGuestView()

  const userContribution = useMemo(() => item.getUserContribution(email), [item, email])

  if (item instanceof SettlementAugmentedTransaction) {
    return <SettlementCard item={item} onClick={onClick} />
  }

  if (item.augmentedTransactionGroupData === null) {
    return <p>Transaction is not part of a group</p>
  }

  const members = item.augmentedTransactionGroupData.transactionGroup.members
  const payedBy = members.find((m) => m.email === item.owner)
  const splitSummary = item.splitSummary(email)
  const isUnconfirmed = item instanceof UnconfirmedAugmentedTransaction
  const promotable =
    item instanceof UnconfirmedAugmentedTransaction && !isGuest && item.owner === email ? item.unconfirmed : null

  const groupCurrency = item.augmentedTransactionGroupData.transactionGroup.augmentedCurrency

  return (
    <CardShell
      onClick={onClick}
      footer={
        promotable && (
          <CardAction
            onClick={() =>
              navigate(
                `/transaction-groups/manage/${promotable.transactionGroupId}/unconfirmed/${promotable.id}/promote`,
              )
            }
            color="primary.main"
            icon={<IconLib.TbCirclePlus />}
            label="Confirm and add to my transactions"
          />
        )
      }
      aside={
        <>
          {userContribution === 0 ? (
            <Typography variant="body2" fontWeight={500} color="textDisabled">
              Not involved
            </Typography>
          ) : (
            <>
              <Typography variant="body2" fontWeight={500}>
                {userContribution > 0 ? 'You lent' : 'You owe'}
              </Typography>
              <Typography variant="body2" fontWeight={700} whiteSpace="nowrap">
                {formatFull(groupCurrency, Math.abs(userContribution), privacyMode)}
              </Typography>
            </>
          )}
          {splitSummary && (
            <Tooltip
              enterTouchDelay={0}
              title={item.memberParts().map(({ email: memberEmail, part }) => (
                <div key={memberEmail}>
                  {members.find((m) => m.email === memberEmail)?.name ?? memberEmail}:{' '}
                  {formatFull(item.currency, part, privacyMode)}
                </div>
              ))}
            >
              <Typography
                variant="caption"
                color="textDisabled"
                lineHeight={1.2}
                sx={{ mt: 0.25, textDecoration: 'underline dotted' }}
              >
                {splitSummary}
              </Typography>
            </Tooltip>
          )}
        </>
      }
    >
      <CardTitleRow
        amount={formatFull(item.currency, item.amount, privacyMode)}
        date={formatDate(item.date, 'MMM d')}
      />

      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} sx={ellipsis}>
          Paid by: <b>{payedBy?.name ?? item.owner}</b>
        </Typography>
        {!isUnconfirmed && (
          <Tooltip
            title={
              item.owner === email
                ? 'Confirmed, it is part of your transactions'
                : 'Confirmed by the payer, it can no longer be edited'
            }
          >
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
              <IconLib.MdCheckCircle />
            </Box>
          </Tooltip>
        )}
      </Stack>

      {item.note && (
        <Typography variant="body2" sx={{ minWidth: 0, ...ellipsis }}>
          For: {item.note}
        </Typography>
      )}
    </CardShell>
  )
})

export default GroupTransactionCard
