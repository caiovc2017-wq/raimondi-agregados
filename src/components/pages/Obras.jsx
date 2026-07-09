import { useState } from 'react'
import { useObras } from '../../hooks/useObras'

const hoje = new Date().toISOString().split('T')[0]
const initForm = {
  nome: '', codigo: '', endereco: '', responsavel: '',
  status: 'ativa', data_inicio: hoje, data_previsao: '', observacoes: ''
}

export default function Obras() {
  const { obras, loading, criar, atualizar, remover } = useObras()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const abrirNovo = () => {
    setEditando(null)
    setForm(initForm)
    setErro('')
    setModal(true)
  }

  const abrirEditar = (o) => {
    setEditando(o)
    setForm({ ...o, data_inicio: o.data_inicio || hoje, data_previsao: o.data_previsao || '' })
    setErro('')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome da obra é obrigatório.'); return }
    setSalvando(true)
    const { error } = editando
      ? await atualizar(editando.id, form)
      : await criar(form)
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setModal(false)
  }

  const excluir = async (id) => {
    if (!confirm('Deseja excluir esta obra? Os lançamentos vinculados perderão o vínculo.')) return
    await remover(id)
  }

  const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const filtradas = obras.filter(o => {
    const b = busca.toLowerCase()
    const matchBusca = (o.nome || '').toLowerCase().includes(b) || (o.codigo || '').toLowerCase().includes(b) || (o.responsavel || '').toLowerCase().includes(b)
    const matchStatus = !filtroStatus || o.status === filtroStatus
    return matchBusca && matchStatus
  })

  const ativas = obras.filter(o => o.status === 'ativa').length
  const concluidas = obras.filter(o => o.status === 'concluida').length

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Obras</div>
            <div className="page-subtitle">Cadastro e controle de obras</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary" onClick={abrirNovo}>
              <i className="ti ti-plus" /> Nova obra
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="page-body-inner">
          {/* STATS */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total de obras</div>
              <div className="stat-value">{obras.length}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-label">Ativas</div>
              <div className="stat-value" style={{ color: '#2d7a1a' }}>{ativas}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Concluídas</div>
              <div className="stat-value">{concluidas}</div>
            </div>
            <div className="stat-card warn">
              <div className="stat-label">Suspensas</div>
              <div className="stat-value" style={{ color: '#c0392b' }}>{obras.filter(o => o.status === 'suspensa').length}</div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="filters-bar">
            <input
              className="form-input"
              style={{ width: 260 }}
              placeholder="🔍 Buscar por nome, código ou responsável..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <select className="form-input form-select" style={{ width: 'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="ativa">Ativa</option>
              <option value="concluida">Concluída</option>
              <option value="suspensa">Suspensa</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8a93a5' }}>{filtradas.length} obras</span>
          </div>

          {/* TABELA */}
          <div className="card">
            {loading ? (
              <div className="loading-spinner" style={{ padding: 40 }}><div className="spinner" /></div>
            ) : filtradas.length === 0 ? (
              <div className="empty-state">
                <i className="ti ti-building-factory" />
                <p>Nenhuma obra cadastrada</p>
                <span>Clique em "Nova obra" para começar</span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome da obra</th>
                      <th>Responsável</th>
                      <th>Endereço</th>
                      <th>Início</th>
                      <th>Previsão</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map(o => (
                      <tr key={o.id}>
                        <td>{o.codigo ? <span className="tag">{o.codigo}</span> : <span className="td-muted">—</span>}</td>
                        <td className="td-primary">{o.nome}</td>
                        <td className="td-muted">{o.responsavel || '—'}</td>
                        <td className="td-muted">{o.endereco || '—'}</td>
                        <td className="td-muted">{fmtData(o.data_inicio)}</td>
                        <td className="td-muted">{fmtData(o.data_previsao)}</td>
                        <td>
                          <span className={`chip ${o.status === 'ativa' ? 'chip-ativo' : o.status === 'concluida' ? 'chip-informativo' : 'chip-aberto'}`}>
                            {o.status === 'ativa' ? 'Ativa' : o.status === 'concluida' ? 'Concluída' : 'Suspensa'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 4 }}>
                          <button className="ic-btn" onClick={() => abrirEditar(o)} title="Editar"><i className="ti ti-edit" /></button>
                          <button className="ic-btn" onClick={() => excluir(o.id)} title="Excluir"><i className="ti ti-trash" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                <i className="ti ti-building-factory" /> {editando ? 'Editar obra' : 'Nova obra'}
              </span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error"><i className="ti ti-alert-circle" /> {erro}</div>}
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Nome da obra *</label>
                  <input className="form-input" placeholder="Ex: Terraplanagem Lote 5 — Blumenau" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Código / Identificação</label>
                  <input className="form-input" placeholder="Ex: OBR-001" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ativa">Ativa</option>
                    <option value="concluida">Concluída</option>
                    <option value="suspensa">Suspensa</option>
                  </select>
                </div>
                <div className="form-full">
                  <label className="form-label">Endereço / Localização</label>
                  <input className="form-input" placeholder="Ex: Rua das Flores, 100 — Blumenau/SC" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Responsável</label>
                  <input className="form-input" placeholder="Nome do responsável" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Data de início</label>
                  <input type="date" className="form-input" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Previsão de conclusão</label>
                  <input type="date" className="form-input" value={form.data_previsao} onChange={e => setForm(f => ({ ...f, data_previsao: e.target.value }))} />
                </div>
                <div className="form-full">
                  <label className="form-label">Observações <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
                  <input className="form-input" placeholder="Anotações adicionais..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                <i className="ti ti-check" /> {salvando ? 'Salvando...' : 'Salvar obra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
