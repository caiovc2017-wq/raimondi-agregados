import { useState, useEffect } from 'react'

export default function Atualizacao() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return

    window.electronAPI.onUpdateStatus((data) => {
      console.log('Update status:', data)
      setStatus(data)
      // Auto-fecha mensagens informativas após 5 segundos
      if (data.status === 'not-available' || data.status === 'error') {
        setTimeout(() => setStatus(null), 5000)
      }
    })

    return () => {
      window.electronAPI.removeUpdateListener?.()
    }
  }, [])

  if (!status) return null

  const instalar = () => window.electronAPI.installUpdate()
  const fechar = () => setStatus(null)

  const configs = {
    'checking': { cor: '#1B5FAD', icone: 'ti-refresh', titulo: 'Verificando...', msg: 'Verificando atualizações no servidor...' },
    'not-available': { cor: '#2d7a1a', icone: 'ti-circle-check', titulo: 'Sistema atualizado!', msg: 'Você já está na versão mais recente.' },
    'available': { cor: '#1B5FAD', icone: 'ti-refresh', titulo: 'Atualização disponível!', msg: `Versão ${status.version} encontrada. Baixando...` },
    'downloading': { cor: '#1B5FAD', icone: 'ti-download', titulo: 'Baixando atualização...', msg: `${status.percent || 0}% — ${status.speed || ''}` },
    'downloaded': { cor: '#2d7a1a', icone: 'ti-download', titulo: 'Pronto para instalar!', msg: `Versão ${status.version} baixada. Instalar agora?` },
    'error': { cor: '#b03030', icone: 'ti-alert-circle', titulo: 'Erro na atualização', msg: status.message || 'Não foi possível verificar atualizações.' }
  }

  const cfg = configs[status.status] || configs['error']

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
      <style>{`@keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      {/* Header */}
      <div style={{ background: cfg.cor, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ti ${cfg.icone}`} style={{ color: '#fff', fontSize: 18 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{cfg.titulo}</span>
        </div>
        <button onClick={fechar} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 18 }}>
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.5 }}>{cfg.msg}</p>

        {/* Barra de progresso */}
        {status.status === 'downloading' && (
          <div style={{ background: '#eef0f4', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${status.percent || 0}%`, background: '#1B5FAD', borderRadius: 6, transition: 'width .3s' }} />
          </div>
        )}

        {/* Botões para instalar */}
        {status.status === 'downloaded' && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={instalar} style={{ flex: 1, background: '#1B5FAD', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <i className="ti ti-download" /> Instalar agora
              </button>
              <button onClick={fechar} style={{ background: '#f5f6f8', color: '#4a5568', border: '1.5px solid #e2e5ec', borderRadius: 8, padding: '9px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Depois
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#8a93a5', textAlign: 'center' }}>Será instalado automaticamente ao fechar o sistema</p>
          </>
        )}
      </div>
    </div>
  )
}
