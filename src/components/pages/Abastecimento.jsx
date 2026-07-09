import { useState } from 'react'
import { useAbastecimentos } from '../../hooks/useAbastecimentos'
import { useAgregados, useEquipamentos } from '../../hooks/useAgregados'

const hoje = new Date().toISOString().split('T')[0]
const initForm = {
  agregado_id: '', equipamento_id: '', tipo_combustivel: 'diesel_s10',
  litros: '', preco_por_litro: '', posto: '', nfe: '',
  descontar_fechamento: true, data_abastecimento: hoje, observacoes: ''
}

const COMBUSTIVEIS = {
  diesel_s10: 'Diesel S10', diesel_s500: 'Diesel S500',
  gasolina: 'Gasolina', etanol: 'Etanol', arla32: 'Arla 32'
}

export default function Abastecimento() {
  const [filtros, setFiltros] = useState({})
  const { abastecimentos, loading, criar, remover } = useAbastecimentos(filtros)
  const { agregados } = useAgregados()
  const [agregadoSel, setAgregadoSel] = useState('')
  const { equipamentos } = useEquipamentos(agregadoSel || null)

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(initForm)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  const litros = parseFloat(String(form.litros).replace(',', '.'))
  const preco = parseFloat(String(form.preco_por_litro).replace(',', '.'))
  const valorTotal = !isNaN(litros) && !isNaN(preco) && litros > 0 && preco > 0 ? litros * preco : null

  const abrirModal = () => {
    setForm(initForm)
    setAgregadoSel('')
    setErro('')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.agregado_id) { setErro('Selecione o agregado.'); return }
    if (!form.equipamento_id) { setErro('Selecione o equipamento.'); return }
    if (!litros || litros <= 0) { setErro('Informe os litros abastecidos.'); return }
    if (!preco || preco <= 0) { setErro('Informe o preço por litro.'); return }
    setSalvando(true)
    const { error } = await criar({ ...form, litros, preco_por_litro: preco })
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setModal(false)
  }

  const filtrados = abastecimentos.filter(a => {
    const b = busca.toLowerCase()
    return (a.agregados?.nome || '').toLowerCase().includes(b) || (a.nfe || '').toLowerCase().includes(b)
  })

  // Métricas
  const totalLitros = abastecimentos.reduce((s, a) => s + Number(a.litros), 0)
  const totalValor = abastecimentos.reduce((s, a) => s + Number(a.valor_total), 0)
  const totalDesconta = abastecimentos.filter(a => a.descontar_fechamento).reduce((s, a) => s + Number(a.valor_total), 0)
  const totalInfo = abastecimentos.filter(a => !a.descontar_fechamento).reduce((s, a) => s + Number(a.valor_total), 0)

  const fmtValor = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
  const fmtData = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Abastecimento</div>
            <div className="page-subtitle">Controle de combustível por agregado</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary"><i className="ti ti-download" /> Exportar</button>
            <button className="btn btn-primary" onClick={abrirModal}><i className="ti ti-plus" /> Registrar abastecimento</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="page-body-inner">
          {/* STATS */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total abastecido</div>
              <div className="stat-value">{totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} L</div>
              <div className="stat-sub">{abastecimentos.length} registros</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Valor total</div>
              <div className="stat-value">{fmtValor(totalValor)}</div>
            </div>
            <div className="stat-card warn">
              <div className="stat-label">A descontar no fechamento</div>
              <div className="stat-value" style={{ color: '#c0392b' }}>{fmtValor(totalDesconta)}</div>
              <div className="stat-sub">{abastecimentos.filter(a => a.descontar_fechamento).length} registros</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Só informativo</div>
              <div className="stat-value">{fmtValor(totalInfo)}</div>
              <div className="stat-sub">{abastecimentos.filter(a => !a.descontar_fechamento).length} registros</div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="filters-bar">
            <input className="form-input" style={{ width: 210 }} placeholder="🔍 Buscar agregado ou NF-e..." value={busca} onChange={e => setBusca(e.target.value)} />
            <select className="form-input form-select" style={{ width: 'auto' }} onChange={e => setFiltros(f => ({ ...f, tipo_combustivel: e.target.value || undefined }))}>
              <option value="">Todos os tipos</option>
              {Object.entries(COMBUSTIVEIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" className="form-input" style={{ width: 'auto' }} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} />
            <span style={{ color: '#8a93a5', fontSize: 14 }}>até</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} />
            <select className="form-input form-select" style={{ width: 'auto' }} onChange={e => {
              const v = e.target.value
              setFiltros(f => ({ ...f, descontar: v === '' ? undefined : v === 'true' }))
            }}>
              <option value="">Todos</option>
              <option value="true">Desconta</option>
              <option value="false">Informativo</option>
            </select>
          </div>

          {/* TABELA */}
          <div className="card">
            {loading ? (
              <div className="loading-spinner" style={{ padding: 40 }}><div className="spinner" /></div>
            ) : filtrados.length === 0 ? (
              <div className="empty-state">
                <i className="ti ti-gas-station" />
                <p>Nenhum abastecimento encontrado</p>
                <span>Registre o primeiro abastecimento</span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Agregado</th>
                      <th>Equipamento</th>
                      <th>Combustível</th>
                      <th>Litros</th>
                      <th>Valor</th>
                      <th>Posto</th>
                      <th>NF-e</th>
                      <th>Data</th>
                      <th>Desconto</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(a => (
                      <tr key={a.id}>
                        <td className="td-primary">{a.agregados?.nome}</td>
                        <td className="td-muted">{a.equipamentos?.nome}</td>
                        <td><span className="chip chip-diesel">{COMBUSTIVEIS[a.tipo_combustivel] || a.tipo_combustivel}</span></td>
                        <td>{Number(a.litros).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} L</td>
                        <td>{fmtValor(a.valor_total)}</td>
                        <td className="td-muted">{a.posto || '—'}</td>
                        <td>{a.nfe ? <span className="tag">{a.nfe}</span> : <span className="td-muted">—</span>}</td>
                        <td className="td-muted">{fmtData(a.data_abastecimento)}</td>
                        <td>
                          <span className={`chip ${a.descontar_fechamento ? 'chip-desconta' : 'chip-informativo'}`}>
                            {a.descontar_fechamento ? 'Desconta' : 'Informativo'}
                          </span>
                        </td>
                        <td><button className="ic-btn" onClick={() => remover(a.id)}><i className="ti ti-trash" /></button></td>
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
              <span className="modal-title"><i className="ti ti-gas-station" /> Registrar abastecimento</span>
              <button className="modal-close" onClick={() => setModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {erro && <div className="alert alert-error"><i className="ti ti-alert-circle" /> {erro}</div>}
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Agregado *</label>
                  <select className="form-input form-select" value={form.agregado_id} onChange={e => {
                    const id = e.target.value
                    setAgregadoSel(id)
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
                <div>
                  <label className="form-label">Tipo de combustível</label>
                  <select className="form-input form-select" value={form.tipo_combustivel} onChange={e => setForm(f => ({ ...f, tipo_combustivel: e.target.value }))}>
                    {Object.entries(COMBUSTIVEIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Data *</label>
                  <input type="date" className="form-input" value={form.data_abastecimento} onChange={e => setForm(f => ({ ...f, data_abastecimento: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Litros abastecidos *</label>
                  <input className="form-input" placeholder="0,0" value={form.litros} onChange={e => setForm(f => ({ ...f, litros: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Preço por litro (R$) *</label>
                  <input className="form-input" placeholder="0,000" value={form.preco_por_litro} onChange={e => setForm(f => ({ ...f, preco_por_litro: e.target.value }))} />
                </div>
                <div className="form-full">
                  <div style={{ background: '#f5f6f8', border: '1.5px solid #dde1e8', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#6b7280' }}>Valor total calculado</span>
                    <strong style={{ color: valorTotal ? '#1B5FAD' : '#1a1f2e', fontSize: 16 }}>
                      {valorTotal ? `R$ ${valorTotal.toFixed(2).replace('.', ',')}` : '—'}
                    </strong>
                  </div>
                </div>
                <div>
                  <label className="form-label">Posto / Fornecedor</label>
                  <input className="form-input" placeholder="Ex: Posto Ipiranga" value={form.posto} onChange={e => setForm(f => ({ ...f, posto: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Número da NF-e</label>
                  <input className="form-input" placeholder="Ex: NF-000341" value={form.nfe} onChange={e => setForm(f => ({ ...f, nfe: e.target.value }))} />
                </div>
                <div className="form-full">
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <strong>Descontar no fechamento</strong>
                      <span>Se ativado, o valor será abatido do pagamento do agregado</span>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={form.descontar_fechamento} onChange={e => setForm(f => ({ ...f, descontar_fechamento: e.target.checked }))} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>
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
                <i className="ti ti-check" /> {salvando ? 'Salvando...' : 'Salvar abastecimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
