import Sipol from '../service/gatewaySipolPerson'

interface GetPersonCaseRequest {
  document?: string
  document_secondary?: string
  document_user: string
  name?: string
  birthday?: string
  mather?: string
}

export class SipolService {

  static async findSipol({document_user, document, document_secondary, name, birthday, mather}: GetPersonCaseRequest): Promise<any> {
    const sipol = new Sipol({
      document: document_user,
    })

    const person = await sipol.getPersonSipol({
      document, document_secondary, name, birthday, mather,
    });

    return person
  }
}