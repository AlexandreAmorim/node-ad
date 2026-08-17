import { useState } from 'react'

import { AuthProvider, TelaLogin, useAuth } from '@/api/auth'
import { Badge } from '@/components/Badge'
import { MesaCorregedor } from '@/features/mesa/MesaCorregedor'
import { Prazos } from '@/features/prazos/Prazos'
import { VisaoGeral } from '@/features/visao-geral/VisaoGeral'
import { Vinculos } from '@/features/vinculos/Vinculos'
import type { AbaPainel } from '@/types'

const ABAS: { id: AbaPainel; rotulo: string }[] = [
  { id: 'visao', rotulo: 'Visão Geral' },
  { id: 'prazos', rotulo: 'Prazos' },
  { id: 'vinculos', rotulo: 'Vínculos' },
  { id: 'mesa', rotulo: 'Mesa do Corregedor' },
]

function Painel() {
  const { usuario, sair } = useAuth()
  const [aba, setAba] = useState<AbaPainel>('visao')
  const [casoSel, setCasoSel] = useState<string | null>(null)

  const abrirFicha = (id: string) => {
    setCasoSel(id)
    setAba('mesa')
  }

  return (
    <div className="min-h-screen bg-paper font-body">
      <header className="bg-ink px-6">
        <div className="mx-auto max-w-shell">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-[18px] pb-3">
            <div>
              <div className="font-mono text-[10.5px] tracking-[0.18em] text-on-ink-soft uppercase">
                Secretaria de Governo · Rio de Janeiro
              </div>
              <h1 className="mt-[3px] font-display text-2xl font-extrabold text-white">
                Painel de Gestão Correcional
              </h1>
            </div>
            <div className="text-right">
              <Badge tone="onInkWarn">{usuario?.displayName ?? usuario?.username}</Badge>
              <div className="mt-[5px]">
                <button
                  type="button"
                  onClick={sair}
                  className="cursor-pointer font-mono text-[11px] text-on-ink-soft underline"
                >
                  sair
                </button>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1" aria-label="Seções do painel">
            {ABAS.map((item) => {
              const ativa = aba === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAba(item.id)}
                  aria-current={ativa ? 'page' : undefined}
                  className={`cursor-pointer rounded-t-md border-none px-4 py-2.5 font-display text-[13.5px] font-semibold transition-colors ${
                    ativa ? 'bg-paper text-ink' : 'bg-transparent text-on-ink hover:text-white'
                  }`}
                >
                  {item.rotulo}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-shell px-6 pt-[18px] pb-12">
        {aba === 'visao' && <VisaoGeral />}
        {aba === 'prazos' && <Prazos abrirFicha={abrirFicha} />}
        {aba === 'vinculos' && <Vinculos />}
        {aba === 'mesa' && <MesaCorregedor casoSel={casoSel} setCasoSel={setCasoSel} />}
      </main>
    </div>
  )
}

function Portao() {
  const { autenticado } = useAuth()
  return autenticado ? <Painel /> : <TelaLogin />
}

export default function App() {
  return (
    <AuthProvider>
      <Portao />
    </AuthProvider>
  )
}
