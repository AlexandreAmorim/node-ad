import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env";
import { fromUnixTime, isBefore } from "date-fns";
import { prisma } from '../lib/prisma'
import { jwtParse } from "../utils/jwtParse";

interface Token {
	exp: number;
}

interface GatewaySipolConfig {
	document: string;
}

export default class GatewaySipolPerson {
	private _reply: any;
	private _username: string;
	private _password: string;
	private api: AxiosInstance;
	private _error: string | null;
	private _messageDefault: string;

	constructor({ document }: GatewaySipolConfig) {
		this._reply = null;
		this._username = env.SIPOL_USER;
		this._password = env.SIPOL_PASSWORD;
		this.api = axios.create({
			baseURL: env.SIPOL_URL,
			timeout: 30000,
			headers: {
				'cpf-usuario': document,
				Accept: "application/json",
			},
		});
		this._error = null;
		this._messageDefault =
			"...não está disponível no momento. Aguarde para prosseguir com a consulta.";
	}

	async auth() {
		try {
			const response = await prisma.setting.findFirst({
				select: {
					sipol_status: true,
					sipol_token: true,
				},
			});

			if (!response?.sipol_status) {
				this.setError("StatusOff");
				return false;
			}

			const token: Token | null = response.sipol_token
				? jwtParse(response.sipol_token.replace(/Bearer/, ""))
				: null;

			if (token && isBefore(new Date(), fromUnixTime(token.exp))) {
				this.api.defaults.headers.Authorization = response.sipol_token;
				return true;
			}

			return this.attempt();
		} catch (error) {
			console.log("error ", error)
			this.setError("error", error);

			return false;
		}
	}

	async attempt() {
		try {
			const { status, data } = await this.api.post("portal-api/signin", {
				username: this._username,
				password: this._password,
			});

			if (status === 200) {
				await prisma.setting.update({
					where: {
						id: 1,
					},
					data: {
						sipol_token: data.token,
					},
				});

				this.api.defaults.headers.Authorization = data.token;
				return true;
			}

			return false;
		} catch (error) {
			this.setError(error);

			return false;
		}
	}


	async handleImage(data: any) {
		const {
			prejudicadoId
		} = data[0];

		try {
			const uri = `/restricoes-liberdade/fotos`;
			const params = {prejudicadoId: prejudicadoId}
			const { data } = await this.api.get(uri,{ params, headers: {
				'content-type': 'image/jpeg'
			}, responseType: 'arraybuffer'});

			const buffer = Buffer.from(data);
			return buffer;
		} catch(err) {
			console.log(err)
		}
	}

	async getPersonSipol(payload: any) {
    try {
      await this.auth();

      const {
        document, document_secondary, name, mather, birthday,
      } = payload;

      if (document_secondary) {
        const uri = `/restricoes-liberdade/prejudicados`;
        const params = {
          tipoPesquisa: "inicio",
          idTipoDocumento: 1,
          numeroDocumento: document_secondary,
          pageSort: "prejudicado",
          pageOrder: "ASC",
        }
  
        const { data ,status } = await this.api.get(uri, { params, validateStatus: () => true });

        if (status !== 200) {
         return 202
        }

        const foto =  await this.handleImage(data)
        const dataConp = {...data, foto }
        return dataConp;
      }
      if (document) {
        const uri = `/restricoes-liberdade/prejudicados`;
        const params = {
          tipoPesquisa: "inicio",
          idTipoDocumento: 2,
          numeroDocumento: document,
          pageSort: "prejudicado",
          pageOrder: "ASC",
        }
        const { data ,status } = await this.api.get(uri, { params, validateStatus: () => true })
        if (status !== 200) {
          return 202
        }
        const foto =  await this.handleImage(data)
        const dataConp = {...data, foto }
        return dataConp;
      }
      if (name && mather && birthday) {
        const uri = `/restricoes-liberdade/prejudicados`;
        const params = {
          tipoPesquisa: "inicio",
          prejudicado: name,
          nomeMae: mather,
          dataNascimento: birthday,
          pageSort: "prejudicado",
          pageOrder: "ASC",
        }
        const { data ,status } = await this.api.get(uri, { params, validateStatus: () => true });
        if (status !== 200) {
          return 202
        }
        const foto =  await this.handleImage(data)
        const dataConp = {...data, foto }
       
        return dataConp;
      }

    } catch (error) {
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