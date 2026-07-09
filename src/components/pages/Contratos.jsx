import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAgregados } from '../../hooks/useAgregados'

const hoje = new Date().toISOString().split('T')[0]
const initForm = {
  numero: '', agregado_id: '', objeto: '',
  data_inicio: hoje, data_vigencia: '', status: 'ativo', observacoes: ''
}

export default function Contratos() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const { agregados } = useAgregados()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm)
  const [editando, setEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contratos')
      .select('*, agregados(nome)')
      .order('criado_em', { ascending: false })
    if (data) setContratos(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const abrirNovo = () => {
    setEditando(null)
    setForm(initForm)
    setErro('')
    setModal(true)
  }

  const abrirEditar = (c) => {
    setEditando(c)
    setForm({ ...c })
    setErro('')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.numero.trim()) { setErro('Informe o número do contrato.'); return }
    if (!form.agregado_id) { setErro('Selecione o agregado.'); return }
    if (!form.objeto.trim()) { setErro('Informe o objeto do contrato.'); return }
    if (!form.data_inicio) { setErro('Informe a data de início.'); return }
    if (!form.data_vigencia) { setErro('Informe a data de vigência.'); return }

    setSalvando(true)
    const { error } = editando
      ? await supabase.from('contratos').update(form).eq('id', editando.id)
      : await supabase.from('contratos').insert(form)
    setSalvando(false)
    if (error) { setErro(error.message); return }
    await fetch()
    setModal(false)
  }

  const remover = async (id) => {
    if (!confirm('Deseja excluir este contrato?')) return
    await supabase.from('contratos').delete().eq('id', id)
    await fetch()
  }

  const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const vencido = (d) => d && new Date(d) < new Date()
  const aVencer = (d) => {
    if (!d) return false
    const diff = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  }

  const filtrados = contratos.filter(c =>
    (c.numero || '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.agregados?.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.objeto || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Contratos</div>
            <div className="page-subtitle">Gestão de contratos e vigências</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary" onClick={abrirNovo}>
              <i className="ti ti-plus" /> Novo contrato
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="page-body-inner">
          {/* FILTROS */}
          <div className="filters-bar">
            <input
              className="form-input"
              style={{ width: 260 }}
              placeholder="🔍 Buscar por nº, agregado ou objeto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <select className="form-input form-select" style={{ width: 'auto' }}>
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="encerrado">Encerrado</option>
              <option value="suspenso">Suspenso</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8a93a5' }}>
              {filtrados.length} contratos
            </span>
          </div>

          {/* TABELA */}
          <div className="card">
            {loading ? (
              <div className="loading-spinner" style={{ padding: 40 }}><div className="spinner" /></div>
            ) : filtrados.length === 0 ? (
              <div className="empty-state">
                <i className="ti ti-contract" />
                <p>Nenhum contrato cadastrado</p>
                <span>Clique em "Novo contrato" para começar</span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nº Contrato</th>
                      <th>Agregado</th>
                      <th>Objeto</th>
                      <th>Início</th>
                      <th>Vigência</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(c => (
                      <tr key={c.id}>
                        <td><span className="tag">{c.numero}</span></td>
                        <td className="td-primary">{c.agregados?.nome}</td>
                        <td className="td-muted">{c.objeto}</td>
                        <td className="td-muted">{fmtData(c.data_inicio)}</td>
                        <td>
                          <span style={{
                            color: vencido(c.data_vigencia) ? '#b03030' : aVencer(c.data_vigencia) ? '#854f0b' : '#4a5568',
                            fontWeight: (vencido(c.data_vigencia) || aVencer(c.data_vigencia)) ? 600 : 400
                          }}>
                            {fmtData(c.data_vigencia)}
                            {vencido(c.data_vigencia) && <span style={{ fontSize: 11, marginLeft: 6, color: '#b03030' }}>⚠ Vencido</span>}
                            {aVencer(c.data_vigencia) && <span style={{ fontSize: 11, marginLeft: 6, color: '#854f0b' }}>⚠ Vence em breve</span>}
                          </span>
                        </td>
                        <td>
                          <span className={`chip ${c.status === 'ativo' ? 'chip-ativo' : c.status === 'encerrado' ? 'chip-inativo' : 'chip-aberto'}`}>
                            {c.status === 'ativo' ? 'Ativo' : c.status === 'encerrado' ? 'Encerrado' : 'Suspenso'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 4 }}>
                          <button className="ic-btn" onClick={() => abrirEditar(c)} title="Editar"><i className="ti ti-edit" /></button>
                          <button className="ic-btn" onClick={() => remover(c.id)} title="Excluir"><i className="ti ti-trash" /></button>
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
                <i className="ti ti-contract" /> {editando ? 'Editar contrato' : 'Novo contrato'}
              </span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error"><i className="ti ti-alert-circle" /> {erro}</div>}
              <div className="form-grid">
                <div>
                  <label className="form-label">Nº do contrato *</label>
                  <input className="form-input" placeholder="Ex: CONT-001" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ativo">Ativo</option>
                    <option value="encerrado">Encerrado</option>
                    <option value="suspenso">Suspenso</option>
                  </select>
                </div>
                <div className="form-full">
                  <label className="form-label">Agregado *</label>
                  <select className="form-input form-select" value={form.agregado_id} onChange={e => setForm(f => ({ ...f, agregado_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {agregados.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="form-full">
                  <label className="form-label">Objeto do contrato *</label>
                  <input className="form-input" placeholder="Ex: Locação de escavadeira 20t" value={form.objeto} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Data de início *</label>
                  <input type="date" className="form-input" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Data de vigência *</label>
                  <input type="date" className="form-input" value={form.data_vigencia} onChange={e => setForm(f => ({ ...f, data_vigencia: e.target.value }))} />
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
                <i className="ti ti-check" /> {salvando ? 'Salvando...' : 'Salvar contrato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
