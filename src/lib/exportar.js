// ================================================================
// exportar.js — Funções de exportação PDF e Excel
// Usa apenas APIs nativas do browser, sem dependências externas
// ================================================================

// ── EXCEL (CSV compatível com Excel) ────────────────────────────
export function exportarExcel(dados, nomeArquivo = 'relatorio') {
  // Converte array de objetos para CSV
  if (!dados || dados.length === 0) {
    alert('Nenhum dado para exportar.')
    return
  }

  const cabecalho = Object.keys(dados[0])
  const linhas = dados.map(row =>
    cabecalho.map(col => {
      const val = row[col] ?? ''
      // Escapa aspas e envolve em aspas se tiver vírgula ou quebra de linha
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
    }).join(';') // Usa ; porque Excel BR usa ponto e vírgula
  )

  const csv = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\n') // \uFEFF = BOM para UTF-8 no Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  baixarArquivo(blob, `${nomeArquivo}.csv`)
}

// ── PDF (via impressão do browser) ──────────────────────────────
export function exportarPDF(titulo, colunas, linhas, subtitulo = '') {
  if (!linhas || linhas.length === 0) {
    alert('Nenhum dado para exportar.')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1f2e; padding: 24px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #1B5FAD; }
        .logo-text { font-size: 22px; font-weight: 700; color: #0D3D7A; }
        .logo-sub { font-size: 11px; color: #8a93a5; font-style: italic; }
        .titulo { font-size: 16px; font-weight: 700; color: #1a1f2e; margin-bottom: 4px; }
        .subtitulo { font-size: 12px; color: #8a93a5; margin-bottom: 16px; }
        .data-geracao { font-size: 11px; color: #8a93a5; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #0D3D7A; color: #fff; font-size: 10px; font-weight: 600; text-align: left; padding: 8px 10px; text-transform: uppercase; letter-spacing: .04em; }
        td { padding: 8px 10px; border-bottom: 1px solid #f0f2f5; font-size: 11px; color: #4a5568; }
        tr:nth-child(even) td { background: #f8f9fb; }
        tr:last-child td { border-bottom: none; }
        tfoot td { background: #E8F0FB; font-weight: 700; color: #0D3D7A; border-top: 2px solid #1B5FAD; }
        .rodape { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e5ec; font-size: 10px; color: #8a93a5; display: flex; justify-content: space-between; }
        .chip { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
        .chip-pago { background: #d9f0d0; color: #256015; }
        .chip-aberto { background: #fef0d6; color: #7a4509; }
        .chip-permuta { background: #ece9fd; color: #3c3489; }
        .chip-hora { background: #ddeafb; color: #0d3d7a; }
        .chip-m3 { background: #ece9fd; color: #3c3489; }
        .chip-desconta { background: #fddada; color: #952020; }
        .chip-info { background: #f0f2f5; color: #7a8494; }
        @media print {
          body { padding: 0; }
          @page { margin: 15mm; size: A4 landscape; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-text">Raimondi</div>
          <div class="logo-sub">artefatos de cimento</div>
        </div>
        <div style="text-align: right">
          <div class="data-geracao">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
      <div class="titulo">${titulo}</div>
      ${subtitulo ? `<div class="subtitulo">${subtitulo}</div>` : ''}
      <table>
        <thead>
          <tr>${colunas.map(c => `<th>${c.label}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${linhas.map(l => `<tr>${colunas.map(c => `<td>${formatarCelulaPDF(c, l)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <div class="rodape">
        <span>Raimondi Artefatos de Cimento — Sistema de Gestão de Agregados</span>
        <span>${linhas.length} registro${linhas.length !== 1 ? 's' : ''}</span>
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `

  const janela = window.open('', '_blank', 'width=1000,height=700')
  janela.document.write(html)
  janela.document.close()
}

// ── HELPERS ─────────────────────────────────────────────────────
function formatarCelulaPDF(coluna, linha) {
  const val = linha[coluna.key] ?? '—'
  if (coluna.chip) return `<span class="chip chip-${coluna.chip(val)}">${coluna.format ? coluna.format(val) : val}</span>`
  if (coluna.format) return coluna.format(val, linha)
  return val === null || val === undefined || val === '' ? '—' : val
}

function baixarArquivo(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── FUNÇÕES ESPECÍFICAS POR ABA ──────────────────────────────────
const fmtValor = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
const fmtNum = (v, dec = 1) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—'
const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

export function exportarPagamentos(pagamentos, periodo) {
  const dadosExcel = pagamentos.map(p => ({
    'Agregado': p.nome,
    'Lançamentos': p.lancamentos,
    'Total Horas': fmtNum(p.horas),
    'Total m³': fmtNum(p.m3),
    'Valor Bruto': fmtValor(p.bruto),
    'Desc. Combustível': p.desconto > 0 ? `- ${fmtValor(p.desconto)}` : '—',
    'Valor Líquido': p.isPermuta ? 'Permuta' : fmtValor(p.liquido),
    'Status': p.status === 'pago' ? 'Pago' : p.isPermuta ? 'Permuta' : 'Em aberto'
  }))

  const colunas = [
    { key: 'nome', label: 'Agregado' },
    { key: 'lancamentos', label: 'Lançamentos' },
    { key: 'horas', label: 'Horas', format: v => fmtNum(v) + ' h' },
    { key: 'm3', label: 'Volume', format: v => fmtNum(v) + ' m³' },
    { key: 'bruto', label: 'Valor Bruto', format: (v, l) => l.isPermuta ? '—' : fmtValor(v) },
    { key: 'desconto', label: 'Desc. Comb.', format: v => v > 0 ? `- ${fmtValor(v)}` : '—' },
    { key: 'liquido', label: 'Valor Líquido', format: (v, l) => l.isPermuta ? 'Permuta' : fmtValor(v) },
    { key: 'status', label: 'Status', chip: v => v === 'pago' ? 'pago' : 'aberto', format: v => v === 'pago' ? 'Pago' : 'Em aberto' }
  ]

  return { dadosExcel, colunas, nomeArquivo: `pagamentos_${periodo}` }
}

export function exportarHorasVolume(equipamentos, periodo) {
  const dadosExcel = equipamentos.map(e => ({
    'Equipamento': e.nome,
    'Agregado': e.agregado,
    'Tipo': e.tipo,
    'Modo': e.modo === 'hora_maquina' ? 'Hora máquina' : 'Carga m³',
    'Quantidade': e.modo === 'hora_maquina' ? fmtNum(e.qtd) + ' h' : fmtNum(e.qtd) + ' m³',
    'Lançamentos': e.lancamentos,
    'Valor Total': e.isPermuta ? 'Permuta' : fmtValor(e.valor)
  }))

  const colunas = [
    { key: 'nome', label: 'Equipamento' },
    { key: 'agregado', label: 'Agregado' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'modo', label: 'Modo', format: v => v === 'hora_maquina' ? 'Hora máq.' : 'Carga m³' },
    { key: 'qtd', label: 'Quantidade', format: (v, l) => l.modo === 'hora_maquina' ? fmtNum(v) + ' h' : fmtNum(v) + ' m³' },
    { key: 'lancamentos', label: 'Lançamentos' },
    { key: 'valor', label: 'Valor Total', format: (v, l) => l.isPermuta ? 'Permuta' : fmtValor(v) }
  ]

  return { dadosExcel, colunas, nomeArquivo: `horas_volume_${periodo}` }
}

export function exportarAbastecimentos(abastecimentos, periodo) {
  const dadosExcel = abastecimentos.map(a => ({
    'Agregado': a.agregados?.nome,
    'Equipamento': a.equipamentos?.nome,
    'Combustível': a.tipo_combustivel,
    'Litros': fmtNum(a.litros, 0),
    'Valor': fmtValor(a.valor_total),
    'Posto': a.posto || '—',
    'NF-e': a.nfe || '—',
    'Data': fmtData(a.data_abastecimento),
    'Desconto': a.descontar_fechamento ? 'Desconta' : 'Informativo'
  }))

  const colunas = [
    { key: 'agregados', label: 'Agregado', format: (v) => v?.nome || '—' },
    { key: 'equipamentos', label: 'Equipamento', format: (v) => v?.nome || '—' },
    { key: 'tipo_combustivel', label: 'Combustível' },
    { key: 'litros', label: 'Litros', format: v => fmtNum(v, 0) + ' L' },
    { key: 'valor_total', label: 'Valor', format: v => fmtValor(v) },
    { key: 'posto', label: 'Posto' },
    { key: 'nfe', label: 'NF-e' },
    { key: 'data_abastecimento', label: 'Data', format: v => fmtData(v) },
    { key: 'descontar_fechamento', label: 'Tipo', format: v => v ? 'Desconta' : 'Informativo' }
  ]

  return { dadosExcel, colunas, nomeArquivo: `abastecimentos_${periodo}` }
}

export function exportarComparativo(comparativo) {
  const dadosExcel = comparativo.map(m => ({
    'Mês': m.label,
    'Lançamentos': m.lancamentos,
    'Horas': fmtNum(m.horas) + ' h',
    'Volume m³': fmtNum(m.m3) + ' m³',
    'Valor Bruto': fmtValor(m.bruto),
    'Desc. Combustível': m.desconto > 0 ? `- ${fmtValor(m.desconto)}` : '—',
    'Valor Líquido': fmtValor(m.liquido)
  }))

  const colunas = [
    { key: 'label', label: 'Mês' },
    { key: 'lancamentos', label: 'Lançamentos' },
    { key: 'horas', label: 'Horas', format: v => fmtNum(v) + ' h' },
    { key: 'm3', label: 'Volume m³', format: v => fmtNum(v) + ' m³' },
    { key: 'bruto', label: 'Valor Bruto', format: v => fmtValor(v) },
    { key: 'desconto', label: 'Desc. Comb.', format: v => v > 0 ? `- ${fmtValor(v)}` : '—' },
    { key: 'liquido', label: 'Valor Líquido', format: v => fmtValor(v) }
  ]

  return { dadosExcel, colunas, nomeArquivo: 'comparativo_mensal' }
}

export function exportarPorRequisicao(requisicoes, lancamentos) {
  const dadosExcel = requisicoes.flatMap(r =>
    r.itens.map(l => ({
      'Requisição': r.requisicao,
      'Agregado': l.agregados?.nome,
      'Equipamento': l.equipamentos?.nome,
      'Tipo': l.tipo === 'hora_maquina' ? 'Hora máquina' : 'Carga m³',
      'Quantidade': l.tipo === 'hora_maquina' ? l.quantidade + ' h' : l.quantidade + ' m³',
      'Valor Unitário': l.is_permuta ? 'Permuta' : l.valor_unitario ? fmtValor(l.valor_unitario) : '—',
      'Total': l.is_permuta ? 'Permuta' : fmtValor(l.valor_total),
      'Data': fmtData(l.data_lancamento)
    }))
  )

  const colunas = [
    { key: 'requisicao', label: 'Requisição' },
    { key: 'agregados', label: 'Agregado', format: v => v?.nome || '—' },
    { key: 'equipamentos', label: 'Equipamento', format: v => v?.nome || '—' },
    { key: 'tipo', label: 'Tipo', format: v => v === 'hora_maquina' ? 'Hora máq.' : 'Carga m³' },
    { key: 'quantidade', label: 'Qtd', format: (v, l) => l.tipo === 'hora_maquina' ? v + ' h' : v + ' m³' },
    { key: 'valor_unitario', label: 'Valor Unit.', format: (v, l) => l.is_permuta ? 'Permuta' : fmtValor(v) },
    { key: 'valor_total', label: 'Total', format: (v, l) => l.is_permuta ? 'Permuta' : fmtValor(v) },
    { key: 'data_lancamento', label: 'Data', format: v => fmtData(v) }
  ]

  return { dadosExcel, colunas, nomeArquivo: 'lancamentos_por_requisicao' }
}
