import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Layout.css'

const GRUPOS = {
  principal: [
    { id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { id: 'cadastro', label: 'Cadastro', icon: 'ti-users' },
    { id: 'lancamentos', label: 'Lançamentos', icon: 'ti-clipboard-list' },
    { id: 'abastecimento', label: 'Abastecimento', icon: 'ti-gas-station' },
  ],
  gestao: [
    { id: 'obras', label: 'Obras', icon: 'ti-building-factory' },
    { id: 'contratos', label: 'Contratos', icon: 'ti-contract' },
    { id: 'financeiro', label: 'Financeiro', icon: 'ti-currency-dollar' },
    { id: 'relatorios', label: 'Relatórios', icon: 'ti-chart-bar' },
  ]
}

export default function Layout({ paginaAtual, onNavegar, children }) {
  const [grupoAtual, setGrupoAtual] = useState('principal')
  const { user, signOut } = useAuth()

  const mudarGrupo = (grupo) => {
    setGrupoAtual(grupo)
    onNavegar(GRUPOS[grupo][0].id)
  }

  const navegar = (pagina) => {
    const grupo = GRUPOS.principal.find(i => i.id === pagina) ? 'principal' : 'gestao'
    if (grupo !== grupoAtual) setGrupoAtual(grupo)
    onNavegar(pagina)
  }

  const itensGrupo = GRUPOS[grupoAtual]

  return (
    <div className="layout">
      {/* HEADER */}
      <header className="header">
        <div className="header-top">
          <div className="logo-area">
            <img
              src="./logo.png"
              alt="Raimondi"
              style={{ height: 36, objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none' }}
            />
            <div className="logo-divider" />
            <span className="sys-label">Gestão de Agregados</span>
          </div>
          <div className="header-right">
            <span className="user-name">{user?.email}</span>
            <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
            {window.electronAPI?.checkUpdate && (
              <button
                className="icon-btn"
                onClick={() => window.electronAPI.checkUpdate()}
                title="Verificar atualizações"
              >
                <i className="ti ti-refresh" />
              </button>
            )}
            <button className="icon-btn" onClick={signOut} title="Sair">
              <i className="ti ti-logout" />
            </button>
          </div>
        </div>

        {/* ABAS DE GRUPO */}
        <div className="group-tabs">
          {Object.keys(GRUPOS).map(g => (
            <button
              key={g}
              className={`group-tab ${grupoAtual === g ? 'on' : ''}`}
              onClick={() => mudarGrupo(g)}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* RIBBON */}
      <div className="ribbon">
        <div className="ribbon-inner">
          {itensGrupo.map(item => (
            <button
              key={item.id}
              className={`ribbon-item ${paginaAtual === item.id ? 'on' : ''}`}
              onClick={() => navegar(item.id)}
            >
              <i className={`ti ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
