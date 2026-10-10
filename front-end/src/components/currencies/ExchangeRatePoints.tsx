import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import { formatDate, isSameDay, startOfDay } from 'date-fns'
import { FC, useCallback, useContext, useMemo, useState } from 'react'

import { parseRate, toDisplayedRate, toStoredRate } from './exchangeRateUnits'
import Currency from '../../domain/model/currency'
import ExchangeRate, { ExchangeRateIdentifiableFields } from '../../domain/model/exchangeRate'
import { ReadOnlyContext } from '../../service/ReadOnlyContext'
import { ExchangeRateServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import DatePicker from '../inputs/DatePicker'
import AppDialog from '../shared/AppDialog'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal'
import { SecureButton } from '../shared/SecureButton'
import { useToast } from '../shared/ToastProvider'

const COLLAPSED_POINTS = 15

export interface RatePoint {
  source: ExchangeRate
  inverted: boolean
  date: Date
  displayed: number
}

export interface PointDraft {
  editing: RatePoint | null
  date: Date
  rate: string
}

export const formatRate = (rate: number) => rate.toLocaleString(undefined, { maximumSignificantDigits: 10 })

export const rateInput = (rate: number) => `${Number(rate.toPrecision(10))}`

const useRatePoints = (currency: Currency, against: Currency) => {
  const { state: rates, create, update, delete: deleteRate } = useContext(ExchangeRateServiceContext)

  const points = useMemo<RatePoint[]>(
    () =>
      rates
        .filter(
          (r) =>
            (r.currencyA === currency.id && r.currencyB === against.id) ||
            (r.currencyA === against.id && r.currencyB === currency.id),
        )
        .map((r) => {
          const inverted = r.currencyA === against.id
          return {
            source: r,
            inverted,
            date: r.date,
            displayed: toDisplayedRate(inverted ? 1 / r.rate : r.rate, currency, against),
          }
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [rates, currency, against],
  )

  const save = useCallback(
    async (editing: RatePoint | null, date: Date, displayed: number) => {
      const day = startOfDay(date)
      if (editing !== null && !isSameDay(editing.date, day)) {
        await deleteRate(editing.source)
      }

      const stored = toStoredRate(displayed, currency, against)
      const existing = points.find((p) => isSameDay(p.date, day))
      if (typeof existing !== 'undefined') {
        await update(existing.source, { rate: existing.inverted ? 1 / stored : stored })
      } else {
        await create({ rate: stored }, new ExchangeRateIdentifiableFields(currency.id, against.id, day))
      }
    },
    [points, currency, against, create, update, deleteRate],
  )

  const remove = useCallback((point: RatePoint) => deleteRate(point.source), [deleteRate])

  return { points, save, remove }
}

const PointDialog: FC<{
  draft: PointDraft
  points: RatePoint[]
  currency: Currency
  against: Currency
  onClose(): void
  onSave(editing: RatePoint | null, date: Date, displayed: number): Promise<void>
}> = ({ draft, points, currency, against, onClose, onSave }) => {
  const [date, setDate] = useState(draft.date)
  const [rateText, setRateText] = useState(draft.rate)
  const rate = parseRate(rateText)
  const overwritten = points.find((p) => p !== draft.editing && isSameDay(p.date, date))

  return (
    <AppDialog
      open
      onClose={onClose}
      title={draft.editing === null ? 'Add exchange rate' : 'Edit exchange rate'}
      maxWidth="xs"
      fullWidth
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <SecureButton
            variant="contained"
            disabled={rate === null}
            onClick={async () => {
              await onSave(draft.editing, date, rate!)
              onClose()
            }}
          >
            Save
          </SecureButton>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <DatePicker label="Date" date={date} onChange={setDate} />
        <Stack direction="row" alignItems="flex-end" spacing={1.5}>
          <Box sx={{ flexShrink: 0 }}>1 {currency.symbol} =</Box>
          <TextField
            variant="standard"
            value={rateText}
            onChange={(ev) => setRateText(ev.target.value)}
            error={rate === null}
            inputProps={{ inputMode: 'decimal' }}
            autoFocus
            sx={{ flexGrow: 1 }}
          />
          <Box sx={{ flexShrink: 0 }}>{against.symbol}</Box>
        </Stack>
        {overwritten && (
          <Typography variant="caption" color="warning">
            Replaces the rate of {formatRate(overwritten.displayed)} {against.symbol} already recorded on this date
          </Typography>
        )}
      </Stack>
    </AppDialog>
  )
}

interface Props {
  currency: Currency
  against: Currency
  draft: PointDraft | null
  onDraftChange(draft: PointDraft | null): void
}

const ExchangeRatePoints: FC<Props> = ({ currency, against, draft, onDraftChange }) => {
  const { IconLib } = useContext(IconToolsContext)
  const { showToast } = useToast()
  const { points, save, remove } = useRatePoints(currency, against)
  const readOnly = useContext(ReadOnlyContext) !== null
  const [expanded, setExpanded] = useState(false)
  const [toDelete, setToDelete] = useState<RatePoint | null>(null)

  const visiblePoints = expanded ? points : points.slice(0, COLLAPSED_POINTS)

  return (
    <Stack spacing={1}>
      <Button
        size="small"
        startIcon={<IconLib.BsPlusCircle />}
        sx={{ alignSelf: 'flex-start' }}
        disabled={readOnly}
        onClick={() =>
          onDraftChange({ editing: null, date: startOfDay(new Date()), rate: rateInput(points[0]?.displayed ?? 1) })
        }
      >
        Add rate
      </Button>

      {points.length === 0 && <Typography color="text.secondary">No rate recorded yet</Typography>}

      {visiblePoints.map((point) => (
        <Stack key={point.source.id} direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ flexShrink: 0, width: '7.5rem' }} color="text.secondary">
            {formatDate(point.date, 'MMM d, yyyy')}
          </Typography>
          <Typography sx={{ flexGrow: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
            {formatRate(point.displayed)} {against.symbol}
          </Typography>
          <IconButton
            size="small"
            aria-label="edit rate"
            disabled={readOnly}
            onClick={() => onDraftChange({ editing: point, date: point.date, rate: rateInput(point.displayed) })}
          >
            <IconLib.MdEdit />
          </IconButton>
          <IconButton size="small" aria-label="delete rate" disabled={readOnly} onClick={() => setToDelete(point)}>
            <IconLib.MdDelete />
          </IconButton>
        </Stack>
      ))}

      {points.length > COLLAPSED_POINTS && (
        <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show fewer' : `Show all ${points.length} rates`}
        </Button>
      )}

      {draft !== null && (
        <PointDialog
          draft={draft}
          points={points}
          currency={currency}
          against={against}
          onClose={() => onDraftChange(null)}
          onSave={async (editing, date, displayed) => {
            try {
              await save(editing, date, displayed)
              showToast('Exchange rate saved')
            } catch (err) {
              showToast('Unexpected error while saving the exchange rate', 'error')
              console.error(err)
              throw err
            }
          }}
        />
      )}

      <ConfirmDeleteModal
        open={toDelete !== null}
        title="Delete exchange rate"
        description={
          toDelete === null
            ? ''
            : `Delete the rate of ${formatRate(toDelete.displayed)} ${against.symbol} recorded on ${formatDate(toDelete.date, 'MMM d, yyyy')}?`
        }
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await remove(toDelete!)
            showToast('Exchange rate deleted')
          } catch (err) {
            showToast('Unexpected error while deleting the exchange rate', 'error')
            console.error(err)
          }
          setToDelete(null)
        }}
      />
    </Stack>
  )
}

export default ExchangeRatePoints
