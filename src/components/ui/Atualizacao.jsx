import { useState, useEffect } from 'react'

export default function Atualizacao() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    // Só roda no Electron
    if (!window.electronAPI?.onUpdateStatus) return

    window.electronAPI.onUpdateStatus((data) => {
      setStatus(data)
    })

    return () => {
      window.electronAPI.removeUpdateListener?.()
    }
  }, [])

  // Nada a mostrar
  if (!status) return null
  if (status.status === 'not-available' || status.status === 'checking') return null
  if (status.status === 'error') return null

  const instalar = () => {
    window.electronAPI.installUpdate()
  }

  const fechar = () => setStatus(null)

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 999,
      width: 340,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,.18)',
      border: '1px solid #e2e5ec',
      overflow: 'hidden',
      animation: 'slideIn .3s ease'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#0D3D7A',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-refresh" style={{ color: '#fff', fontSize: 18 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {status.status === 'available' && 'Atualização disponível'}
            {status.status === 'downloading' && 'Baixando atualização...'}
            {status.status === 'downloaded' && 'Atualização pronta!'}
          </span>
        </div>
        <button onClick={fechar} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: 18, display: 'flex' }}>
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Disponível — baixando automaticamente */}
        {status.status === 'available' && (
          <>
            <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.5 }}>
              A versão <strong>{status.version}</strong> está disponível e será baixada automaticamente em segundo plano.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1B5FAD', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, color: '#8a93a5' }}>Baixando em segundo plano...</span>
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
          </>
        )}

        {/* Progresso do download */}
        {status.status === 'downloading' && (
          <>
            <p style={{ fontSize: 13, color: '#4a5568' }}>
              Baixando versão <strong>{status.version || 'nova'}</strong>...
            </p>
            <div style={{ background: '#eef0f4', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${status.percent || 0}%`,
                background: '#1B5FAD',
                borderRadius: 6,
                transition: 'width .3s'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a93a5' }}>
              <span>{status.percent || 0}%</span>
              <span>{status.speed || ''}</span>
            </div>
          </>
        )}

        {/* Download concluído — pronto para instalar */}
        {status.status === 'downloaded' && (
          <>
            <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.5 }}>
              A versão <strong>{status.version}</strong> foi baixada. Deseja instalar agora? O sistema será reiniciado.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={instalar}
                style={{
                  flex: 1,
                  background: '#1B5FAD',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <i className="ti ti-download" /> Instalar agora
              </button>
              <button
                onClick={fechar}
                style={{
                  background: '#f5f6f8',
                  color: '#4a5568',
                  border: '1.5px solid #e2e5ec',
                  borderRadius: 8,
                  padding: '9px 14px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Depois
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#8a93a5', textAlign: 'center' }}>
              Será instalado automaticamente ao fechar o sistema
            </p>
          </>
        )}
      </div>
    </div>
  )
}
