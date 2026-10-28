import { useState } from 'react'

import { useConsultaDetran, useConsultaSipol } from '@/api/consultas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Fonte = 'detran' | 'sipol'

export function ConsultasPage() {
  const [fonte, setFonte] = useState<Fonte>('detran')
  const [documentUser, setDocumentUser] = useState('')
  const [document, setDocument] = useState('')
  const [name, setName] = useState('')
  const [resultado, setResultado] = useState<unknown>(null)

  const detran = useConsultaDetran()
  const sipol = useConsultaSipol()
  const pendente = detran.isPending || sipol.isPending
  const erro = detran.error || sipol.error

  async function consultar() {
    setResultado(null)
    const body = {
      document_user: documentUser.trim(),
      document: document.trim() || undefined,
      name: name.trim() || undefined,
    }
    if (fonte === 'detran') {
      const r = await detran.mutateAsync(body)
      setResultado(r.dados)
    } else {
      const r = await sipol.mutateAsync(body)
      setResultado(r.person)
    }
  }

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold">Consultas</h2>
        <p className="text-sm text-muted">
          Consulta de pessoa no DETRAN e SIPOL (requer autenticação)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar pessoa</CardTitle>
          <CardDescription>
            Informe o CPF do operador e os dados da consulta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={fonte === 'detran' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFonte('detran')}
            >
              DETRAN
            </Button>
            <Button
              variant={fonte === 'sipol' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFonte('sipol')}
            >
              SIPOL
            </Button>
            <Badge variant="outline">{fonte.toUpperCase()}</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>CPF do operador *</Label>
              <Input
                className="font-mono"
                value={documentUser}
                onChange={(e) => setDocumentUser(e.target.value)}
                placeholder="00000000000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CPF / documento</Label>
              <Input
                className="font-mono"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <Button
            onClick={consultar}
            disabled={!documentUser.trim() || pendente}
          >
            {pendente ? 'Consultando…' : 'Consultar'}
          </Button>

          {erro && (
            <p className="text-sm text-danger">{(erro as Error).message}</p>
          )}
        </CardContent>
      </Card>

      {resultado != null && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[480px] overflow-auto rounded-md bg-ink p-4 font-mono text-xs text-on-ink">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
