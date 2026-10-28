import { GatewaySegov } from '../service/gatewaySegov'

interface GetManagementRequest {
  management?: number
  document_user: string
}

export class SegovService {
  static async findSegovFleets({
    management,
    document_user,
  }: GetManagementRequest): Promise<any> {
    const segov = new GatewaySegov({
      document_user,
    })

    return segov.getFleets({ management })
  }
}
