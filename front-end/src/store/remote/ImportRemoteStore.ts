import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import {
  DeleteImportRequest,
  GetAllImportProfilesRequest,
  GetAllImportsRequest,
  GetKnownFingerprintsRequest,
  ImportProfile,
  SaveImportProfileRequest,
  StartImportRequest,
} from './dto/imports'
import { ImportServiceClient } from './dto/imports.client'
import { BatchCreateTransactionsRequest, ImportRow, ImportRowOutcome } from './dto/transaction'
import { TransactionServiceClient } from './dto/transaction.client'
import { toCreateTransactionRequest } from './TransactionRemoteStore'
import { CommitRow } from '../../domain/import/preview'
import { AccountID } from '../../domain/model/account'
import { TransactionID } from '../../domain/model/transaction'

export type ImportID = number

export interface ImportRecord {
  id: ImportID
  accountId: AccountID
  fileName: string
  rowCount: number
  createdAt: Date
}

export type CommitOutcome = 'created' | 'merged' | 'skipped'

export interface BatchResult {
  rows: { outcome: CommitOutcome; transactionId: TransactionID }[]
  statementNames: Map<AccountID, string[]>
}

const outcomes: Record<ImportRowOutcome, CommitOutcome> = {
  [ImportRowOutcome.ImportRowCreated]: 'created',
  [ImportRowOutcome.ImportRowMerged]: 'merged',
  [ImportRowOutcome.ImportRowSkipped]: 'skipped',
}

export default class ImportRemoteStore {
  private client: ImportServiceClient
  private transactionClient: TransactionServiceClient

  constructor(transport: RpcTransport) {
    this.client = new ImportServiceClient(transport)
    this.transactionClient = new TransactionServiceClient(transport)
  }

  public async start(accountId: AccountID, fileName: string): Promise<ImportID> {
    const response = await this.client.startImport(StartImportRequest.create({ account: accountId, fileName })).response
    return response.id
  }

  public async getAll(): Promise<ImportRecord[]> {
    const response = await this.client.getAllImports(GetAllImportsRequest.create()).response
    return response.imports.map((dto) => ({
      id: dto.id,
      accountId: dto.account,
      fileName: dto.fileName,
      rowCount: dto.rowCount,
      createdAt: new Date(dto.createdAt),
    }))
  }

  public async delete(id: ImportID): Promise<void> {
    await this.client.deleteImport(DeleteImportRequest.create({ id })).response
  }

  public async getProfiles(): Promise<Map<AccountID, string>> {
    const response = await this.client.getAllImportProfiles(GetAllImportProfilesRequest.create()).response
    return new Map(response.profiles.map((profile) => [profile.account, profile.mapping]))
  }

  public async saveProfile(accountId: AccountID, mapping: string): Promise<void> {
    await this.client.saveImportProfile(
      SaveImportProfileRequest.create({ profile: ImportProfile.create({ account: accountId, mapping }) }),
    ).response
  }

  public async knownFingerprints(accountId: AccountID, fingerprints: string[]): Promise<Map<string, TransactionID>> {
    const response = await this.client.getKnownFingerprints(
      GetKnownFingerprintsRequest.create({ account: accountId, fingerprints }),
    ).response
    return new Map(response.fingerprints.map((known) => [known.fingerprint, known.transactionId]))
  }

  public async batchCreate(importId: ImportID, rows: CommitRow[]): Promise<BatchResult> {
    const response = await this.transactionClient.batchCreateTransactions(
      BatchCreateTransactionsRequest.create({
        importId,
        rows: rows.map((row) =>
          ImportRow.create({
            transaction: toCreateTransactionRequest(row.transaction),
            fingerprint: row.fingerprint,
            statementName: row.statementName,
            mergeInto: row.mergeInto ?? undefined,
          }),
        ),
      }),
    ).response
    return {
      rows: response.results.map((result) => ({
        outcome: outcomes[result.outcome],
        transactionId: result.transactionId,
      })),
      statementNames: new Map(response.accounts.map((account) => [account.account, account.statementNames])),
    }
  }
}
