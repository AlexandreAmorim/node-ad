import { env } from "../config/env";
import axios  from "axios";

interface GatewaySipolConfig {
	researcher: string;
}

export default class GatewayDetran {
  private _reply: any;
	private _cnpj: string;
	private _key: string;
  private _profile: string;
  private _researcher: string;
	private _error: string | null;
	private _messageDefault: string;

  constructor({ researcher }: GatewaySipolConfig) {
    this._reply = null;
		this._cnpj = env.DETRAN_CNPJ;
		this._key = env.DETRAN_KEY;
    this._profile = env.DETRAN_PROFILE;
    this._researcher = researcher;
		this._error = null;
		this._messageDefault =
			"...não está disponível no momento. Aguarde para prosseguir com a consulta.";
	}

  async setIdentification(payload: any) {
    const IDCidadao = Math.floor(Math.random() * 20000);
    try {
      const {
        document_secondary, name, birthday, mather, father, document,
      } = payload;

      let xml;

      if (birthday) {
        xml = `<soap12:Envelope 
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                <soap12:Body>
                    <consultarNome xmlns="http://www.detran.rj.gov.br">
                    <CNPJ>${this._cnpj}</CNPJ>
                    <chave>${this._key}</chave>
                    <perfil>${this._profile}</perfil>
                    <IDCidadao>${IDCidadao}</IDCidadao>
                    <nomeCidadao>${name}</nomeCidadao>
                    <nomePai>${father || ''}</nomePai>
                    <nomeMae>${mather}</nomeMae>
                    <dtNascimento>${birthday}</dtNascimento>
                    <IDPesquisador>${this._researcher}</IDPesquisador>
                    </consultarNome>
                </soap12:Body>
            </soap12:Envelope>`;
      }

      if (document_secondary) {
        xml = `<soap12:Envelope 
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                    xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                    xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <consultarRG xmlns="http://www.detran.rj.gov.br">
                        <CNPJ>${this._cnpj}</CNPJ>
                        <chave>${this._key}</chave>
                        <perfil>${this._profile}</perfil>
                        <IDCidadao>${IDCidadao}</IDCidadao>
                        <RG>${document_secondary}</RG>
                        <IDPesquisador>${this._researcher}</IDPesquisador>
                        </consultarRG>
                    </soap12:Body>
                </soap12:Envelope>`;
      }
      if (document) {
        xml = `<soap12:Envelope 
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                    xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                    xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <consultarCPF xmlns="http://www.detran.rj.gov.br">
                        <CNPJ>${this._cnpj}</CNPJ>
                        <chave>${this._key}</chave>
                        <perfil>${this._profile}</perfil>
                        <IDCidadao>${IDCidadao}</IDCidadao>
                        <CPF>${document}</CPF>
                        <IDPesquisador>${this._researcher}</IDPesquisador>
                        </consultarCPF>
                    </soap12:Body>
                </soap12:Envelope>`;
      }

      const url = env.DETRAN_URL_SET

      const response = await axios.post(url,
        xml,
        {
          headers: {
            'Content-Type': 'text/xml',
          },
        });

        if (response.status === 200) {
          const person = await this.getIdentification({
            IDCidadao,
          });

          return person;
        }

        return false;
    } catch (error: any) {
      this.setError('', error);

      if (error.response && error.response.status === 404) {
        const filter = 'os dados informados.';
        this.setError('404', `Não foi possível encontrar com ${filter}`);
      }

      return false;
    }
  }

  async getIdentification(payload: any) {
    try {
      const {
        IDCidadao,
      } = payload;

      const xml = `<soap12:Envelope
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
      xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
      xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <BuscarProcessados
                  xmlns="http://www.detran.rj.gov.br">
                  <CNPJ>${this._cnpj}</CNPJ>
                  <chave>${this._key}</chave>
                  <perfil>${this._profile}</perfil>
                  <IDCidadao>${IDCidadao}</IDCidadao>
          </BuscarProcessados>
        </soap12:Body>
      </soap12:Envelope>`;

      const url = env.DETRAN_URL_GET

      const response = await axios.post(url,
        xml,
        {
          headers: {
            'Content-Type': 'text/xml',
          },
        });

      return response;
    } catch (error: any) {
      this.setError('', error);

      if (error.response && error.response.status === 404) {
        const filter = 'os dados informados.';
        this.setError('404', `Não foi possível encontrar com ${filter}`);
      }

      return false;
    }
  }

  async setError(status: string, error?: any): Promise<void> {
		switch (status) {
			case "StatusOff":
				if (this._reply) {
					this._reply.status(400).json({
						message: this._messageDefault,
						error: "Gateway StatusOff",
					});
				}
				this._error = "StatusOff";

				break;

			case "404":
				if (this._reply) {
					this._reply.status(400).json({ message: error, time: 10 });
				}
				this._error = "404";

				break;

			default:
				if (this._reply) {
					this._reply
						.status(400)
						.json({ message: this._messageDefault, error });
				}
				this._error = "error";

				break;
		}
		return this._reply;
	}

	async getError(): Promise<any> {
		return this._reply || this._error;
	}
}