// ================================================================
// exportar.js — Funções de exportação PDF e Excel
// ================================================================

const fmtValor = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
const fmtNum = (v, dec = 1) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—'
const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

// ── EXCEL (CSV) ──────────────────────────────────────────────────
export function exportarExcel(dados, nomeArquivo = 'relatorio') {
  if (!dados || dados.length === 0) { alert('Nenhum dado para exportar.'); return }
  const cabecalho = Object.keys(dados[0])
  const linhas = dados.map(row =>
    cabecalho.map(col => {
      const str = String(row[col] ?? '').replace(/"/g, '""')
      return str.includes(';') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
    }).join(';')
  )
  const csv = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  baixarArquivo(blob, `${nomeArquivo}.csv`)
}

// ── PDF — usa iframe inline (funciona no Electron sem window.open) ──
export function exportarPDF(titulo, colunas, linhas, subtitulo = '') {
  if (!linhas || linhas.length === 0) { alert('Nenhum dado para exportar.'); return }

  const html = gerarHTMLPDF(titulo, subtitulo, colunas, linhas)

  // Cria iframe invisível, injeta o HTML e dispara impressão
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }, 500)
}

// ── PDF FOLHA DE FECHAMENTO (layout especial para Por Requisição) ──
export function exportarPDFFechamento(linhas, filtros) {
  if (!linhas || linhas.length === 0) { alert('Nenhum dado para exportar.'); return }

  const totalGeral = linhas.filter(l => !l.is_permuta).reduce((s, l) => s + Number(l.valor_total || 0), 0)
  const totalM3 = linhas.filter(l => l.tipo === 'carga_m3').reduce((s, l) => s + Number(l.quantidade || 0), 0)
  const totalH = linhas.filter(l => l.tipo === 'hora_maquina').reduce((s, l) => s + Number(l.quantidade || 0), 0)
  const obraNome = filtros.obraNome || 'Todas as obras'
  const periodo = `${fmtData(filtros.dataInicio)} a ${fmtData(filtros.dataFim)}`

  // Agrupa por agregado para subtotais
  const porAgregado = {}
  for (const l of linhas) {
    const nome = l.agregados?.nome || '—'
    if (!porAgregado[nome]) porAgregado[nome] = { nome, itens: [], total: 0, m3: 0, horas: 0 }
    porAgregado[nome].itens.push(l)
    if (!l.is_permuta) porAgregado[nome].total += Number(l.valor_total || 0)
    if (l.tipo === 'carga_m3') porAgregado[nome].m3 += Number(l.quantidade || 0)
    if (l.tipo === 'hora_maquina') porAgregado[nome].horas += Number(l.quantidade || 0)
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Folha de Fechamento — ${obraNome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1f2e; padding: 20px; }

    /* CABEÇALHO */
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid #0D3D7A; }
    .logo-text { font-size: 20px; font-weight: 700; color: #0D3D7A; }
    .logo-sub { font-size: 10px; color: #8a93a5; font-style: italic; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-titulo { font-size: 15px; font-weight: 700; color: #0D3D7A; }
    .doc-sub { font-size: 10px; color: #6b7280; margin-top: 3px; }

    /* RESUMO */
    .resumo { display: flex; gap: 12px; margin-bottom: 16px; }
    .resumo-card { flex: 1; background: #E8F0FB; border: 1px solid #93b3d4; border-radius: 6px; padding: 10px 12px; }
    .resumo-label { font-size: 9px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
    .resumo-valor { font-size: 16px; font-weight: 700; color: #0D3D7A; margin-top: 3px; }
    .resumo-card.destaque { background: #0D3D7A; border-color: #0D3D7A; }
    .resumo-card.destaque .resumo-label { color: rgba(255,255,255,.7); }
    .resumo-card.destaque .resumo-valor { color: #fff; }

    /* INFO OBRA */
    .info-obra { background: #f5f6f8; border: 1px solid #e2e5ec; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; display: flex; gap: 32px; }
    .info-item label { font-size: 9px; color: #8a93a5; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 2px; }
    .info-item span { font-size: 12px; color: #1a1f2e; font-weight: 600; }

    /* TABELA */
    .secao-titulo { font-size: 11px; font-weight: 700; color: #0D3D7A; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1.5px solid #0D3D7A; display: flex; justify-content: space-between; align-items: center; }
    .secao-titulo span { font-size: 10px; color: #6b7280; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #0D3D7A; color: #fff; font-size: 9px; font-weight: 600; text-align: left; padding: 6px 8px; text-transform: uppercase; letter-spacing: .04em; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0f2f5; font-size: 10px; color: #4a5568; }
    tr:nth-child(even) td { background: #fafbfc; }
    tr.subtotal td { background: #E8F0FB; font-weight: 700; color: #0D3D7A; border-top: 1.5px solid #93b3d4; font-size: 10px; }
    tr.total-geral td { background: #0D3D7A; color: #fff; font-weight: 700; font-size: 11px; border: none; }
    .tag { background: #f0f2f5; border: 1px solid #dde0e8; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 9px; }
    .chip-m3 { background: #ece9fd; color: #3c3489; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }
    .chip-h { background: #ddeafb; color: #0d3d7a; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }

    /* RODAPÉ */
    .rodape { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e5ec; display: flex; justify-content: space-between; font-size: 9px; color: #8a93a5; }
    .assinatura { margin-top: 40px; display: flex; gap: 60px; }
    .assinatura-linha { flex: 1; text-align: center; }
    .assinatura-linha .linha { border-top: 1px solid #1a1f2e; margin-bottom: 4px; }
    .assinatura-linha span { font-size: 9px; color: #6b7280; }

    @media print {
      body { padding: 10px; }
      @page { margin: 10mm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <!-- CABEÇALHO -->
  <div class="header">
    <div>
      <div class="logo-text">Raimondi</div>
      <div class="logo-sub">rental · locações</div>
    </div>
    <div class="doc-info">
      <div class="doc-titulo">Folha de Fechamento — Serviços Terceirizados</div>
      <div class="doc-sub">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>

  <!-- INFO OBRA E PERÍODO -->
  <div class="info-obra">
    <div class="info-item"><label>Obra</label><span>${obraNome}</span></div>
    <div class="info-item"><label>Período</label><span>${periodo}</span></div>
    <div class="info-item"><label>Total de registros</label><span>${linhas.length} lançamentos</span></div>
  </div>

  <!-- CARDS DE RESUMO -->
  <div class="resumo">
    <div class="resumo-card">
      <div class="resumo-label">Total volume</div>
      <div class="resumo-valor">${fmtNum(totalM3, 1)} m³</div>
    </div>
    <div class="resumo-card">
      <div class="resumo-label">Total horas máquina</div>
      <div class="resumo-valor">${fmtNum(totalH, 1)} h</div>
    </div>
    <div class="resumo-card">
      <div class="resumo-label">Agregados envolvidos</div>
      <div class="resumo-valor">${Object.keys(porAgregado).length}</div>
    </div>
    <div class="resumo-card destaque">
      <div class="resumo-label">Valor total a pagar</div>
      <div class="resumo-valor">${fmtValor(totalGeral)}</div>
    </div>
  </div>

  <!-- TABELA DETALHADA POR AGREGADO -->
  ${Object.values(porAgregado).map(ag => `
    <div class="secao-titulo">
      ${ag.nome}
      <span>
        ${ag.m3 > 0 ? fmtNum(ag.m3) + ' m³' : ''}
        ${ag.horas > 0 ? fmtNum(ag.horas) + ' h' : ''}
        — ${fmtValor(ag.total)}
      </span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Requisição</th>
          <th>Equipamento</th>
          <th>Tipo</th>
          <th>Quantidade</th>
          <th>Valor Unit.</th>
          <th>Total</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        ${ag.itens.map(l => `
          <tr>
            <td><span class="tag">${l.requisicao}</span></td>
            <td>${l.equipamentos?.nome || '—'}</td>
            <td><span class="${l.tipo === 'carga_m3' ? 'chip-m3' : 'chip-h'}">${l.tipo === 'carga_m3' ? 'Carga m³' : 'Hora máq.'}</span></td>
            <td>${l.tipo === 'carga_m3' ? fmtNum(l.quantidade) + ' m³' : fmtNum(l.quantidade) + ' h'}</td>
            <td>${l.is_permuta ? 'Permuta' : l.valor_unitario ? `R$ ${Number(l.valor_unitario).toFixed(2).replace('.', ',')}` : '—'}</td>
            <td style="font-weight:600;color:#1a1f2e">${l.is_permuta ? 'Permuta' : fmtValor(l.valor_total)}</td>
            <td>${fmtData(l.data_lancamento)}</td>
          </tr>
        `).join('')}
        <tr class="subtotal">
          <td colspan="3">Subtotal — ${ag.nome}</td>
          <td>${ag.m3 > 0 ? fmtNum(ag.m3) + ' m³' : ag.horas > 0 ? fmtNum(ag.horas) + ' h' : '—'}</td>
          <td></td>
          <td colspan="2">${fmtValor(ag.total)}</td>
        </tr>
      </tbody>
    </table>
  `).join('')}

  <!-- TOTAL GERAL -->
  <table>
    <tbody>
      <tr class="total-geral">
        <td colspan="5" style="font-size:12px">TOTAL GERAL</td>
        <td style="font-size:14px">${fmtValor(totalGeral)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- ASSINATURAS -->
  <div class="assinatura">
    <div class="assinatura-linha">
      <div class="linha"></div>
      <span>Responsável Financeiro / Raimondi</span>
    </div>
    <div class="assinatura-linha">
      <div class="linha"></div>
      <span>Conferido por</span>
    </div>
    <div class="assinatura-linha">
      <div class="linha"></div>
      <span>Data</span>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="rodape">
    <span>Raimondi Rental · Locações — Sistema de Gestão de Agregados</span>
    <span>${linhas.length} lançamentos · ${Object.keys(porAgregado).length} agregados</span>
  </div>

  <script>window.onload = () => { window.focus(); window.print(); }</script>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;'
  document.body.appendChild(iframe)
  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }, 500)
}

function gerarHTMLPDF(titulo, subtitulo, colunas, linhas) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1f2e; padding: 20px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #1B5FAD; }
    .logo-text { font-size: 18px; font-weight: 700; color: #0D3D7A; }
    .logo-sub { font-size: 10px; color: #8a93a5; font-style: italic; }
    .titulo { font-size: 14px; font-weight: 700; color: #1a1f2e; margin-bottom: 4px; }
    .subtitulo { font-size: 11px; color: #8a93a5; margin-bottom: 14px; }
    .data-geracao { font-size: 10px; color: #8a93a5; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0D3D7A; color: #fff; font-size: 9px; font-weight: 600; text-align: left; padding: 7px 8px; text-transform: uppercase; letter-spacing: .04em; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0f2f5; font-size: 10px; color: #4a5568; }
    tr:nth-child(even) td { background: #f8f9fb; }
    @media print { body { padding: 0; } @page { margin: 12mm; size: A4 landscape; } }
  </style>
</head>
<body>
  <div class="header">
    <div><div class="logo-text">Raimondi</div><div class="logo-sub">rental · locações</div></div>
    <div class="data-geracao">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>
  <div class="titulo">${titulo}</div>
  ${subtitulo ? `<div class="subtitulo">${subtitulo}</div>` : ''}
  <table>
    <thead><tr>${colunas.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>${linhas.map(l => `<tr>${colunas.map(c => `<td>${formatarCelulaPDF(c, l)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <div style="margin-top:14px;padding-top:10px;border-top:1px solid #e2e5ec;font-size:9px;color:#8a93a5;display:flex;justify-content:space-between;">
    <span>Raimondi — Sistema de Gestão de Agregados</span>
    <span>${linhas.length} registro${linhas.length !== 1 ? 's' : ''}</span>
  </div>
  <script>window.onload = () => { window.focus(); window.print(); }</script>
</body>
</html>`
}

function formatarCelulaPDF(coluna, linha) {
  const val = linha[coluna.key] ?? '—'
  if (coluna.chip) return `<span>${coluna.format ? coluna.format(val) : val}</span>`
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

// ── EXPORTAÇÕES POR ABA ──────────────────────────────────────────

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
    { key: 'status', label: 'Status', format: v => v === 'pago' ? 'Pago' : 'Em aberto' }
  ]
  return { dadosExcel, colunas, nomeArquivo: `pagamentos_${periodo}` }
}

export function exportarHorasVolume(equipamentos, periodo) {
  const dadosExcel = equipamentos.map(e => ({
    'Equipamento': e.nome, 'Agregado': e.agregado, 'Tipo': e.tipo,
    'Modo': e.modo === 'hora_maquina' ? 'Hora máquina' : 'Carga m³',
    'Quantidade': e.modo === 'hora_maquina' ? fmtNum(e.qtd) + ' h' : fmtNum(e.qtd) + ' m³',
    'Lançamentos': e.lancamentos,
    'Valor Total': e.isPermuta ? 'Permuta' : fmtValor(e.valor)
  }))
  const colunas = [
    { key: 'nome', label: 'Equipamento' }, { key: 'agregado', label: 'Agregado' },
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
    'Agregado': a.agregados?.nome, 'Equipamento': a.equipamentos?.nome,
    'Combustível': a.tipo_combustivel, 'Litros': fmtNum(a.litros, 0),
    'Valor': fmtValor(a.valor_total), 'Posto': a.posto || '—',
    'NF-e': a.nfe || '—', 'Data': fmtData(a.data_abastecimento),
    'Desconto': a.descontar_fechamento ? 'Desconta' : 'Informativo'
  }))
  const colunas = [
    { key: 'agregados', label: 'Agregado', format: v => v?.nome || '—' },
    { key: 'equipamentos', label: 'Equipamento', format: v => v?.nome || '—' },
    { key: 'tipo_combustivel', label: 'Combustível' },
    { key: 'litros', label: 'Litros', format: v => fmtNum(v, 0) + ' L' },
    { key: 'valor_total', label: 'Valor', format: v => fmtValor(v) },
    { key: 'posto', label: 'Posto' }, { key: 'nfe', label: 'NF-e' },
    { key: 'data_abastecimento', label: 'Data', format: v => fmtData(v) },
    { key: 'descontar_fechamento', label: 'Tipo', format: v => v ? 'Desconta' : 'Informativo' }
  ]
  return { dadosExcel, colunas, nomeArquivo: `abastecimentos_${periodo}` }
}

export function exportarComparativo(comparativo) {
  const dadosExcel = comparativo.map(m => ({
    'Mês': m.label, 'Lançamentos': m.lancamentos,
    'Horas': fmtNum(m.horas) + ' h', 'Volume m³': fmtNum(m.m3) + ' m³',
    'Valor Bruto': fmtValor(m.bruto),
    'Desc. Combustível': m.desconto > 0 ? `- ${fmtValor(m.desconto)}` : '—',
    'Valor Líquido': fmtValor(m.liquido)
  }))
  const colunas = [
    { key: 'label', label: 'Mês' }, { key: 'lancamentos', label: 'Lançamentos' },
    { key: 'horas', label: 'Horas', format: v => fmtNum(v) + ' h' },
    { key: 'm3', label: 'Volume m³', format: v => fmtNum(v) + ' m³' },
    { key: 'bruto', label: 'Valor Bruto', format: v => fmtValor(v) },
    { key: 'desconto', label: 'Desc. Comb.', format: v => v > 0 ? `- ${fmtValor(v)}` : '—' },
    { key: 'liquido', label: 'Valor Líquido', format: v => fmtValor(v) }
  ]
  return { dadosExcel, colunas, nomeArquivo: 'comparativo_mensal' }
}

// Exporta Por Requisição com filtros aplicados (obra + busca)
export function exportarPorRequisicao(requisicoes, filtroObraId, buscaReq) {
  const itensFiltrados = requisicoes
    .filter(r => {
      const matchReq = !buscaReq || r.requisicao.toLowerCase().includes(buscaReq.toLowerCase())
      const matchObra = !filtroObraId || r.itens.some(l => l.obras?.id === filtroObraId)
      return matchReq && matchObra
    })
    .flatMap(r => r.itens.filter(l => !filtroObraId || l.obras?.id === filtroObraId))

  const dadosExcel = itensFiltrados.map(l => ({
    'Requisição': l.requisicao,
    'Obra': l.obras?.nome || '—',
    'Agregado': l.agregados?.nome,
    'Equipamento': l.equipamentos?.nome,
    'Tipo': l.tipo === 'hora_maquina' ? 'Hora máquina' : 'Carga m³',
    'Quantidade': l.tipo === 'hora_maquina' ? l.quantidade + ' h' : l.quantidade + ' m³',
    'Valor Unitário': l.is_permuta ? 'Permuta' : l.valor_unitario ? fmtValor(l.valor_unitario) : '—',
    'Total': l.is_permuta ? 'Permuta' : fmtValor(l.valor_total),
    'Data': fmtData(l.data_lancamento)
  }))

  const colunas = [
    { key: 'requisicao', label: 'Requisição' },
    { key: 'obras', label: 'Obra', format: v => v?.nome || '—' },
    { key: 'agregados', label: 'Agregado', format: v => v?.nome || '—' },
    { key: 'equipamentos', label: 'Equipamento', format: v => v?.nome || '—' },
    { key: 'tipo', label: 'Tipo', format: v => v === 'hora_maquina' ? 'Hora máq.' : 'Carga m³' },
    { key: 'quantidade', label: 'Qtd', format: (v, l) => l.tipo === 'hora_maquina' ? v + ' h' : v + ' m³' },
    { key: 'valor_unitario', label: 'Valor Unit.', format: (v, l) => l.is_permuta ? 'Permuta' : fmtValor(v) },
    { key: 'valor_total', label: 'Total', format: (v, l) => l.is_permuta ? 'Permuta' : fmtValor(v) },
    { key: 'data_lancamento', label: 'Data', format: v => fmtData(v) }
  ]

  return { dadosExcel, colunas, nomeArquivo: 'lancamentos_por_requisicao', itensFiltrados }
}
