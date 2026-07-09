import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Dashboard({ onNavegar }) {
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  })
  const [dados, setDados] = useState({
    totalAgregados: 0,
    totalPermuta: 0,
    totalHoras: 0,
    totalM3: 0,
    totalAPagar: 0,
    totalEmAberto: 0,
    pagos: 0,
    permuta: 0,
    emAberto: 0,
    semLancamento: 0,
    ultimosLancamentos: [],
    statusPagamentos: []
  })
  const [loading, setLoading] = useState(true)
  const [modalLancamento, setModalLancamento] = useState(false)

  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    }
  })

  useEffect(() => {
    carregarDados()
  }, [mesSelecionado])

  const carregarDados = async () => {
    setLoading(true)
    const [ano, mes] = mesSelecionado.split('-')
    const dataInicio = `${ano}-${mes}-01`
    const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0]

    // Agrega em paralelo
    const [
      { data: agregados },
      { data: lancamentos },
      { data: ultimosLanc },
      { data: fechamentos }
    ] = await Promise.all([
      supabase.from('agregados').select('id, status').eq('status', 'ativo'),
      supabase.from('lancamentos').select('*').gte('data_lancamento', dataInicio).lte('data_lancamento', dataFim),
      supabase.from('lancamentos').select('*, agregados(nome), equipamentos(nome)').gte('data_lancamento', dataInicio).lte('data_lancamento', dataFim).order('criado_em', { ascending: false }).limit(5),
      supabase.from('fechamentos').select('*, agregados(id, nome)').gte('data_inicio', dataInicio).lte('data_fim', dataFim)
    ])

    // Calcula métricas
    const totalHoras = lancamentos?.filter(l => l.tipo === 'hora_maquina').reduce((s, l) => s + Number(l.quantidade), 0) || 0
    const totalM3 = lancamentos?.filter(l => l.tipo === 'carga_m3').reduce((s, l) => s + Number(l.quantidade), 0) || 0

    // Agregados únicos com lançamentos
    const agregadosComLanc = new Set(lancamentos?.map(l => l.agregado_id) || [])
    const totalAgregados = agregados?.length || 0
    const semLancamento = totalAgregados - agregadosComLanc.size

    // Status de pagamentos por agregado
    const statusMap = {}
    for (const l of lancamentos || []) {
      if (!statusMap[l.agregado_id]) statusMap[l.agregado_id] = 'em_aberto'
      if (l.is_permuta) statusMap[l.agregado_id] = 'permuta'
    }
    for (const f of fechamentos || []) {
      statusMap[f.agregado_id] = 'pago'
    }
    const pagos = Object.values(statusMap).filter(s => s === 'pago').length
    const permuta = Object.values(statusMap).filter(s => s === 'permuta').length
    const emAberto = Object.values(statusMap).filter(s => s === 'em_aberto').length

    // Valor a pagar (lançamentos sem fechamento)
    const totalAPagar = lancamentos?.filter(l => !l.fechamento_id && !l.is_permuta).reduce((s, l) => s + Number(l.valor_total || 0), 0) || 0

    // Status pagamentos (tabela lateral)
    const statusPagMap = {}
    for (const l of lancamentos || []) {
      if (!statusPagMap[l.agregado_id]) {
        statusPagMap[l.agregado_id] = { agregado_id: l.agregado_id, nome: '', valor: 0, forma: 'Dinheiro', status: 'em_aberto', isPermuta: false }
      }
      if (l.is_permuta) statusPagMap[l.agregado_id].isPermuta = true
      else statusPagMap[l.agregado_id].valor += Number(l.valor_total || 0)
    }
    for (const l of ultimosLanc || []) {
      if (statusPagMap[l.agregado_id]) statusPagMap[l.agregado_id].nome = l.agregados?.nome
    }
    for (const f of fechamentos || []) {
      if (statusPagMap[f.agregado_id]) {
        statusPagMap[f.agregado_id].status = 'pago'
        statusPagMap[f.agregado_id].forma = f.forma_pagamento
        statusPagMap[f.agregado_id].valor = f.valor_liquido
      }
    }

    setDados({
      totalAgregados,
      totalPermuta: permuta,
      totalHoras,
      totalM3,
      totalAPagar,
      pagos,
      permuta,
      emAberto,
      semLancamento,
      ultimosLancamentos: ultimosLanc || [],
      statusPagamentos: Object.values(statusPagMap).slice(0, 5)
    })
    setLoading(false)
  }

  const fmtValor = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
  const fmtNum = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const totalAgg = dados.pagos + dados.permuta + dados.emAberto + dados.semLancamento || 1

  return (
    <div className="page">
      {/* HEADER */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Dashboard</div>
            <div className="page-subtitle">Visão geral</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
            <i className="ti ti-calendar" style={{ fontSize: 16, color: '#8a93a5' }} />
            <select
              className="form-input form-select"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={mesSelecionado}
              onChange={e => setMesSelecionado(e.target.value)}
            >
              {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => onNavegar('lancamentos')}>
              <i className="ti ti-plus" /> Novo lançamento
            </button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="page-body">
        <div className="page-body-inner">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /><span>Carregando...</span></div>
          ) : (
            <>
              {/* STATS */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Agregados ativos</div>
                  <div className="stat-value">{dados.totalAgregados}</div>
                  <div className="stat-sub">{dados.totalPermuta} em permuta</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Horas máquina</div>
                  <div className="stat-value">{fmtNum(dados.totalHoras)} h</div>
                  <div className="stat-sub">No período selecionado</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Volume cargas</div>
                  <div className="stat-value">{fmtNum(dados.totalM3)} m³</div>
                  <div className="stat-sub">No período selecionado</div>
                </div>
                <div className="stat-card warn">
                  <div className="stat-label">A pagar no período</div>
                  <div className="stat-value" style={{ color: '#c0392b' }}>{fmtValor(dados.totalAPagar)}</div>
                  <div className="stat-sub">{dados.emAberto} em aberto</div>
                </div>
              </div>

              {/* BARRA DE PAGAMENTOS */}
              <div className="pbar-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1f2e' }}>
                    Situação de pagamentos — {meses.find(m => m.value === mesSelecionado)?.label}
                  </span>
                  <span className="card-link" onClick={() => onNavegar('financeiro')}>Ver financeiro →</span>
                </div>
                <div className="progress-bar">
                  <div className="pb-pago" style={{ width: `${(dados.pagos / totalAgg) * 100}%` }} />
                  <div className="pb-permuta" style={{ width: `${(dados.permuta / totalAgg) * 100}%` }} />
                  <div className="pb-aberto" style={{ width: `${(dados.emAberto / totalAgg) * 100}%` }} />
                </div>
                <div className="pbar-legend">
                  <span className="pbar-item"><span className="pbar-dot" style={{ background: '#1B5FAD' }} />Pagos — {dados.pagos}</span>
                  <span className="pbar-item"><span className="pbar-dot" style={{ background: '#7c71d8' }} />Permuta — {dados.permuta}</span>
                  <span className="pbar-item"><span className="pbar-dot" style={{ background: '#d94f4f' }} />Em aberto — {dados.emAberto}</span>
                  <span className="pbar-item" style={{ marginLeft: 'auto' }}>Sem lançamento — {dados.semLancamento}</span>
                </div>
              </div>

              {/* TABELAS */}
              <div className="row-2">
                {/* ÚLTIMOS LANÇAMENTOS */}
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Últimos lançamentos</span>
                    <span className="card-link" onClick={() => onNavegar('lancamentos')}>Ver todos →</span>
                  </div>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Agregado</th>
                          <th>Equipamento</th>
                          <th>Tipo</th>
                          <th>Qtd</th>
                          <th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.ultimosLancamentos.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: '#8a93a5', padding: 24 }}>Nenhum lançamento no período</td></tr>
                        ) : dados.ultimosLancamentos.map(l => (
                          <tr key={l.id}>
                            <td className="td-primary">{l.agregados?.nome}</td>
                            <td className="td-muted">{l.equipamentos?.nome}</td>
                            <td><span className={`chip ${l.tipo === 'hora_maquina' ? 'chip-hora' : 'chip-m3'}`}>{l.tipo === 'hora_maquina' ? 'Hora máq.' : 'Carga m³'}</span></td>
                            <td>{l.tipo === 'hora_maquina' ? `${l.quantidade} h` : `${l.quantidade} m³`}</td>
                            <td className="td-muted">{new Date(l.data_lancamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* STATUS PAGAMENTOS */}
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Status pagamentos</span>
                    <span className="card-link" onClick={() => onNavegar('financeiro')}>Ver todos →</span>
                  </div>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Agregado</th>
                          <th>Valor</th>
                          <th>Forma</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dados.statusPagamentos.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: 'center', color: '#8a93a5', padding: 24 }}>Nenhum dado no período</td></tr>
                        ) : dados.statusPagamentos.map(s => (
                          <tr key={s.agregado_id}>
                            <td className="td-primary">{s.nome}</td>
                            <td>{s.isPermuta ? <span className="td-muted">—</span> : fmtValor(s.valor)}</td>
                            <td className="td-muted">{s.isPermuta ? 'Permuta' : s.forma === 'pix' ? 'PIX' : s.forma === 'transferencia' ? 'Transf.' : 'Dinheiro'}</td>
                            <td>
                              <span className={`chip ${s.status === 'pago' ? 'chip-pago' : s.isPermuta ? 'chip-permuta' : 'chip-aberto'}`}>
                                {s.status === 'pago' ? 'Pago' : s.isPermuta ? 'Permuta' : 'Em aberto'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
