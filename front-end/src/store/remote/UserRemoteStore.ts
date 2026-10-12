import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { DeleteUserRequest, GetAllUsersRequest, GetUserDeletionImpactRequest, LoginMethod } from './dto/user'
import { UserServiceClient } from './dto/user.client'
import { ManagedUser, UserDeletionImpact } from '../../domain/model/user'

export default class UserRemoteStore {
  private client: UserServiceClient

  constructor(transport: RpcTransport) {
    this.client = new UserServiceClient(transport)
  }

  public async getAll(): Promise<ManagedUser[]> {
    const response = await this.client.getAllUsers(GetAllUsersRequest.create()).response
    return response.users.map((dto) => ({
      id: dto.id,
      email: dto.email,
      name: dto.name,
      loginMethod: dto.loginMethod === LoginMethod.OIDC ? 'oidc' : null,
      isAdmin: dto.isAdmin,
      lastSeenAt: dto.lastSeenAt ? new Date(dto.lastSeenAt) : null,
    }))
  }

  public async getDeletionImpact(id: string): Promise<UserDeletionImpact> {
    const {
      accounts,
      transactions,
      categories,
      currencies,
      movedToUnconfirmed,
      deletedTransactionGroups,
      blockingTransactionGroups,
    } = await this.client.getUserDeletionImpact(GetUserDeletionImpactRequest.create({ id })).response
    return {
      accounts,
      transactions,
      categories,
      currencies,
      movedToUnconfirmed,
      deletedTransactionGroups,
      blockingTransactionGroups,
    }
  }

  public async delete(id: string): Promise<void> {
    await this.client.deleteUser(DeleteUserRequest.create({ id }))
  }
}
