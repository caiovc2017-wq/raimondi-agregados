import { useState } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro'
import { useAbastecimentos } from '../../hooks/useAbastecimentos'
import { useLancamentos } from '../../hooks/useLancamentos'

const hoje = new Date().toISOString().split('T')[0]
const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

export default function Financeiro() {
  const [filtros, setFiltros] = useState({ dataInicio: primeiroDiaMes, dataFim: hoje })
  const { resumo, loading, fecharPagamento } = useFinanceiro(filtros)
  const { buscarDescontos } = useAbastecimentos()
  const { buscarAbertos } = useLancamentos()

  const [expandido, setExpandido] = useState(null)
  const [modalFechamento, setModalFechamento] = useState(null) // agregado selecionado
  const [dadosFechamento, setDadosFechamento] = useState(null)
  const [formFech, setFormFech] = useState({ dataPagamento: hoje, formaPagamento: 'pix', descricaoPermuta: '', observacoes: '' })
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')

  const toggle = (id) => setExpandido(e => e === id ? null : id)

  const abrirFechamento = async (item) => {
    // Busca lançamentos e abastecimentos em aberto
    const [{ data: lancs }, { data: abasts }] = await Promise.all([
      buscarAbertos(item.agregado_id, filtros.dataInicio, filtros.dataFim),
      buscarDescontos(item.agregado_id, filtros.dataInicio, filtros.dataFim)
    ])
    const valorBruto = (lancs || []).filter(l => !l.is_permuta).reduce((s, l) => s + Number(l.valor_total || 0), 0)
    const valorDesconto = (abasts || []).reduce((s, a) => s + Number(a.valor_total || 0), 0)
    const valorLiquido = Math.max(0, valorBruto - valorDesconto)
    setDadosFechamento({
      lancamentosIds: (lancs || []).map(l => l.id),
      abastecimentosIds: (abasts || []).map(a => a.id),
      valorBruto,
      valorDesconto,
      valorLiquido,
      count: (lancs || []).length
    })
    setFormFech({ dataPagamento: hoje, formaPagamento: item.isPermuta ? 'permuta' : 'pix', descricaoPermuta: '', observacoes: '' })
    setModalFechamento(item)
  }

  const confirmarFechamento = async () => {
    if (!dadosFechamento || !modalFechamento) return
    setSalvando(true)
    const { error } = await fecharPagamento({
      agregadoId: modalFechamento.agregado_id,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      dataPagamento: formFech.dataPagamento,
      formaPagamento: formFech.formaPagamento,
      descricaoPermuta: formFech.descricaoPermuta,
      observacoes: formFech.observacoes,
      ...dadosFechamento
    })
    setSalvando(false)
    if (!error) setModalFechamento(null)
  }

  const fmtValor = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const filtrados = resumo.filter(r => r.nome?.toLowerCase().includes(busca.toLowerCase()))

  const totalAberto = resumo.filter(r => !r.isPermuta).reduce((s, r) => s + r.valor_total, 0)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Financeiro</div>
            <div className="page-subtitle">Fechamentos e pagamentos</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary"><i className="ti ti-download" /> Exportar</button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="page-body-inner">
          {/* FILTROS */}
          <div className="filters-bar">
            <input className="form-input" style={{ width: 210 }} placeholder="🔍 Buscar agregado..." value={busca} onChange={e => setBusca(e.target.value)} />
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filtros.dataInicio} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} />
            <span style={{ color: '#8a93a5', fontSize: 14 }}>até</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filtros.dataFim} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} />
            <select className="form-input form-select" style={{ width: 'auto' }}>
              <option value="">Todos os status</option>
              <option value="em_aberto">Em aberto</option>
              <option value="pago">Pago</option>
              <option value="permuta">Permuta</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 14, color: '#8a93a5' }}>
              {filtrados.length} agregados ·{' '}
              <strong style={{ color: '#854f0b' }}>{fmtValor(totalAberto)} em aberto</strong>
            </span>
          </div>

          {/* TABELA EXPANDÍVEL */}
          <div className="card">
            {/* CABEÇALHO */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1.6fr 80px 90px 90px 110px 100px 32px', gap: 12, padding: '10px 20px', fontSize: 11, color: '#8a93a5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', background: '#fafbfc', borderBottom: '1px solid #e2e5ec' }}>
              <span></span><span>Agregado</span><span>Lançam.</span><span>Total h</span><span>Total m³</span><span>Valor total</span><span>Status</span><span></span>
            </div>

            {loading ? (
              <div className="loading-spinner" style={{ padding: 40 }}><div className="spinner" /></div>
            ) : filtrados.length === 0 ? (
              <div className="empty-state">
                <i className="ti ti-currency-dollar" />
                <p>Nenhum lançamento em aberto</p>
                <span>Todos os agregados estão com pagamentos em dia</span>
              </div>
            ) : filtrados.map(item => (
              <div key={item.agregado_id} className="expand-row">
                {/* LINHA PRINCIPAL */}
                <button className="expand-trigger" onClick={() => toggle(item.agregado_id)}>
                  <i className="ti ti-chevron-right" style={{ fontSize: 15, color: '#8a93a5', transition: '.2s', transform: expandido === item.agregado_id ? 'rotate(90deg)' : 'none' }} />
                  <span style={{ fontWeight: 600, color: '#1a1f2e' }}>{item.nome}</span>
                  <span style={{ color: '#4a5568' }}>{item.count}</span>
                  <span style={{ color: '#4a5568' }}>{item.total_horas > 0 ? `${item.total_horas.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} h` : '—'}</span>
                  <span style={{ color: '#4a5568' }}>{item.total_m3 > 0 ? `${item.total_m3.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} m³` : '—'}</span>
                  <span style={{ fontWeight: 600, color: '#1a1f2e' }}>{item.is_permuta ? <span style={{ color: '#3c3489' }}>Permuta</span> : fmtValor(item.valor_total)}</span>
                  <span>
                    <span className={`chip ${item.is_permuta ? 'chip-permuta' : 'chip-aberto'}`}>
                      {item.is_permuta ? 'Permuta' : 'Em aberto'}
                    </span>
                  </span>
                  <span><i className="ti ti-dots-vertical" style={{ color: '#8a93a5', fontSize: 16 }} /></span>
                </button>

                {/* DETALHE EXPANDIDO */}
                <div className={`expand-detail ${expandido === item.agregado_id ? 'open' : ''}`}>
                  <div className="detail-row detail-head">
                    <span>Requisição</span><span>Equipamento</span><span>Tipo</span><span>Qtd</span><span>Valor</span>
                  </div>
                  {(item.lancamentos || []).map((l, i) => (
                    <div key={i} className="detail-row">
                      <span><span className="tag">{l.requisicao}</span></span>
                      <span>{l.equipamentos?.nome || '—'}</span>
                      <span><span className={`chip ${l.tipo === 'hora_maquina' ? 'chip-hora' : 'chip-m3'}`}>{l.tipo === 'hora_maquina' ? 'Hora máq.' : 'Carga m³'}</span></span>
                      <span>{l.tipo === 'hora_maquina' ? `${l.quantidade} h` : `${l.quantidade} m³`}</span>
                      <span>{l.is_permuta ? <span style={{ color: '#3c3489' }}>Permuta</span> : fmtValor(l.valor_total)}</span>
                    </div>
                  ))}
                  <div className="detail-total">
                    {item.is_permuta ? (
                      <span style={{ color: '#3c3489', fontWeight: 700, fontSize: 15 }}>Permuta</span>
                    ) : (
                      <>
                        <span style={{ color: '#8a93a5', fontSize: 14 }}>Em aberto:</span>
                        <span style={{ color: '#854f0b', fontWeight: 700, fontSize: 16 }}>{fmtValor(item.valor_total)}</span>
                        <button className="btn btn-primary btn-sm" onClick={() => abrirFechamento(item)}>
                          <i className="ti ti-check" /> Fechar pagamento
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL FECHAMENTO */}
      {modalFechamento && dadosFechamento && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalFechamento(null)}>
          <div className="modal" style={{ width: 460 }}>
            <div className="modal-header">
              <span className="modal-title"><i className="ti ti-check" /> Fechar pagamento</span>
              <button className="modal-close" onClick={() => setModalFechamento(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {/* RESUMO */}
              <div style={{ background: 'var(--rbl)', border: '1px solid #93b3d4', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#4a5568' }}>
                  <span>Agregado</span><span style={{ fontWeight: 600, color: '#1a1f2e' }}>{modalFechamento.nome}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#4a5568' }}>
                  <span>Lançamentos</span><span>{dadosFechamento.count}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#4a5568' }}>
                  <span>Valor bruto</span><span>{fmtValor(dadosFechamento.valorBruto)}</span>
                </div>
                {dadosFechamento.valorDesconto > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#b03030' }}>
                    <span>Desc. combustível</span><span>- {fmtValor(dadosFechamento.valorDesconto)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#0D3D7A', paddingTop: 8, borderTop: '1px solid #93b3d4', marginTop: 2 }}>
                  <span>Valor a pagar</span><span style={{ color: '#2d7a1a' }}>{fmtValor(dadosFechamento.valorLiquido)}</span>
                </div>
              </div>

              <div className="form-grid">
                <div>
                  <label className="form-label">Data do pagamento *</label>
                  <input type="date" className="form-input" value={formFech.dataPagamento} onChange={e => setFormFech(f => ({ ...f, dataPagamento: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Forma de pagamento</label>
                  <select className="form-input form-select" value={formFech.formaPagamento} onChange={e => setFormFech(f => ({ ...f, formaPagamento: e.target.value }))}>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="transferencia">Transferência</option>
                    <option value="permuta">Permuta</option>
                  </select>
                </div>
                {formFech.formaPagamento === 'permuta' && (
                  <div className="form-full">
                    <label className="form-label">Descrição da permuta <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
                    <input className="form-input" placeholder="Ex: 50 sacos de cimento..." value={formFech.descricaoPermuta} onChange={e => setFormFech(f => ({ ...f, descricaoPermuta: e.target.value }))} />
                  </div>
                )}
                <div className="form-full">
                  <label className="form-label">Observações <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
                  <input className="form-input" placeholder="Anotações sobre o pagamento..." value={formFech.observacoes} onChange={e => setFormFech(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalFechamento(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarFechamento} disabled={salvando}>
                <i className="ti ti-check" /> {salvando ? 'Confirmando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
