import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { exportarPDF, exportarExcel, exportarPagamentos, exportarHorasVolume, exportarAbastecimentos, exportarComparativo, exportarPorRequisicao } from '../../lib/exportar'

const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
const hoje = new Date().toISOString().split('T')[0]

export default function Relatorios() {
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [filtros, setFiltros] = useState({ dataInicio: primeiroDiaMes, dataFim: hoje })
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)

  const abas = ['Pagamentos', 'Horas e volume', 'Abastecimentos', 'Comparativo mensal', 'Por requisição']

  const gerar = useCallback(async () => {
    setLoading(true)
    const { dataInicio, dataFim } = filtros

    const [
      { data: lancamentos },
      { data: abastecimentos },
      { data: fechamentos }
    ] = await Promise.all([
      supabase.from('lancamentos').select('*, agregados(nome), equipamentos(nome, tipo)').gte('data_lancamento', dataInicio).lte('data_lancamento', dataFim),
      supabase.from('abastecimentos').select('*, agregados(nome), equipamentos(nome)').gte('data_abastecimento', dataInicio).lte('data_abastecimento', dataFim),
      supabase.from('fechamentos').select('*, agregados(nome)').gte('data_inicio', dataInicio).lte('data_fim', dataFim)
    ])

    // ── PAGAMENTOS ──
    const porAgregado = {}
    for (const l of lancamentos || []) {
      const id = l.agregado_id
      if (!porAgregado[id]) porAgregado[id] = { nome: l.agregados?.nome, bruto: 0, lancamentos: 0, horas: 0, m3: 0, desconto: 0, status: 'em_aberto', isPermuta: false }
      porAgregado[id].lancamentos++
      if (l.is_permuta) porAgregado[id].isPermuta = true
      else { porAgregado[id].bruto += Number(l.valor_total || 0) }
      if (l.tipo === 'hora_maquina') porAgregado[id].horas += Number(l.quantidade)
      if (l.tipo === 'carga_m3') porAgregado[id].m3 += Number(l.quantidade)
    }
    for (const a of abastecimentos || []) {
      if (a.descontar_fechamento && porAgregado[a.agregado_id]) {
        porAgregado[a.agregado_id].desconto += Number(a.valor_total || 0)
      }
    }
    for (const f of fechamentos || []) {
      if (porAgregado[f.agregado_id]) porAgregado[f.agregado_id].status = 'pago'
    }
    const pagamentos = Object.values(porAgregado).map(p => ({
      ...p,
      liquido: Math.max(0, p.bruto - p.desconto)
    }))

    // ── HORAS E VOLUME ──
    const porEquip = {}
    for (const l of lancamentos || []) {
      const id = l.equipamento_id
      if (!porEquip[id]) porEquip[id] = { nome: l.equipamentos?.nome, agregado: l.agregados?.nome, tipo: l.equipamentos?.tipo, modo: l.tipo, qtd: 0, lancamentos: 0, valor: 0, isPermuta: false }
      porEquip[id].lancamentos++
      porEquip[id].qtd += Number(l.quantidade)
      if (l.is_permuta) porEquip[id].isPermuta = true
      else porEquip[id].valor += Number(l.valor_total || 0)
    }

    // ── COMPARATIVO MENSAL (últimos 6 meses) ──
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const ano = d.getFullYear()
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      meses.push({ ano, mes, label: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }), inicio: `${ano}-${mes}-01`, fim: new Date(ano, d.getMonth() + 1, 0).toISOString().split('T')[0] })
    }
    const comparativo = await Promise.all(meses.map(async m => {
      const [{ data: l }, { data: a }] = await Promise.all([
        supabase.from('lancamentos').select('tipo, quantidade, valor_total, is_permuta').gte('data_lancamento', m.inicio).lte('data_lancamento', m.fim),
        supabase.from('abastecimentos').select('valor_total').eq('descontar_fechamento', true).gte('data_abastecimento', m.inicio).lte('data_abastecimento', m.fim)
      ])
      const bruto = (l || []).filter(x => !x.is_permuta).reduce((s, x) => s + Number(x.valor_total || 0), 0)
      const desconto = (a || []).reduce((s, x) => s + Number(x.valor_total || 0), 0)
      const horas = (l || []).filter(x => x.tipo === 'hora_maquina').reduce((s, x) => s + Number(x.quantidade), 0)
      const m3 = (l || []).filter(x => x.tipo === 'carga_m3').reduce((s, x) => s + Number(x.quantidade), 0)
      return { label: m.label, lancamentos: (l || []).length, horas, m3, bruto, desconto, liquido: Math.max(0, bruto - desconto) }
    }))

    // ── POR REQUISIÇÃO ──
    const porReq = {}
    for (const l of lancamentos || []) {
      const r = l.requisicao
      if (!porReq[r]) porReq[r] = { requisicao: r, itens: [] }
      porReq[r].itens.push(l)
    }

    setDados({ pagamentos, equipamentos: Object.values(porEquip), abastecimentos: abastecimentos || [], comparativo, requisicoes: Object.values(porReq), lancamentos: lancamentos || [] })
    setLoading(false)
  }, [filtros])

  useEffect(() => { gerar() }, [gerar])

  const periodo = `${filtros.dataInicio}_a_${filtros.dataFim}`

  const handleExportarExcel = () => {
    if (!dados) { alert('Gere o relatório primeiro.'); return }
    let resultado
    switch (abaAtiva) {
      case 0: resultado = exportarPagamentos(dados.pagamentos, periodo); break
      case 1: resultado = exportarHorasVolume(dados.equipamentos, periodo); break
      case 2: resultado = exportarAbastecimentos(dados.abastecimentos, periodo); break
      case 3: resultado = exportarComparativo(dados.comparativo); break
      case 4: resultado = exportarPorRequisicao(dados.requisicoes); break
      default: return
    }
    exportarExcel(resultado.dadosExcel, resultado.nomeArquivo)
  }

  const handleExportarPDF = () => {
    if (!dados) { alert('Gere o relatório primeiro.'); return }
    const nomesAbas = ['Pagamentos por Agregado', 'Horas e Volume', 'Abastecimentos', 'Comparativo Mensal', 'Lançamentos por Requisição']
    const subtitulo = `Período: ${new Date(filtros.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(filtros.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}`
    let resultado, linhas
    switch (abaAtiva) {
      case 0: resultado = exportarPagamentos(dados.pagamentos, periodo); linhas = dados.pagamentos; break
      case 1: resultado = exportarHorasVolume(dados.equipamentos, periodo); linhas = dados.equipamentos; break
      case 2: resultado = exportarAbastecimentos(dados.abastecimentos, periodo); linhas = dados.abastecimentos; break
      case 3: resultado = exportarComparativo(dados.comparativo); linhas = dados.comparativo; break
      case 4: resultado = exportarPorRequisicao(dados.requisicoes); linhas = dados.lancamentos; break
      default: return
    }
    exportarPDF(nomesAbas[abaAtiva], resultado.colunas, linhas, subtitulo)
  }

  const fmtValor = (v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtNum = (v, dec = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

  const totalBruto = dados?.pagamentos?.filter(p => !p.isPermuta).reduce((s, p) => s + p.bruto, 0) || 0
  const totalDesc = dados?.pagamentos?.reduce((s, p) => s + p.desconto, 0) || 0
  const totalLiq = Math.max(0, totalBruto - totalDesc)
  const totalAberto = dados?.pagamentos?.filter(p => p.status !== 'pago' && !p.isPermuta).reduce((s, p) => s + p.liquido, 0) || 0
  const totalHoras = dados?.lancamentos?.filter(l => l.tipo === 'hora_maquina').reduce((s, l) => s + Number(l.quantidade), 0) || 0
  const totalM3 = dados?.lancamentos?.filter(l => l.tipo === 'carga_m3').reduce((s, l) => s + Number(l.quantidade), 0) || 0

  const maxBar = dados?.pagamentos?.length > 0 ? Math.max(...dados.pagamentos.map(p => p.liquido)) : 1

  return (
    <div className="page" style={{ overflow: 'hidden' }}>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Relatórios</div>
            <div className="page-subtitle">Dashboards e exportações</div>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={handleExportarPDF}><i className="ti ti-file-type-pdf" /> PDF</button>
            <button className="btn btn-secondary" onClick={handleExportarExcel}><i className="ti ti-file-spreadsheet" /> Excel</button>
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div className="rel-tabs">
        {abas.map((a, i) => (
          <button key={i} className={`rel-tab ${abaAtiva === i ? 'on' : ''}`} onClick={() => setAbaAtiva(i)}>{a}</button>
        ))}
      </div>

      {/* FILTROS GLOBAIS */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e5ec', padding: '10px 32px', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <input type="date" className="form-input" style={{ width: 'auto' }} value={filtros.dataInicio} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} />
        <span style={{ color: '#8a93a5', fontSize: 14 }}>até</span>
        <input type="date" className="form-input" style={{ width: 'auto' }} value={filtros.dataFim} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} />
        <button className="btn btn-primary btn-sm" onClick={gerar}><i className="ti ti-refresh" /> Gerar</button>
      </div>

      {/* CONTEÚDO */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /><span>Gerando relatório...</span></div>
        ) : !dados ? null : (

          <>
            {/* ABA 0 — PAGAMENTOS */}
            {abaAtiva === 0 && (
              <>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-label">Total bruto</div><div className="stat-value">{fmtValor(totalBruto)}</div></div>
                  <div className="stat-card warn"><div className="stat-label">Desc. combustível</div><div className="stat-value" style={{ color: '#c0392b' }}>- {fmtValor(totalDesc)}</div></div>
                  <div className="stat-card success"><div className="stat-label">Total líquido pago</div><div className="stat-value" style={{ color: '#2d7a1a' }}>{fmtValor(totalLiq)}</div></div>
                  <div className="stat-card"><div className="stat-label">Em aberto</div><div className="stat-value" style={{ color: '#854f0b' }}>{fmtValor(totalAberto)}</div></div>
                </div>
                <div className="row-2">
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1f2e', marginBottom: 16 }}>Valor por agregado</div>
                    {dados.pagamentos.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontSize: 13, color: '#4a5568', width: 110, textAlign: 'right', flexShrink: 0 }}>{p.nome}</span>
                        <div style={{ flex: 1, height: 22, background: '#eef0f4', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4,
                            background: p.isPermuta ? '#7c71d8' : p.status === 'pago' ? '#1B5FAD' : '#e8a048',
                            width: `${(p.liquido / maxBar) * 100}%`,
                            display: 'flex', alignItems: 'center', paddingLeft: 8,
                            fontSize: 11, color: '#fff', fontWeight: 600
                          }}>
                            {p.isPermuta ? 'Permuta' : fmtValor(p.liquido)}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: p.status === 'pago' ? '#2d7a1a' : p.isPermuta ? '#3c3489' : '#854f0b', width: 60, fontWeight: 600 }}>
                          {p.status === 'pago' ? 'pago' : p.isPermuta ? 'permuta' : 'aberto'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <table className="data-table">
                      <thead><tr><th>Agregado</th><th>Bruto</th><th>Desc.</th><th>Líquido</th><th>Status</th></tr></thead>
                      <tbody>
                        {dados.pagamentos.map((p, i) => (
                          <tr key={i}>
                            <td className="td-primary">{p.nome}</td>
                            <td>{p.isPermuta ? '—' : fmtValor(p.bruto)}</td>
                            <td className="td-danger">{p.desconto > 0 ? `- ${fmtValor(p.desconto)}` : '—'}</td>
                            <td className="td-success">{p.isPermuta ? '—' : fmtValor(p.liquido)}</td>
                            <td><span className={`chip ${p.status === 'pago' ? 'chip-pago' : p.isPermuta ? 'chip-permuta' : 'chip-aberto'}`}>{p.status === 'pago' ? 'Pago' : p.isPermuta ? 'Permuta' : 'Aberto'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr><td>Total</td><td>{fmtValor(totalBruto)}</td><td className="td-danger">- {fmtValor(totalDesc)}</td><td className="td-success">{fmtValor(totalLiq)}</td><td></td></tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ABA 1 — HORAS E VOLUME */}
            {abaAtiva === 1 && (
              <>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-label">Total horas máquina</div><div className="stat-value">{fmtNum(totalHoras)} h</div></div>
                  <div className="stat-card"><div className="stat-label">Total volume</div><div className="stat-value">{fmtNum(totalM3)} m³</div></div>
                  <div className="stat-card">
                    <div className="stat-label">Equip. mais usado</div>
                    <div className="stat-value" style={{ fontSize: 16 }}>{dados.equipamentos.sort((a, b) => b.qtd - a.qtd)[0]?.nome || '—'}</div>
                  </div>
                  <div className="stat-card"><div className="stat-label">Total lançamentos</div><div className="stat-value">{dados.lancamentos.length}</div></div>
                </div>
                <div className="card">
                  <table className="data-table">
                    <thead><tr><th>Equipamento</th><th>Agregado</th><th>Tipo</th><th>Qtd total</th><th>Lançamentos</th><th>Valor total</th></tr></thead>
                    <tbody>
                      {dados.equipamentos.map((e, i) => (
                        <tr key={i}>
                          <td className="td-primary">{e.nome}</td>
                          <td>{e.agregado}</td>
                          <td><span className={`chip ${e.modo === 'hora_maquina' ? 'chip-hora' : 'chip-m3'}`}>{e.modo === 'hora_maquina' ? 'Hora máq.' : 'Carga m³'}</span></td>
                          <td>{e.modo === 'hora_maquina' ? `${fmtNum(e.qtd)} h` : `${fmtNum(e.qtd)} m³`}</td>
                          <td>{e.lancamentos}</td>
                          <td>{e.isPermuta ? <span style={{ color: '#3c3489' }}>permuta</span> : fmtValor(e.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><td colSpan={3}>Total</td><td>{fmtNum(totalHoras)} h · {fmtNum(totalM3)} m³</td><td>{dados.lancamentos.length}</td><td></td></tr></tfoot>
                  </table>
                </div>
              </>
            )}

            {/* ABA 2 — ABASTECIMENTOS */}
            {abaAtiva === 2 && (
              <>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-label">Total abastecido</div><div className="stat-value">{fmtNum(dados.abastecimentos.reduce((s, a) => s + Number(a.litros), 0), 0)} L</div></div>
                  <div className="stat-card"><div className="stat-label">Valor total</div><div className="stat-value">{fmtValor(dados.abastecimentos.reduce((s, a) => s + Number(a.valor_total), 0))}</div></div>
                  <div className="stat-card warn"><div className="stat-label">Total descontado</div><div className="stat-value" style={{ color: '#c0392b' }}>{fmtValor(dados.abastecimentos.filter(a => a.descontar_fechamento).reduce((s, a) => s + Number(a.valor_total), 0))}</div></div>
                  <div className="stat-card"><div className="stat-label">Só informativo</div><div className="stat-value">{fmtValor(dados.abastecimentos.filter(a => !a.descontar_fechamento).reduce((s, a) => s + Number(a.valor_total), 0))}</div></div>
                </div>
                <div className="card">
                  <table className="data-table">
                    <thead><tr><th>Agregado</th><th>Equipamento</th><th>Litros</th><th>Valor</th><th>NF-e</th><th>Data</th><th>Tipo</th></tr></thead>
                    <tbody>
                      {dados.abastecimentos.map((a, i) => (
                        <tr key={i}>
                          <td className="td-primary">{a.agregados?.nome}</td>
                          <td>{a.equipamentos?.nome}</td>
                          <td>{fmtNum(a.litros, 0)} L</td>
                          <td>{fmtValor(a.valor_total)}</td>
                          <td>{a.nfe ? <span className="tag">{a.nfe}</span> : <span className="td-muted">—</span>}</td>
                          <td className="td-muted">{new Date(a.data_abastecimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                          <td><span className={`chip ${a.descontar_fechamento ? 'chip-desconta' : 'chip-informativo'}`}>{a.descontar_fechamento ? 'Desconta' : 'Informativo'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ABA 3 — COMPARATIVO MENSAL */}
            {abaAtiva === 3 && (
              <div className="card">
                <table className="data-table">
                  <thead><tr><th>Mês</th><th>Lançamentos</th><th>Horas</th><th>Volume m³</th><th>Valor bruto</th><th>Desc. comb.</th><th>Valor líquido</th></tr></thead>
                  <tbody>
                    {dados.comparativo.map((m, i) => (
                      <tr key={i}>
                        <td className="td-primary" style={{ textTransform: 'capitalize' }}>{m.label}</td>
                        <td>{m.lancamentos}</td>
                        <td>{fmtNum(m.horas)} h</td>
                        <td>{fmtNum(m.m3)} m³</td>
                        <td>{fmtValor(m.bruto)}</td>
                        <td className="td-danger">{m.desconto > 0 ? `- ${fmtValor(m.desconto)}` : '—'}</td>
                        <td className="td-success">{fmtValor(m.liquido)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total 6 meses</td>
                      <td>{dados.comparativo.reduce((s, m) => s + m.lancamentos, 0)}</td>
                      <td>{fmtNum(dados.comparativo.reduce((s, m) => s + m.horas, 0))} h</td>
                      <td>{fmtNum(dados.comparativo.reduce((s, m) => s + m.m3, 0))} m³</td>
                      <td>{fmtValor(dados.comparativo.reduce((s, m) => s + m.bruto, 0))}</td>
                      <td className="td-danger">- {fmtValor(dados.comparativo.reduce((s, m) => s + m.desconto, 0))}</td>
                      <td className="td-success">{fmtValor(dados.comparativo.reduce((s, m) => s + m.liquido, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ABA 4 — POR REQUISIÇÃO */}
            {abaAtiva === 4 && (
              <div className="card">
                <table className="data-table">
                  <thead><tr><th>Requisição</th><th>Agregado</th><th>Equipamento</th><th>Tipo</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr></thead>
                  <tbody>
                    {dados.requisicoes.flatMap(r =>
                      r.itens.map((l, i) => (
                        <tr key={`${r.requisicao}-${i}`}>
                          <td><span className="tag">{r.requisicao}</span></td>
                          <td className="td-primary">{l.agregados?.nome}</td>
                          <td>{l.equipamentos?.nome}</td>
                          <td><span className={`chip ${l.tipo === 'hora_maquina' ? 'chip-hora' : 'chip-m3'}`}>{l.tipo === 'hora_maquina' ? 'Hora máq.' : 'Carga m³'}</span></td>
                          <td>{l.tipo === 'hora_maquina' ? `${l.quantidade} h` : `${l.quantidade} m³`}</td>
                          <td>{l.is_permuta ? '—' : l.valor_unitario ? `R$ ${Number(l.valor_unitario).toFixed(2).replace('.', ',')}/${l.tipo === 'hora_maquina' ? 'h' : 'm³'}` : '—'}</td>
                          <td>{l.is_permuta ? <span style={{ color: '#3c3489', fontWeight: 600 }}>Permuta</span> : l.valor_total ? fmtValor(l.valor_total) : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6}>Total</td>
                      <td className="td-success">{fmtValor(dados.lancamentos.filter(l => !l.is_permuta).reduce((s, l) => s + Number(l.valor_total || 0), 0))} + permutas</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
