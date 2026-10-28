import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, TelaLogin, useAuth } from '@/api/auth'
import { AdminPage } from '@/features/admin/AdminPage'
import { AtivoDetalhePage } from '@/features/ativos/AtivoDetalhePage'
import { AtivosPage } from '@/features/ativos/AtivosPage'
import { ChamadoDetalhePage } from '@/features/chamados/ChamadoDetalhePage'
import { ChamadosPage } from '@/features/chamados/ChamadosPage'
import { ConsultasPage } from '@/features/consultas/ConsultasPage'
import { SeiPage } from '@/features/sei/SeiPage'
import { AppShell } from '@/layouts/AppShell'

function RotaPrivada({ children }: { children: React.ReactNode }) {
  const { autenticado } = useAuth()
  if (!autenticado) return <Navigate to="/login" replace />
  return children
}

function RotaAdmin({ children }: { children: React.ReactNode }) {
  const { ehAdmin } = useAuth()
  if (!ehAdmin) return <Navigate to="/chamados" replace />
  return children
}

function PortaoLogin() {
  const { autenticado } = useAuth()
  if (autenticado) return <Navigate to="/chamados" replace />
  return <TelaLogin />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PortaoLogin />} />
          <Route
            path="/"
            element={
              <RotaPrivada>
                <AppShell />
              </RotaPrivada>
            }
          >
            <Route index element={<Navigate to="/chamados" replace />} />
            <Route path="chamados" element={<ChamadosPage />} />
            <Route path="chamados/:id" element={<ChamadoDetalhePage />} />
            <Route path="ativos" element={<AtivosPage />} />
            <Route path="ativos/:id" element={<AtivoDetalhePage />} />
            <Route path="sei" element={<SeiPage />} />
            <Route path="consultas" element={<ConsultasPage />} />
            <Route
              path="admin"
              element={
                <RotaAdmin>
                  <AdminPage />
                </RotaAdmin>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
