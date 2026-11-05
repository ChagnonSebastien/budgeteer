import { Alert, Button, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material'
import { FC, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { UserContext } from '../App'
import CurrencyForm, { ExchangeRateConfig } from '../components/currencies/CurrencyForm'
import useCreateCurrency from '../components/currencies/useCreateCurrency'
import ImportAccountAssignment, { AccountAssignment } from '../components/import/ImportAccountAssignment'
import ImportMappingStep from '../components/import/ImportMappingStep'
import { ImportPreviewList } from '../components/import/ImportPreviewStep'
import ImportSourceStep from '../components/import/ImportSourceStep'
import AppDialog from '../components/shared/AppDialog'
import ConfirmDeleteModal from '../components/shared/ConfirmDeleteModal'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { SecureButton } from '../components/shared/SecureButton'
import { useToast } from '../components/shared/ToastProvider'
import { accountNamesOf, defaultMapping, ImportMapping, outflowKinds, parseRows } from '../domain/import/mapping'
import { learnedAccount, sharesAccountNumber } from '../domain/import/matching'
import { decodeFile, parseCsv } from '../domain/import/parsing'
import {
  buildPreview,
  CommitRow,
  computeFingerprints,
  effectiveCategory,
  initialChoice,
  isTrade,
  isTransferChoice,
  PreviewRow,
  RowChoice,
  toCommitRow,
} from '../domain/import/preview'
import Account, { AccountID, payeeFields } from '../domain/model/account'
import { CurrencyUpdatableFields } from '../domain/model/currency'
import Transaction, { TransactionID } from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { OnlineContext } from '../service/OnlineContext'
import { ReadOnlyContext } from '../service/ReadOnlyContext'
import {
  AccountServiceContext,
  CurrencyServiceContext,
  ImportStoreContext,
  TransactionServiceContext,
} from '../service/ServiceContext'
import ImportRemoteStore, { ImportRecord } from '../store/remote/ImportRemoteStore'
import { foldText } from '../utils'

const chunkSize = 500
const maxRows = 20000
const steps = ['Source', 'Columns', 'Preview', 'Done']

interface Fingerprinted {
  fingerprints: string[]
  known: Map<string, TransactionID>
}

interface Summary {
  importIds: number[]
  created: number
  merged: number
  skipped: number
}

const readProfile = (raw: string): ImportMapping | null => {
  try {
    return JSON.parse(raw) as ImportMapping
  } catch {
    return null
  }
}

const ImportTransactionsPage: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const prefillAccountId = (location.state as { prefillAccountId?: number | null } | null)?.prefillAccountId ?? null
  const importStore = useContext(ImportStoreContext) as ImportRemoteStore
  const online = useContext(OnlineContext)
  const readOnly = useContext(ReadOnlyContext)
  const { email, hidden_default_account, default_currency } = useContext(UserContext)
  const {
    state: accounts,
    myOwnAccounts,
    create: createAccount,
    absorb: absorbAccounts,
    refresh: refreshAccounts,
  } = useContext(AccountServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const {
    state: transactions,
    absorb: absorbTransactions,
    refresh: refreshTransactions,
  } = useContext(TransactionServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)
  const createCurrency = useCreateCurrency()
  const { showToast } = useToast()

  const importAccounts = useMemo(
    () => myOwnAccounts.filter((a) => a.id !== hidden_default_account),
    [myOwnAccounts, hidden_default_account],
  )
  const [step, setStep] = useState(0)
  const [accountIds, setAccountIds] = useState<AccountID[]>(
    prefillAccountId !== null && importAccounts.some((a) => a.id === prefillAccountId) ? [prefillAccountId] : [],
  )
  const [assigned, setAssigned] = useState<Map<string, AccountID | null>>(new Map())
  const [profiles, setProfiles] = useState<Map<AccountID, ImportMapping>>(new Map())
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [mapping, setMapping] = useState<ImportMapping | null>(null)
  const [fingerprinted, setFingerprinted] = useState<Fingerprinted | null>(null)
  const [overrides, setOverrides] = useState<Map<number, RowChoice>>(new Map())
  const [committing, setCommitting] = useState<{ done: number; total: number } | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [confirmUncategorized, setConfirmUncategorized] = useState<number | null>(null)
  const [undoing, setUndoing] = useState<ImportRecord[] | null>(null)
  const [currencyToCreate, setCurrencyToCreate] = useState<string | null>(null)

  const selectedAccounts = useMemo(
    () => importAccounts.filter((a) => accountIds.includes(a.id)),
    [importAccounts, accountIds],
  )
  const multiAccount = accountIds.length > 1

  const loadImports = useCallback(() => importStore.getAll().then(setImports), [importStore])

  useEffect(() => {
    if (!online) return
    importStore
      .getProfiles()
      .then((raw) => {
        const parsed = new Map<AccountID, ImportMapping>()
        for (const [id, value] of raw) {
          const profile = readProfile(value)
          if (profile !== null) parsed.set(id, profile)
        }
        setProfiles(parsed)
      })
      .catch(console.error)
    loadImports().catch(console.error)
  }, [online, importStore, loadImports])

  const accountCurrencies = useMemo(() => {
    const ids = new Set(selectedAccounts.flatMap((a) => a.initialAmounts.map((balance) => balance.currencyId)))
    const held = currencies.filter((c) => ids.has(c.id))
    return held.length > 0 ? held : currencies
  }, [selectedAccounts, currencies])

  const encoding = mapping?.encoding
  const skipLines = mapping?.skipLines
  const hasHeader = mapping?.hasHeader

  useEffect(() => {
    if (file === null || encoding === undefined) return
    let cancelled = false
    decodeFile(file, encoding).then((decoded) => !cancelled && setText(decoded))
    return () => {
      cancelled = true
    }
  }, [file, encoding])

  const table = useMemo(
    () => (text && skipLines !== undefined && hasHeader !== undefined ? parseCsv(text, skipLines, hasHeader) : null),
    [text, skipLines, hasHeader],
  )
  const imported = useMemo(() => (table ? { ...table, rows: table.rows.slice(0, maxRows) } : null), [table])
  const accountNames = useMemo(
    () => (imported && mapping ? accountNamesOf(imported, mapping) : []),
    [imported, mapping],
  )

  const resolveAccount = useCallback(
    (name: string): AccountID | null | undefined => {
      if (assigned.has(name)) return assigned.get(name)
      const learned = learnedAccount(name, importAccounts)
      const scoped = (account: Account) => (accountIds.includes(account.id) ? account.id : null)
      if (learned?.statementNames.includes(name)) return scoped(learned)
      const siblings = new Set([...assigned].filter(([other]) => sharesAccountNumber(other, name)).map(([, id]) => id))
      if (siblings.size === 1) return [...siblings][0]
      if (learned !== null) return scoped(learned)
      return accountIds.length === 1 ? accountIds[0] : undefined
    },
    [assigned, importAccounts, accountIds],
  )

  const assignments = useMemo((): AccountAssignment[] => {
    const rows = new Map<string, number>()
    for (const name of accountNames) rows.set(name, (rows.get(name) ?? 0) + 1)
    return [...rows].map(([name, count]) => ({ name, rows: count, accountId: resolveAccount(name) }))
  }, [accountNames, resolveAccount])
  const unresolved = assignments.some((a) => a.accountId === undefined)

  const resolvedAccounts = useMemo(
    () => accountNames.map((name) => resolveAccount(name) ?? null),
    [accountNames, resolveAccount],
  )
  const [rowAccounts, setRowAccounts] = useState(resolvedAccounts)
  if (rowAccounts.length !== resolvedAccounts.length || rowAccounts.some((id, i) => id !== resolvedAccounts[i])) {
    setRowAccounts(resolvedAccounts)
  }
  const accountOf = useCallback((key: number) => rowAccounts[key] ?? null, [rowAccounts])

  const parses = useMemo(
    () =>
      imported && mapping
        ? parseRows(imported, mapping, currencies, (row) => rowAccounts[row] ?? `unassigned ${accountNames[row]}`)
        : [],
    [imported, mapping, currencies, rowAccounts, accountNames],
  )

  const [fingerprintedFor, setFingerprintedFor] = useState({ table, mapping, rowAccounts })
  if (
    fingerprintedFor.table !== table ||
    fingerprintedFor.mapping !== mapping ||
    fingerprintedFor.rowAccounts !== rowAccounts
  ) {
    setFingerprintedFor({ table, mapping, rowAccounts })
    setFingerprinted(null)
    setOverrides(new Map())
  }

  useEffect(() => {
    if (step !== 2 || unresolved) return
    let cancelled = false
    computeFingerprints(accountOf, parses)
      .then(async (fingerprints) => {
        const byAccount = new Map<AccountID, string[]>()
        fingerprints.forEach((fingerprint, key) => {
          const id = accountOf(key)
          if (fingerprint !== '' && id !== null) byAccount.set(id, [...(byAccount.get(id) ?? []), fingerprint])
        })
        const known = new Map<string, TransactionID>()
        const found = await Promise.all([...byAccount].map(([id, prints]) => importStore.knownFingerprints(id, prints)))
        for (const map of found) for (const [fingerprint, id] of map) known.set(fingerprint, id)
        if (!cancelled) setFingerprinted({ fingerprints, known })
      })
      .catch((err) => {
        console.error(err)
        showToast('Could not check for already imported rows', 'error')
      })
    return () => {
      cancelled = true
    }
  }, [step, unresolved, parses, accountOf, importStore, showToast])

  const preview = useMemo(
    () =>
      fingerprinted
        ? buildPreview(accountOf, parses, fingerprinted.fingerprints, fingerprinted.known, accounts, transactions)
        : [],
    [fingerprinted, accountOf, parses, accounts, transactions],
  )

  const choiceOf = useCallback(
    (row: PreviewRow) => overrides.get(row.key) ?? initialChoice(row, accounts),
    [overrides, accounts],
  )

  const onRowChange = useCallback((key: number, choice: RowChoice) => {
    setOverrides((prev) => new Map(prev).set(key, choice))
  }, [])

  const selected = useMemo(
    () => preview.filter((row) => row.parse.outcome === 'parsed' && choiceOf(row).included),
    [preview, choiceOf],
  )

  const targetNames = useMemo(() => {
    const ids = new Set(selected.map((row) => row.accountId))
    return selectedAccounts
      .filter((a) => ids.has(a.id))
      .map((a) => a.name)
      .join(', ')
  }, [selected, selectedAccounts])

  const uncategorized = useMemo(
    () =>
      selected.filter((row) => {
        if (row.parse.outcome !== 'parsed') return false
        const parsed = row.parse.row
        if (isTrade(parsed) || isTransferChoice(choiceOf(row), accounts)) return false
        return effectiveCategory(parsed, choiceOf(row), accounts, transactions) === null
      }).length,
    [selected, choiceOf, accounts, transactions],
  )

  const savedProfiles = accountIds.flatMap((id) => profiles.get(id) ?? [])
  const profile = multiAccount ? savedProfiles.find((p) => p.accountColumn) : savedProfiles[0]

  const onFile = async (picked: File) => {
    if (accountIds.length === 0) return
    const base = profile ?? savedProfiles[0]
    const decoded = await decodeFile(picked, base?.encoding ?? 'utf-8')
    setFile(picked)
    setText(decoded)
    setSummary(null)
    setAssigned(new Map())
    if (profile) {
      setMapping(profile)
      setStep(2)
    } else {
      const fallbackCurrency = accountCurrencies.find((c) => c.id === default_currency) ?? accountCurrencies[0]
      const sample = parseCsv(decoded, base?.skipLines ?? 0, base?.hasHeader ?? true)
      const detected = defaultMapping(sample, fallbackCurrency.id, multiAccount)
      setMapping(base ? { ...base, accountColumn: detected.accountColumn } : detected)
      setStep(1)
    }
  }

  const resolvePayees = async (): Promise<Map<string, AccountID>> => {
    const resolved = new Map<string, AccountID>()
    for (const row of selected) {
      const { counterparty } = choiceOf(row)
      const name = counterparty.name.trim()
      if (counterparty.id !== null || name === '' || resolved.has(foldText(name))) continue
      const existing = accounts.find((a) => !a.isMine && a.hasName(name))
      resolved.set(foldText(name), existing ? existing.id : (await createAccount(payeeFields(name))).id)
    }
    return resolved
  }

  const commit = async () => {
    if (mapping === null) return
    setConfirmUncategorized(null)
    setCommitting({ done: 0, total: selected.length })
    try {
      const payees = await resolvePayees()
      const planned = selected.map((row) => {
        const parsed = (row.parse as { row: Parameters<typeof toCommitRow>[2] }).row
        const choice = choiceOf(row)
        const counterpartyId = choice.counterparty.id ?? payees.get(foldText(choice.counterparty.name.trim())) ?? null
        const transfer = isTransferChoice(choice, accounts)
        const trade = isTrade(parsed)
        const categoryId =
          trade || transfer ? null : (effectiveCategory(parsed, choice, accounts, transactions) ?? rootCategory.id)
        return {
          row,
          parsed,
          commit: toCommitRow(
            row.accountId,
            email,
            parsed,
            row.fingerprint,
            counterpartyId,
            categoryId,
            choice.mergeInto,
            choice.note ?? parsed.description,
            accountNames[row.key] ?? '',
          ),
        }
      })

      const byAccount = new Map<AccountID, typeof planned>()
      for (const p of planned) byAccount.set(p.row.accountId, [...(byAccount.get(p.row.accountId) ?? []), p])

      const importIds: number[] = []
      const absorbed: Transaction[] = []
      const statementNames = new Map<AccountID, string[]>()
      const counts = { created: 0, merged: 0, skipped: 0 }
      let done = 0

      for (const [accountId, accountRows] of byAccount) {
        const importId = await importStore.start(accountId, file?.name ?? '')
        importIds.push(importId)
        for (let start = 0; start < accountRows.length; start += chunkSize) {
          const chunk = accountRows.slice(start, start + chunkSize)
          const result = await importStore.batchCreate(
            importId,
            chunk.map((p): CommitRow => p.commit),
          )
          result.rows.forEach((outcome, i) => {
            counts[outcome.outcome] += 1
            const { commit: planned, parsed, row } = chunk[i]
            const t = planned.transaction
            if (outcome.outcome === 'created') {
              absorbed.push(
                new Transaction(
                  outcome.transactionId,
                  t.owner,
                  t.amount,
                  t.currencyId,
                  t.categoryId,
                  t.date,
                  t.senderId,
                  t.receiverId,
                  t.note,
                  t.receiverCurrencyId,
                  t.receiverAmount,
                  t.financialIncomeData,
                  t.transactionGroupData,
                ),
              )
            } else if (outcome.outcome === 'merged' && row.transfer?.stored) {
              const stored = row.transfer.stored
              const outflow = outflowKinds.includes(parsed.kind)
              absorbed.push(
                new Transaction(
                  stored.id,
                  stored.owner,
                  outflow ? parsed.cash : stored.amount,
                  outflow ? parsed.currencyId : stored.currencyId,
                  null,
                  stored.date,
                  outflow ? accountId : stored.senderId,
                  outflow ? stored.receiverId : accountId,
                  stored.note,
                  outflow ? stored.receiverCurrencyId : parsed.currencyId,
                  outflow ? stored.receiverAmount : parsed.cash,
                  null,
                  null,
                ),
              )
            }
          })
          for (const [id, names] of result.statementNames) statementNames.set(id, names)
          done += chunk.length
          setCommitting({ done, total: planned.length })
        }
      }

      await absorbTransactions(absorbed)
      const updatedAccounts = [...statementNames]
        .map(([id, names]) => {
          const current = accounts.find((a) => a.id === id)
          if (!current) return null
          return new Account(
            current.id,
            current.name,
            current.initialAmounts,
            current.isMine,
            current.type,
            current.financialInstitution,
            current.isDebt,
            current.createdAt,
            names,
          )
        })
        .filter((a): a is Account => a !== null)
      await absorbAccounts(updatedAccounts)
      for (const accountId of byAccount.keys()) await importStore.saveProfile(accountId, JSON.stringify(mapping))
      setProfiles((prev) => {
        const next = new Map(prev)
        for (const accountId of byAccount.keys()) next.set(accountId, mapping)
        return next
      })
      await loadImports()

      setSummary({ importIds, ...counts })
      setStep(3)
    } catch (err) {
      console.error(err)
      showToast('The import failed part way; committed chunks can be undone from the import page', 'error')
    } finally {
      setCommitting(null)
    }
  }

  const undo = async (records: ImportRecord[]) => {
    try {
      for (const record of records) await importStore.delete(record.id)
      await Promise.all([refreshTransactions(), refreshAccounts(), loadImports()])
      if (summary?.importIds.some((id) => records.some((record) => record.id === id))) {
        setSummary(null)
        setStep(0)
      }
      showToast('Import undone')
    } catch (err) {
      console.error(err)
      showToast('Could not undo the import', 'error')
    } finally {
      setUndoing(null)
    }
  }

  const onCreateCurrency = async (data: Partial<CurrencyUpdatableFields>, rates?: ExchangeRateConfig[]) => {
    await createCurrency(data, rates)
    setCurrencyToCreate(null)
    showToast('Currency created')
  }

  return (
    <ContentWithHeader title="Import transactions" action="return" withPadding withScrolling>
      <Stack spacing={3} sx={{ width: (t) => t.contentWidth.narrow, maxWidth: '100%' }}>
        <Stepper activeStep={step} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {readOnly && <Alert severity="warning">{readOnly.explanation}</Alert>}

        {step === 0 && (
          <ImportSourceStep
            accounts={importAccounts}
            accountIds={accountIds}
            onAccountsChange={setAccountIds}
            hasProfile={profile !== undefined}
            onFile={(picked) => {
              onFile(picked).catch((err) => {
                console.error(err)
                showToast('Could not read the file', 'error')
              })
            }}
            imports={imports}
            onUndo={(record) => setUndoing([record])}
          />
        )}

        {step === 1 && mapping && table && (
          <ImportMappingStep
            headers={table.headers}
            mapping={mapping}
            onChange={setMapping}
            accountCurrencies={accountCurrencies}
            currencies={currencies}
            parses={parses}
            multiAccount={multiAccount}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && selectedAccounts.length > 0 && (
          <Stack spacing={2}>
            {table && table.rows.length > maxRows && (
              <Alert severity="warning">Only the first {maxRows} rows are imported; split the file for the rest.</Alert>
            )}
            {mapping?.accountColumn && (
              <ImportAccountAssignment
                assignments={assignments}
                accounts={selectedAccounts}
                onChange={(name, id) => setAssigned((prev) => new Map(prev).set(name, id))}
              />
            )}
            {unresolved ? (
              <Typography color="text.secondary">Pick an account for every value of the account column.</Typography>
            ) : fingerprinted === null ? (
              <Typography color="text.secondary">Checking rows against your transactions…</Typography>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  {selected.length} of {preview.length} rows will be imported into {targetNames}.
                </Typography>
                <ImportPreviewList
                  rows={preview}
                  choices={choiceOf}
                  showAccount={multiAccount}
                  accounts={accounts}
                  currencies={currencies}
                  transactions={transactions}
                  onChange={onRowChange}
                  onCreateCurrency={setCurrencyToCreate}
                />
              </>
            )}
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button color="inherit" disabled={committing !== null} onClick={() => setStep(1)}>
                Columns
              </Button>
              <SecureButton
                variant="contained"
                disabled={readOnly !== null || committing !== null || selected.length === 0 || fingerprinted === null}
                onClick={async () => {
                  if (uncategorized > 0) setConfirmUncategorized(uncategorized)
                  else await commit()
                }}
              >
                {committing ? `Importing ${committing.done}/${committing.total}` : `Import ${selected.length} rows`}
              </SecureButton>
            </Stack>
          </Stack>
        )}

        {step === 3 && summary && (
          <Stack spacing={2}>
            <Typography>
              {summary.created} transactions created, {summary.merged} merged into transfers, {summary.skipped} already
              imported.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                color="inherit"
                disabled={readOnly !== null}
                onClick={() => {
                  const records = imports.filter((i) => summary.importIds.includes(i.id))
                  if (records.length > 0) setUndoing(records)
                }}
              >
                Undo this import
              </Button>
              <Button variant="contained" onClick={() => navigate('/transactions', { replace: true })}>
                Done
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>

      <AppDialog
        open={confirmUncategorized !== null}
        onClose={() => setConfirmUncategorized(null)}
        title="Uncategorized rows"
        maxWidth="xs"
        actions={
          <>
            <Button color="inherit" onClick={() => setConfirmUncategorized(null)}>
              Review
            </Button>
            <SecureButton variant="contained" onClick={commit}>
              Import
            </SecureButton>
          </>
        }
      >
        <Typography color="text.secondary">
          {confirmUncategorized} rows have no category and will land in the root category until you file them.
        </Typography>
      </AppDialog>

      <ConfirmDeleteModal
        open={undoing !== null}
        title="Undo import"
        description={`Delete the ${undoing?.reduce((sum, r) => sum + r.rowCount, 0) ?? 0} transactions from ${undoing?.[0]?.fileName || 'this file'} and revert the transfers it merged?`}
        onCancel={() => setUndoing(null)}
        onConfirm={() => (undoing ? undo(undoing) : Promise.resolve())}
      />

      <AppDialog
        open={currencyToCreate !== null}
        onClose={() => setCurrencyToCreate(null)}
        title={`Create ${currencyToCreate ?? ''}`}
        contentSx={{ maxHeight: '80vh' }}
      >
        {currencyToCreate !== null && (
          <CurrencyForm initialName={currencyToCreate} onSubmit={onCreateCurrency} submitText="Create" />
        )}
      </AppDialog>
    </ContentWithHeader>
  )
}

export default ImportTransactionsPage
