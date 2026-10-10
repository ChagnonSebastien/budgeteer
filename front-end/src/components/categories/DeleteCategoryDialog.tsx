import { Alert, Button, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material'
import { FC, ReactNode, useContext, useMemo, useState } from 'react'

import CategoryPicker from './CategoryPicker'
import { UpdatePreferencesContext, UserContext } from '../../App'
import Category, { CategoryID } from '../../domain/model/category'
import { OnlineContext } from '../../service/OnlineContext'
import {
  CategoryServiceContext,
  SettlementServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'
import IconCapsule from '../icons/IconCapsule'
import AppDialog from '../shared/AppDialog'
import { useToast } from '../shared/ToastProvider'

const plural = (count: number, word: string) =>
  `${count} ${count === 1 ? word : word.endsWith('y') ? `${word.slice(0, -1)}ies` : `${word}s`}`
const shownChildren = 4

const Node: FC<{ category: Category; tone?: 'removed' | 'target'; caption?: ReactNode }> = ({
  category,
  tone,
  caption,
}) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
    <IconCapsule
      iconName={category.iconName}
      color={category.iconColor}
      backgroundColor={category.iconBackground}
      size="1.5rem"
    />
    <Typography
      variant="body2"
      noWrap
      fontWeight={tone ? 600 : 400}
      color={tone === 'removed' ? 'error' : tone === 'target' ? 'primary' : undefined}
      sx={{ textDecoration: tone === 'removed' ? 'line-through' : undefined }}
    >
      {category.name}
    </Typography>
    {caption && (
      <Typography variant="caption" color="text.secondary" noWrap>
        {caption}
      </Typography>
    )}
  </Stack>
)

const Branch: FC<{ children: ReactNode }> = ({ children }) => (
  <Stack spacing={0.75} sx={{ ml: 1.5, pl: 1.5, borderLeft: 1, borderColor: 'border.subtle' }}>
    {children}
  </Stack>
)

const Panel: FC<{ title: string; path: Category[]; children: ReactNode }> = ({ title, path, children }) => (
  <Stack spacing={1} sx={{ flex: 1, minWidth: 0, p: 1.5, bgcolor: 'surface.subtle', borderRadius: (t) => t.radius.md }}>
    <Typography variant="label" color="text.secondary">
      {title}
    </Typography>
    {path.length > 0 && (
      <Typography variant="caption" color="text.disabled" noWrap>
        {path.map((c) => c.name).join(' › ')}
      </Typography>
    )}
    {children}
  </Stack>
)

const DeleteCategoryDialog: FC<{ category: Category; onClose(): void; onDeleted(): void }> = ({
  category,
  onClose,
  onDeleted,
}) => {
  const { preferences } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const online = useContext(OnlineContext)
  const {
    augmentedCategories,
    subCategories,
    deleteCategory,
    refresh: refreshCategories,
  } = useContext(CategoryServiceContext)
  const { state: transactions, refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { refresh: refreshUnconfirmed } = useContext(UnconfirmedTransactionServiceContext)
  const { state: settlements, refresh: refreshSettlements } = useContext(SettlementServiceContext)
  const { state: transactionGroups, refresh: refreshGroups } = useContext(TransactionGroupServiceContext)
  const { showToast } = useToast()

  const [targetId, setTargetId] = useState<CategoryID>(category.parentId!)
  const [deleteTransactions, setDeleteTransactions] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const byId = useMemo(() => new Map(augmentedCategories.map((c) => [c.id, c])), [augmentedCategories])
  const pathTo = (id: CategoryID | null): Category[] => {
    const path: Category[] = []
    for (let current = id === null ? undefined : byId.get(id); current; current = byId.get(current.parentId ?? -1)) {
      path.unshift(current)
    }
    return path
  }

  const subtree = useMemo(() => {
    const ids = new Set<CategoryID>([category.id])
    const visit = (id: CategoryID) =>
      (subCategories[id] ?? []).forEach((child) => {
        ids.add(child.id)
        visit(child.id)
      })
    visit(category.id)
    return ids
  }, [category, subCategories])

  const children = subCategories[category.id] ?? []
  const target = byId.get(targetId)
  const invalidTarget = subtree.has(targetId) || !target

  const affected = useMemo(() => transactions.filter((t) => t.categoryId === category.id), [transactions, category])
  const grouped = affected.filter((t) => t.transactionGroupData !== null)
  const groupIds = new Set(grouped.map((t) => t.transactionGroupData!.transactionGroupId))
  const groupNames = transactionGroups.filter((g) => groupIds.has(g.id)).map((g) => g.name)
  const affectedIds = new Set(affected.map((t) => t.id))
  const settlementSides = settlements.filter(
    (s) => s.ownTransactionId !== null && affectedIds.has(s.ownTransactionId),
  ).length

  const transactionCaption = affected.length === 0 ? undefined : plural(affected.length, 'transaction')

  const confirm = async () => {
    setDeleting(true)
    try {
      const result = await deleteCategory(category.id, {
        targetId: targetId === category.parentId ? undefined : targetId,
        deleteTransactions,
      })
      const incomeCategories = preferences?.costsIncomeCategoryIds
      if (incomeCategories?.includes(category.id)) {
        await updatePreferences({
          costsIncomeCategoryIds: [...new Set(incomeCategories.map((id) => (id === category.id ? targetId : id)))],
        })
      }
      await Promise.all([
        refreshCategories(),
        refreshTransactions(),
        refreshUnconfirmed(),
        refreshSettlements(),
        refreshGroups(),
      ])
      const parts = [
        deleteTransactions
          ? `${plural(result.deletedTransactions, 'transaction')} deleted`
          : `${plural(result.movedTransactions, 'transaction')} moved`,
        result.movedCategories > 0 ? `${plural(result.movedCategories, 'subcategory')} moved` : null,
        result.movedToUnconfirmed > 0 ? `${result.movedToUnconfirmed} moved to unconfirmed` : null,
      ].filter((part) => part !== null)
      showToast(`${category.name} deleted, ${parts.join(', ')}`)
      onDeleted()
    } catch (err) {
      console.error(err)
      showToast(`Could not delete ${category.name}`, 'error')
      setDeleting(false)
    }
  }

  const childNodes = (moved: boolean) => (
    <>
      {children.slice(0, shownChildren).map((child) => (
        <Node key={child.id} category={child} caption={moved ? 'moved' : undefined} />
      ))}
      {children.length > shownChildren && (
        <Typography variant="caption" color="text.secondary">
          +{plural(children.length - shownChildren, 'more subcategory')}
        </Typography>
      )}
    </>
  )

  const summary: string[] = []
  if (affected.length > 0 && target && !invalidTarget) {
    if (deleteTransactions) {
      summary.push(`${plural(affected.length, 'transaction')} in ${category.name} will be deleted.`)
      if (grouped.length > 0) {
        summary.push(
          `${plural(grouped.length, 'transaction')} in ${groupNames.join(', ')} will become unconfirmed instead, so the other members keep seeing them. You can confirm them again from the group page.`,
        )
      }
      if (settlementSides > 0) {
        summary.push(
          `${plural(settlementSides, 'transaction')} ${settlementSides === 1 ? 'is your side' : 'are your sides'} of settlements. The settlements stay, and you can restore your side from the group page.`,
        )
      }
    } else {
      summary.push(`${plural(affected.length, 'transaction')} will move to ${target.name}.`)
    }
  }
  if (children.length > 0 && target && !invalidTarget) {
    summary.push(
      `${plural(children.length, 'subcategory')}, with their own transactions, will move under ${target.name}.`,
    )
  }
  summary.push(`${category.name} will be deleted. This cannot be undone.`)

  return (
    <AppDialog
      open
      onClose={onClose}
      title={`Delete ${category.name}`}
      maxWidth="md"
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" color="error" disabled={invalidTarget || deleting || !online} onClick={confirm}>
            Delete category
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <CategoryPicker
          selectedConfig={{ mode: 'single', selectedItem: targetId, onSelectItem: setTargetId }}
          labelText="Move its transactions and subcategories to"
          icon={target}
        />

        {invalidTarget && (
          <Alert severity="error">
            Pick a category outside {category.name}: its subcategories cannot move under themselves.
          </Alert>
        )}

        {affected.length > 0 && (
          <FormControlLabel
            control={
              <Checkbox checked={deleteTransactions} onChange={(ev) => setDeleteTransactions(ev.target.checked)} />
            }
            label={`Delete its ${plural(affected.length, 'transaction')} instead of moving them`}
          />
        )}

        {target && !invalidTarget && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Panel title="Before" path={pathTo(category.parentId)}>
              <Node category={category} tone="removed" caption={transactionCaption} />
              {children.length > 0 && <Branch>{childNodes(false)}</Branch>}
            </Panel>
            <Panel title="After" path={pathTo(target.parentId)}>
              <Node
                category={target}
                tone="target"
                caption={
                  affected.length === 0
                    ? undefined
                    : deleteTransactions
                      ? `${plural(affected.length, 'transaction')} deleted`
                      : `+${plural(affected.length, 'transaction')}`
                }
              />
              {children.length > 0 && <Branch>{childNodes(true)}</Branch>}
            </Panel>
          </Stack>
        )}

        <Alert severity={deleteTransactions ? 'warning' : 'info'}>
          <Stack spacing={0.5}>
            {summary.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </Stack>
        </Alert>
      </Stack>
    </AppDialog>
  )
}

export default DeleteCategoryDialog
