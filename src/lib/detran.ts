import Detran from '../service/gatewayDetran'

interface GetPersonCaseRequest {
  document?: string
  document_secondary?: string
  document_user: string
  name?: string
  birthday?: string
  mather?: string
}

export class DetranService {

  static async findDetran({document_user, document, document_secondary, name, birthday, mather}: GetPersonCaseRequest): Promise<any> {
    const detran = new Detran({
      researcher: document_user,
    })

    const person = await detran.setIdentification({
      document, document_secondary, name, birthday, mather,
    });
   
    return person
  }
}