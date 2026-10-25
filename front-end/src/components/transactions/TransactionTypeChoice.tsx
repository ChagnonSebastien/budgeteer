import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material'
import { FC, useContext, useMemo } from 'react'
import type { IconType } from 'react-icons'

import { TransactionType } from './TransactionForm'
import { IconToolsContext } from '../icons/IconTools'
import { ActionColor } from '../shared/ActionSpeedDial'

export type ChoosableType = Exclude<TransactionType, 'financialIncome'>

interface TransactionTypeOption {
  type: ChoosableType
  label: string
  description: string
  Icon: IconType
  color: ActionColor
}

export const useTransactionTypeOptions = (): TransactionTypeOption[] => {
  const { IconLib } = useContext(IconToolsContext)
  return useMemo(
    () => [
      {
        type: 'expense',
        label: 'Expense',
        description: 'Money you spent from one of your accounts.',
        Icon: IconLib.MdOutput,
        color: 'money.loss',
      },
      {
        type: 'income',
        label: 'Income',
        description: 'Money you received in one of your accounts.',
        Icon: IconLib.MdInput,
        color: 'money.gain',
      },
      {
        type: 'transfer',
        label: 'Transfer',
        description: 'Money you moved between two of your accounts.',
        Icon: IconLib.GrTransaction,
        color: 'grey.500',
      },
    ],
    [IconLib],
  )
}

const TransactionTypeChoice: FC<{ onChoose: (type: ChoosableType) => void }> = ({ onChoose }) => {
  const options = useTransactionTypeOptions()

  return (
    <Stack spacing={2} sx={{ maxWidth: (t) => t.contentWidth.compact, width: '100%', mx: 'auto' }}>
      <Typography color="textSecondary">What kind of transaction do you want to record?</Typography>
      {options.map(({ type, label, description, Icon, color }) => (
        <Paper
          key={type}
          variant="outlined"
          sx={(t) => ({ borderRadius: t.radius.card, borderColor: 'border.subtle', overflow: 'hidden' })}
        >
          <ButtonBase
            onClick={() => onChoose(type)}
            sx={{ width: '100%', p: 2, gap: 2, justifyContent: 'start', textAlign: 'start' }}
          >
            <Box
              sx={{
                display: 'flex',
                flexShrink: 0,
                p: 1,
                borderRadius: (t) => t.radius.round,
                bgcolor: color,
                color: 'common.white',
              }}
            >
              <Icon size="1.5rem" />
            </Box>
            <Box>
              <Typography variant="h6">{label}</Typography>
              <Typography variant="body2" color="textSecondary">
                {description}
              </Typography>
            </Box>
          </ButtonBase>
        </Paper>
      ))}
    </Stack>
  )
}

export default TransactionTypeChoice
