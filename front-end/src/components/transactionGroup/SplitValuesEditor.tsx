import { Checkbox, TextField, Typography } from '@mui/material'
import { FC } from 'react'

import Currency, { formatFull } from '../../domain/model/currency'
import { MemberSplitValues, Person } from '../../domain/model/transactionGroup'
import { FixedPointInput } from '../inputs/FixedPointInput'
import { Column, Row } from '../shared/Layout'

export type SplitValueKind = 'participants' | 'percentage' | 'shares' | 'amount'

export const splitValuesError = (kind: SplitValueKind, values: MemberSplitValues, amount?: number): string | null => {
  const total = [...values.values()].reduce<number>((sum, v) => sum + (v ?? 0), 0)
  if (kind === 'percentage' && total !== 100) return `Percentages add up to ${total}%, not 100%`
  if (kind === 'shares' && total === 0) return 'At least one member needs a share'
  if (kind === 'participants' && values.size === 0) return 'At least one member must take part'
  if (kind === 'amount' && typeof amount !== 'undefined' && total !== amount) return 'Amounts must add up to the total'
  return null
}

const SplitValuesEditor: FC<{
  kind: SplitValueKind
  members: Person[]
  values: MemberSplitValues
  onChange(values: MemberSplitValues): void
  currency?: Currency
  amount?: number
}> = ({ kind, members, values, onChange, currency, amount }) => {
  const setValue = (email: string, value: number | null) => onChange(new Map(values).set(email, value))
  const error = splitValuesError(kind, values, amount)
  const total = [...values.values()].reduce<number>((sum, v) => sum + (v ?? 0), 0)

  return (
    <Column style={{ gap: '0.75rem', alignSelf: 'stretch' }}>
      {members.map((member) => (
        <Row key={member.email} style={{ alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <Typography fontSize="0.95rem" textOverflow="ellipsis" overflow="hidden">
            {member.name}
          </Typography>
          {kind === 'participants' ? (
            <Checkbox
              checked={values.has(member.email)}
              onChange={(e) => {
                const next = new Map(values)
                if (e.target.checked) next.set(member.email, null)
                else next.delete(member.email)
                onChange(next)
              }}
            />
          ) : kind === 'amount' && currency ? (
            <FixedPointInput
              value={values.get(member.email) ?? 0}
              onChange={(value) => setValue(member.email, value)}
              decimalPoints={currency.decimalPoints}
              sx={{ width: '8rem' }}
            />
          ) : (
            <TextField
              size="small"
              type="number"
              value={values.get(member.email) ?? ''}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10)
                setValue(member.email, Number.isNaN(parsed) ? null : Math.max(0, parsed))
              }}
              slotProps={{
                htmlInput: { min: 0, max: kind === 'percentage' ? 100 : undefined, step: 1 },
                input: { endAdornment: kind === 'percentage' ? '%' : undefined },
              }}
              sx={{ width: '8rem' }}
            />
          )}
        </Row>
      ))}
      <Typography fontSize="0.9rem" color={error ? 'error' : 'textDisabled'} alignSelf="end">
        {error ??
          (kind === 'participants'
            ? `${values.size} of ${members.length} taking part`
            : `Total: ${kind === 'amount' && currency ? formatFull(currency, total) : total}${kind === 'percentage' ? '%' : ''}`)}
      </Typography>
    </Column>
  )
}

export default SplitValuesEditor
