import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { GetAllUsersRequest, LoginMethod } from './dto/user'
import { UserServiceClient } from './dto/user.client'
import { ManagedUser } from '../../domain/model/user'

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
}
