import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env";
import { fromUnixTime, isBefore } from "date-fns";
import { prisma } from '../lib/prisma'
import { jwtParse } from "../utils/jwtParse";

interface Token {
	exp: number;
}

interface GatewaySegovConfig {
	document_user: string;
}

interface GetFleetsParams {
	management?: number;
	page?: number;
	perPage?: number;
}

function toBearer(token: string): string {
	const trimmed = token.trim();
	return trimmed.startsWith("Bearer ") ? trimmed : `Bearer ${trimmed}`;
}

function rawJwt(token: string): string {
	return token.replace(/^Bearer\s+/i, "").trim();
}

export class GatewaySegov {
	private _reply: any;
	private _document: string;
	private _password: string;
	private api: AxiosInstance;
	private _error: string | null;
	private _messageDefault: string;

	constructor({ document_user }: GatewaySegovConfig) {
		this._reply = null;
		this._document = env.SEGOV_USER;
		this._password = env.SEGOV_PASSWORD;
		this.api = axios.create({
			baseURL: env.SEGOV_URL,
			timeout: 30000,
			headers: {
				'cpf-usuario': document_user,
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
					segov_status: true,
					segov_token: true,
				},
			});

			if (!response?.segov_status) {
				this.setError("StatusOff");
				return false;
			}

			const token: Token | null = response.segov_token
				? jwtParse(rawJwt(response.segov_token))
				: null;

			if (token && isBefore(new Date(), fromUnixTime(token.exp))) {
				this.api.defaults.headers.Authorization = toBearer(response.segov_token || '');
				return true;
			}

			return this.attempt();
		} catch (error) {
			this.setError("error", error);

			return false;
		}
	}

	async attempt() {
		try {
			const { status, data } = await this.api.post("auth/login", {
				document: this._document,
				password: this._password,
			});

			if (status === 200 && data?.token) {
				const bearer = toBearer(data.token);

				await prisma.setting.update({
					where: {
						id: 1,
					},
					data: {
						segov_token: bearer,
					},
				});

				this.api.defaults.headers.Authorization = bearer;
				return true;
			}

			return false;
		} catch (error: any) {
			this.setError('error', error);

			return false;
		}
	}

	async getFleets({
		management,
		page = 1,
		perPage = 500,
	}: GetFleetsParams): Promise<any> {
		try {
			const authenticated = await this.auth();
			if (!authenticated) {
				return false;
			}

			const { data } = await this.api.get(`/fleets`, {
				params: {
					managementId: management,
					page,
					perPage,
				},
			});
			return data;
		} catch (error: any) {
			this.setError('error', error);
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
