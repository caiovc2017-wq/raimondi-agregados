import { useState } from 'react'
import { useLancamentos } from '../../hooks/useLancamentos'
import { useAgregados, useEquipamentos } from '../../hooks/useAgregados'
import { useObras } from '../../hooks/useObras'

const hoje = new Date().toISOString().split('T')[0]

const initForm = {
  requisicao: '', agregado_id: '', equipamento_id: '', obra_id: '',
  quantidade: '', valor_unitario: '', data_lancamento: hoje,
  status_pagamento: 'em_aberto', is_permuta: false,
  descricao_permuta: '', observacoes: ''
}

export default function Lancamentos() {
  const [filtros, setFiltros] = useState({ dataInicio: hoje, dataFim: hoje })
  const { lancamentos, loading, criar, remover } = useLancamentos(filtros)
  const { agregados } = useAgregados()
  const { obras } = useObras(true) // só obras ativas
  const [agregadoSelecionado, setAgregadoSelecionado] = useState('')
  const { equipamentos } = useEquipamentos(agregadoSelecionado || null)

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  const equipSel = equipamentos.find(e => e.id === form.equipamento_id)
  const modo = equipSel?.modo_lancamento || null
  const qty = parseFloat(String(form.quantidade).replace(',', '.'))
  const vu = parseFloat(String(form.valor_unitario).replace(',', '.'))
  const total = !isNaN(qty) && !isNaN(vu) && qty > 0 && vu > 0 ? qty * vu : null

  const abrirModal = () => {
    setForm(initForm)
    setAgregadoSelecionado('')
    setErro('')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.requisicao.trim()) { setErro('Informe o número da requisição.'); return }
    if (!form.agregado_id) { setErro('Selecione o agregado.'); return }
    if (!form.equipamento_id) { setErro('Selecione o equipamento.'); return }
    if (!form.quantidade || isNaN(qty) || qty <= 0) { setErro('Informe a quantidade.'); return }
    if (!form.is_permuta && (!form.valor_unitario || isNaN(vu) || vu <= 0)) { setErro('Informe o valor unitário.'); return }

    setSalvando(true)
    const payload = {
      ...form,
      tipo: modo,
      quantidade: qty,
      valor_unitario: form.is_permuta ? null : vu,
      status_pagamento: form.is_permuta ? 'permuta' : form.status_pagamento,
      obra_id: form.obra_id || null
    }
    const { error } = await criar(payload)
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setModal(false)
  }

  const lancamentosFiltrados = lancamentos.filter(l => {
    const nome = l.agregados?.nome?.toLowerCase() || ''
    const req = l.requisicao?.toLowerCase() || ''
    const obra = l.obras?.nome?.toLowerCase() || ''
    const b = busca.toLowerCase()
    return nome.includes(b) || req.includes(b) || obra.includes(b)
  })

  const fmtData = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
  const fmtValor = (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Lançamentos</div>
            <div className="page-subtitle">Horas máquina e cargas m³</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary"><i className="ti ti-download" /> Exportar</button>
            <button className="btn btn-primary" onClick={abrirModal}><i className="ti ti-plus" /> Novo lançamento</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="page-body-inner">
          {/* FILTROS */}
          <div className="filters-bar">
            <input className="form-input" style={{ width: 220 }} placeholder="🔍 Buscar agregado, REQ ou obra..." value={busca} onChange={e => setBusca(e.target.value)} />
            <select className="form-input form-select" style={{ width: 'auto' }} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value || undefined }))}>
              <option value="">Todos os serviços</option>
              <option value="hora_maquina">Hora máquina</option>
              <option value="carga_m3">Carga m³</option>
            </select>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filtros.dataInicio || ''} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} />
            <span style={{ color: '#8a93a5', fontSize: 14 }}>até</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filtros.dataFim || ''} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} />
            <select className="form-input form-select" style={{ width: 'auto' }} onChange={e => setFiltros(f => ({ ...f, status: e.target.value || undefined }))}>
              <option value="">Todos os status</option>
              <option value="em_aberto">Em aberto</option>
              <option value="pago">Pago</option>
              <option value="permuta">Permuta</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8a93a5' }}>{lancamentosFiltrados.length} registros</span>
          </div>

          {/* TABELA */}
          <div className="card">
            {loading ? (
              <div className="loading-spinner" style={{ padding: 40 }}><div className="spinner" /></div>
            ) : lancamentosFiltrados.length === 0 ? (
              <div className="empty-state">
                <i className="ti ti-clipboard-list" />
                <p>Nenhum lançamento encontrado</p>
                <span>Ajuste os filtros ou crie um novo lançamento</span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Requisição</th>
                      <th>Obra</th>
                      <th>Agregado</th>
                      <th>Equipamento</th>
                      <th>Tipo</th>
                      <th>Qtd</th>
                      <th>Valor unit.</th>
                      <th>Total</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentosFiltrados.map(l => (
                      <tr key={l.id}>
                        <td><span className="tag">{l.requisicao}</span></td>
                        <td className="td-muted">{l.obras?.nome || '—'}</td>
                        <td className="td-primary">{l.agregados?.nome}</td>
                        <td className="td-muted">{l.equipamentos?.nome}</td>
                        <td><span className={`chip ${l.tipo === 'hora_maquina' ? 'chip-hora' : 'chip-m3'}`}>{l.tipo === 'hora_maquina' ? 'Hora máq.' : 'Carga m³'}</span></td>
                        <td>{l.tipo === 'hora_maquina' ? `${l.quantidade} h` : `${l.quantidade} m³`}</td>
                        <td>{l.is_permuta ? '—' : fmtValor(l.valor_unitario)}</td>
                        <td>{l.is_permuta ? <span style={{ color: '#3c3489', fontWeight: 600 }}>Permuta</span> : fmtValor(l.valor_total)}</td>
                        <td className="td-muted">{fmtData(l.data_lancamento)}</td>
                        <td>
                          <span className={`chip ${l.status_pagamento === 'pago' ? 'chip-pago' : l.status_pagamento === 'permuta' ? 'chip-permuta' : 'chip-aberto'}`}>
                            {l.status_pagamento === 'pago' ? 'Pago' : l.status_pagamento === 'permuta' ? 'Permuta' : 'Em aberto'}
                          </span>
                        </td>
                        <td>
                          <button className="ic-btn" onClick={() => remover(l.id)} title="Excluir">
                            <i className="ti ti-trash" />
                          </button>
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

      {/* MODAL NOVO LANÇAMENTO */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title"><i className="ti ti-plus" /> Novo lançamento</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error"><i className="ti ti-alert-circle" /> {erro}</div>}
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Nº Requisição *</label>
                  <input className="form-input" placeholder="Ex: REQ-0047" value={form.requisicao} onChange={e => setForm(f => ({ ...f, requisicao: e.target.value }))} />
                </div>

                <div className="form-full">
                  <label className="form-label">Obra <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
                  <select className="form-input form-select" value={form.obra_id} onChange={e => setForm(f => ({ ...f, obra_id: e.target.value }))}>
                    <option value="">Sem obra vinculada</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.codigo ? `[${o.codigo}] ` : ''}{o.nome}</option>)}
                  </select>
                </div>

                <div className="form-full">
                  <label className="form-label">Agregado *</label>
                  <select className="form-input form-select" value={form.agregado_id} onChange={e => {
                    const id = e.target.value
                    setAgregadoSelecionado(id)
                    setForm(f => ({ ...f, agregado_id: id, equipamento_id: '' }))
                  }}>
                    <option value="">Selecione...</option>
                    {agregados.filter(a => a.status === 'ativo').map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>

                <div className="form-full">
                  <label className="form-label">Equipamento *</label>
                  <select className="form-input form-select" value={form.equipamento_id} disabled={!form.agregado_id} onChange={e => setForm(f => ({ ...f, equipamento_id: e.target.value }))}>
                    <option value="">Selecione o agregado primeiro</option>
                    {equipamentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>

                {modo && (
                  <div className="form-full">
                    <label className="form-label">Modo de lançamento</label>
                    <div style={{ marginTop: 4 }}>
                      <span className={`mode-pill ${modo === 'hora_maquina' ? 'hora' : 'm3'}`}>
                        <i className={`ti ${modo === 'hora_maquina' ? 'ti-clock' : 'ti-package'}`} />
                        {modo === 'hora_maquina' ? 'Hora máquina' : 'Carga m³'}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label">{modo === 'hora_maquina' ? 'Horas trabalhadas' : modo === 'carga_m3' ? 'Volume (m³)' : 'Quantidade'} *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input className="form-input" placeholder="0,0" value={form.quantidade} disabled={!modo} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} style={{ flex: 1 }} />
                    <span style={{ fontSize: 14, color: '#8a93a5', minWidth: 24 }}>{modo === 'hora_maquina' ? 'h' : modo === 'carga_m3' ? 'm³' : ''}</span>
                  </div>
                </div>

                <div>
                  <label className="form-label">Valor unitário (R$) *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input className="form-input" placeholder="0,00" value={form.valor_unitario} disabled={!modo || form.is_permuta} onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} style={{ flex: 1 }} />
                    <span style={{ fontSize: 13, color: '#8a93a5' }}>{modo === 'hora_maquina' ? 'R$/h' : 'R$/m³'}</span>
                  </div>
                </div>

                <div>
                  <label className="form-label">Data *</label>
                  <input type="date" className="form-input" value={form.data_lancamento} onChange={e => setForm(f => ({ ...f, data_lancamento: e.target.value }))} />
                </div>

                <div>
                  <label className="form-label">Status inicial</label>
                  <select className="form-input form-select" value={form.status_pagamento} disabled={form.is_permuta} onChange={e => setForm(f => ({ ...f, status_pagamento: e.target.value }))}>
                    <option value="em_aberto">Em aberto</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>

                <div className="form-full">
                  <div className={`total-box ${total !== null ? 'ready' : ''}`}>
                    <div className="total-line"><span>Quantidade</span><span>{qty > 0 ? `${qty} ${modo === 'hora_maquina' ? 'h' : 'm³'}` : '—'}</span></div>
                    <div className="total-line"><span>Valor unitário</span><span>{vu > 0 ? `R$ ${vu.toFixed(2).replace('.', ',')}/${modo === 'hora_maquina' ? 'h' : 'm³'}` : '—'}</span></div>
                    <div className="total-line main">
                      <span>Total do lançamento</span>
                      <span>{form.is_permuta ? 'Permuta' : total !== null ? `R$ ${total.toFixed(2).replace('.', ',')}` : 'Preencha os campos'}</span>
                    </div>
                  </div>
                  {total !== null && <div className="hint ok"><i className="ti ti-circle-check" /> Tudo certo — confira o total antes de salvar</div>}
                </div>

                <div className="form-full">
                  <div className="checkbox-row">
                    <input type="checkbox" id="is_permuta" checked={form.is_permuta} onChange={e => setForm(f => ({ ...f, is_permuta: e.target.checked, valor_unitario: '' }))} />
                    <label htmlFor="is_permuta">Pagamento por permuta</label>
                  </div>
                </div>

                {form.is_permuta && (
                  <div className="form-full">
                    <label className="form-label">Descrição da permuta <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
                    <input className="form-input" placeholder="Ex: 50 sacos de cimento, combustível..." value={form.descricao_permuta} onChange={e => setForm(f => ({ ...f, descricao_permuta: e.target.value }))} />
                  </div>
                )}

                <div className="form-full">
                  <label className="form-label">Observações <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
                  <input className="form-input" placeholder="Anotações adicionais..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando || (total === null && !form.is_permuta)}>
                <i className="ti ti-check" /> {salvando ? 'Salvando...' : 'Salvar lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
