import { useState } from 'react'
import { useAgregados, useEquipamentos } from '../../hooks/useAgregados'

const TIPOS_EQUIP = ['Escavadeira', 'Caminhão basculante', 'Motoniveladora', 'Trator esteira', 'Retroescavadeira', 'Compactador', 'Caminhão pipa', 'Caminhão truck', 'Outro']

const initAgr = { nome: '', cpf_cnpj: '', telefone: '', chave_pix: '', banco: '', agencia: '', conta: '', status: 'ativo', observacoes: '' }
const initEq = { nome: '', tipo: 'Escavadeira', placa: '', capacidade: '', modo_lancamento: 'hora_maquina', ativo: true }

export default function Cadastro() {
  const { agregados, loading, criar, atualizar, remover } = useAgregados()
  const [selecionado, setSelecionado] = useState(null)
  const [busca, setBusca] = useState('')
  const [modalAgr, setModalAgr] = useState(false)
  const [modalEq, setModalEq] = useState(false)
  const [formAgr, setFormAgr] = useState(initAgr)
  const [formEq, setFormEq] = useState(initEq)
  const [editandoAgr, setEditandoAgr] = useState(null)
  const [editandoEq, setEditandoEq] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const { equipamentos, criar: criarEq, atualizar: atualizarEq, remover: removerEq } = useEquipamentos(selecionado?.id)

  const filtrados = agregados.filter(a =>
    a.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (a.cpf_cnpj || '').includes(busca)
  )

  const iniciais = (nome) => nome?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?'

  // MODAL AGREGADO
  const abrirNovoAgr = () => {
    setEditandoAgr(null)
    setFormAgr(initAgr)
    setErro('')
    setModalAgr(true)
  }
  const abrirEditarAgr = () => {
    if (!selecionado) return
    setEditandoAgr(selecionado)
    setFormAgr({ ...selecionado })
    setErro('')
    setModalAgr(true)
  }
  const salvarAgr = async () => {
    if (!formAgr.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true)
    const { data, error } = editandoAgr
      ? await atualizar(editandoAgr.id, formAgr)
      : await criar(formAgr)
    setSalvando(false)
    if (error) { setErro(error.message); return }
    if (!editandoAgr) setSelecionado(data)
    else setSelecionado({ ...selecionado, ...formAgr })
    setModalAgr(false)
  }

  // MODAL EQUIPAMENTO
  const abrirNovoEq = () => {
    setEditandoEq(null)
    setFormEq(initEq)
    setErro('')
    setModalEq(true)
  }
  const abrirEditarEq = (eq) => {
    setEditandoEq(eq)
    setFormEq({ ...eq })
    setErro('')
    setModalEq(true)
  }
  const salvarEq = async () => {
    if (!formEq.nome.trim()) { setErro('Nome do equipamento é obrigatório.'); return }
    setSalvando(true)
    const payload = { ...formEq, agregado_id: selecionado.id }
    const { error } = editandoEq
      ? await atualizarEq(editandoEq.id, payload)
      : await criarEq(payload)
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setModalEq(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Cadastro</div>
            <div className="page-subtitle">Agregados e equipamentos</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary" onClick={abrirNovoAgr}>
              <i className="ti ti-plus" /> Novo agregado
            </button>
          </div>
        </div>
      </div>

      <div className="split-layout">
        {/* LISTA */}
        <div className="split-left">
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e5ec' }}>
            <input
              className="form-input"
              placeholder="🔍 Buscar..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div className="lscr" style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#8a93a5' }}>Carregando...</div>
            ) : filtrados.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#8a93a5' }}>Nenhum agregado encontrado</div>
            ) : filtrados.map(a => (
              <div
                key={a.id}
                className={`list-item ${selecionado?.id === a.id ? 'active' : ''}`}
                onClick={() => setSelecionado(a)}
              >
                <div className="list-avatar">{iniciais(a.nome)}</div>
                <div>
                  <div className="list-name">{a.nome}</div>
                  <div className="list-sub">{a.equipamentos?.length || 0} equip. · {a.status}</div>
                </div>
                <span className={`chip ${a.status === 'ativo' ? 'chip-ativo' : 'chip-inativo'}`} style={{ marginLeft: 'auto' }}>
                  {a.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 16px', fontSize: 13, color: '#8a93a5', borderTop: '1px solid #e2e5ec' }}>
            {agregados.length} agregados · {agregados.filter(a => a.status === 'ativo').length} ativos
          </div>
        </div>

        {/* DETALHE */}
        <div className="split-right">
          {!selecionado ? (
            <div className="empty-state">
              <i className="ti ti-user-search" />
              <p>Selecione um agregado</p>
              <span>Clique em um nome à esquerda para ver os detalhes</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1f2e' }}>{selecionado.nome}</div>
                  <div style={{ fontSize: 13, color: '#8a93a5', marginTop: 4 }}>
                    Cadastrado em {new Date(selecionado.criado_em).toLocaleDateString('pt-BR')} ·{' '}
                    <span className={`chip ${selecionado.status === 'ativo' ? 'chip-ativo' : 'chip-inativo'}`}>{selecionado.status}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={abrirEditarAgr}>
                    <i className="ti ti-edit" /> Editar
                  </button>
                </div>
              </div>

              {/* DADOS */}
              <div className="section-card">
                <div className="section-header">
                  <span className="section-title"><i className="ti ti-user" /> Dados pessoais e pagamento</span>
                </div>
                <div className="info-grid">
                  <div><div className="info-label">CPF / CNPJ</div><div className="info-value">{selecionado.cpf_cnpj || '—'}</div></div>
                  <div><div className="info-label">WhatsApp</div><div className="info-value">{selecionado.telefone || '—'}</div></div>
                  <div><div className="info-label">Chave PIX</div><div className="info-value">{selecionado.chave_pix || '—'}</div></div>
                  <div><div className="info-label">Banco</div><div className="info-value">{selecionado.banco || '—'}</div></div>
                  <div className="info-full">
                    <div style={{ height: 1, background: '#e2e5ec', margin: '4px 0 12px' }} />
                    <div className="info-label">Agência / Conta</div>
                    <div className="info-value">
                      {selecionado.agencia ? `Ag. ${selecionado.agencia}` : '—'}
                      {selecionado.conta ? ` · CC ${selecionado.conta}` : ''}
                    </div>
                  </div>
                  {selecionado.observacoes && (
                    <div className="info-full">
                      <div className="info-label">Observações</div>
                      <div className="info-value">{selecionado.observacoes}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* EQUIPAMENTOS */}
              <div className="section-card">
                <div className="section-header">
                  <span className="section-title"><i className="ti ti-bulldozer" /> Equipamentos</span>
                  <button className="btn btn-primary btn-sm" onClick={abrirNovoEq}>
                    <i className="ti ti-plus" /> Adicionar
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 90px 80px 36px', gap: 12, padding: '9px 18px', fontSize: 11, color: '#8a93a5', fontWeight: 600, textTransform: 'uppercase', background: 'var(--rbl)', letterSpacing: '.04em' }}>
                  <span></span><span>Equipamento</span><span>Tipo</span><span>Placa</span><span>Modo</span><span></span>
                </div>
                {equipamentos.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#8a93a5', fontSize: 13 }}>
                    Nenhum equipamento cadastrado
                  </div>
                ) : equipamentos.map(eq => (
                  <div key={eq.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 90px 80px 36px', gap: 12, padding: '12px 18px', borderBottom: '1px solid #f0f2f5', alignItems: 'center', fontSize: 14 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--rbl)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--rb)' }}>
                      <i className="ti ti-bulldozer" />
                    </div>
                    <span style={{ fontWeight: 600, color: '#1a1f2e' }}>{eq.nome}</span>
                    <span style={{ color: '#4a5568' }}>{eq.tipo}</span>
                    <span style={{ color: '#8a93a5' }}>{eq.placa || '—'}</span>
                    <span><span className={`chip ${eq.modo_lancamento === 'hora_maquina' ? 'chip-hora' : 'chip-m3'}`}>{eq.modo_lancamento === 'hora_maquina' ? 'Hora máq.' : 'Carga m³'}</span></span>
                    <button className="ic-btn" onClick={() => abrirEditarEq(eq)}><i className="ti ti-edit" /></button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL AGREGADO */}
      {modalAgr && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalAgr(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title"><i className="ti ti-user-plus" /> {editandoAgr ? 'Editar agregado' : 'Novo agregado'}</span>
              <button className="modal-close" onClick={() => setModalAgr(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error"><i className="ti ti-alert-circle" /> {erro}</div>}
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Nome completo / Razão social *</label>
                  <input className="form-input" placeholder="Ex: João Silva ou Trans. ABC Ltda" value={formAgr.nome} onChange={e => setFormAgr(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">CPF / CNPJ</label>
                  <input className="form-input" placeholder="000.000.000-00" value={formAgr.cpf_cnpj} onChange={e => setFormAgr(f => ({ ...f, cpf_cnpj: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input className="form-input" placeholder="(00) 00000-0000" value={formAgr.telefone} onChange={e => setFormAgr(f => ({ ...f, telefone: e.target.value }))} />
                </div>
                <div className="form-full"><div style={{ height: 1, background: '#e2e5ec' }} /></div>
                <div className="form-full">
                  <label className="form-label">Chave PIX</label>
                  <input className="form-input" placeholder="CPF, e-mail, telefone ou chave aleatória" value={formAgr.chave_pix} onChange={e => setFormAgr(f => ({ ...f, chave_pix: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Banco</label>
                  <input className="form-input" placeholder="Ex: Banco do Brasil" value={formAgr.banco} onChange={e => setFormAgr(f => ({ ...f, banco: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Agência</label>
                  <input className="form-input" placeholder="0000-0" value={formAgr.agencia} onChange={e => setFormAgr(f => ({ ...f, agencia: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Conta corrente</label>
                  <input className="form-input" placeholder="00000-0" value={formAgr.conta} onChange={e => setFormAgr(f => ({ ...f, conta: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input form-select" value={formAgr.status} onChange={e => setFormAgr(f => ({ ...f, status: e.target.value }))}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div className="form-full">
                  <label className="form-label">Observações (opcional)</label>
                  <input className="form-input" placeholder="Anotações adicionais..." value={formAgr.observacoes} onChange={e => setFormAgr(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalAgr(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarAgr} disabled={salvando}>
                <i className="ti ti-check" /> {salvando ? 'Salvando...' : 'Salvar agregado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EQUIPAMENTO */}
      {modalEq && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalEq(false)}>
          <div className="modal" style={{ width: 460 }}>
            <div className="modal-header">
              <span className="modal-title"><i className="ti ti-bulldozer" /> {editandoEq ? 'Editar equipamento' : 'Novo equipamento'}</span>
              <button className="modal-close" onClick={() => setModalEq(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error"><i className="ti ti-alert-circle" /> {erro}</div>}
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Nome do equipamento *</label>
                  <input className="form-input" placeholder="Ex: Escavadeira 20t, Basculante 12m³" value={formEq.nome} onChange={e => setFormEq(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Tipo</label>
                  <select className="form-input form-select" value={formEq.tipo} onChange={e => setFormEq(f => ({ ...f, tipo: e.target.value }))}>
                    {TIPOS_EQUIP.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Placa</label>
                  <input className="form-input" placeholder="ABC-1234" value={formEq.placa} onChange={e => setFormEq(f => ({ ...f, placa: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Capacidade</label>
                  <input className="form-input" placeholder="Ex: 20t, 12m³" value={formEq.capacidade} onChange={e => setFormEq(f => ({ ...f, capacidade: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Modo de lançamento *</label>
                  <select className="form-input form-select" value={formEq.modo_lancamento} onChange={e => setFormEq(f => ({ ...f, modo_lancamento: e.target.value }))}>
                    <option value="hora_maquina">Hora máquina (h)</option>
                    <option value="carga_m3">Carga m³</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalEq(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarEq} disabled={salvando}>
                <i className="ti ti-check" /> {salvando ? 'Salvando...' : 'Salvar equipamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
