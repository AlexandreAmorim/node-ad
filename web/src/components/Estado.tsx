import { ApiError } from '@/api/client'

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-5 py-8 text-center text-[13px] text-muted">
      {texto}
    </div>
  )
}

export function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card px-5 py-8 text-center text-[13px] text-muted">
      {texto}
    </div>
  )
}

/**
 * Erro da API. Diferencia o caso mais provável em produção — API fora do ar ou
 * CORS — dos erros de negócio, porque a ação do operador é diferente.
 */
export function ErroApi({ erro, aoTentar }: { erro: unknown; aoTentar?: () => void }) {
  const conhecido = erro instanceof ApiError
  const mensagem = conhecido
    ? erro.message
    : 'Não foi possível falar com a API. Verifique se o serviço está no ar.'

  return (
    <div className="rounded-lg border border-danger/35 bg-danger/6 px-5 py-4">
      <div className="text-[13px] font-semibold text-danger">
        {conhecido ? `Erro ${erro.status}` : 'Sem conexão'}
      </div>
      <p className="mt-1 text-[12.5px] text-ink">{mensagem}</p>

      {conhecido && erro.detalhes && (
        <ul className="mt-2 text-[12px] text-muted">
          {erro.detalhes.map((d) => (
            <li key={d.campo}>
              <span className="font-mono">{d.campo}</span>: {d.mensagem}
            </li>
          ))}
        </ul>
      )}

      {aoTentar && (
        <button
          type="button"
          onClick={aoTentar}
          className="mt-3 cursor-pointer rounded border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

/** Marca conteúdo que ainda vem de dados fictícios do protótipo. */
export function AvisoDemonstracao({ texto }: { texto: string }) {
  return (
    <div className="mb-4 rounded-md border border-warn/35 bg-warn/6 px-3 py-2.5 text-[12.5px] text-ink">
      <span className="font-semibold text-warn">⚠ Demonstração — </span>
      {texto}
    </div>
  )
}
