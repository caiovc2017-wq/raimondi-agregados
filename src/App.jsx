import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './components/pages/Login'
import Dashboard from './components/pages/Dashboard'
import Cadastro from './components/pages/Cadastro'
import Lancamentos from './components/pages/Lancamentos'
import Abastecimento from './components/pages/Abastecimento'
import Contratos from './components/pages/Contratos'
import Financeiro from './components/pages/Financeiro'
import Obras from './components/pages/Obras'
import Relatorios from './components/pages/Relatorios'
import Atualizacao from './components/ui/Atualizacao'

function AppContent() {
  const { user, loading } = useAuth()
  const [pagina, setPagina] = useState('dashboard')

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8eaed' }}>
        <div className="loading-spinner">
          <div className="spinner" />
          <span>Carregando...</span>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  const renderPagina = () => {
    switch (pagina) {
      case 'dashboard':      return <Dashboard onNavegar={setPagina} />
      case 'cadastro':       return <Cadastro />
      case 'lancamentos':    return <Lancamentos />
      case 'abastecimento':  return <Abastecimento />
      case 'obras':          return <Obras />
      case 'contratos':      return <Contratos />
      case 'financeiro':     return <Financeiro />
      case 'relatorios':     return <Relatorios />
      default:               return <Dashboard onNavegar={setPagina} />
    }
  }

  return (
    <Layout paginaAtual={pagina} onNavegar={setPagina}>
      {renderPagina()}
      <Atualizacao />
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
