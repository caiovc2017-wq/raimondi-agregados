import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFinanceiro(filtros = {}) {
  const [resumo, setResumo] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [loading, setLoading] = useState(true)

  // Busca resumo por agregado (lançamentos em aberto agrupados)
  const fetchResumo = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('lancamentos')
      .select(`
        agregado_id,
        agregados(id, nome),
        status_pagamento,
        is_permuta,
        tipo,
        quantidade,
        valor_total,
        fechamento_id
      `)
      .is('fechamento_id', null)

    if (filtros.dataInicio) query = query.gte('data_lancamento', filtros.dataInicio)
    if (filtros.dataFim) query = query.lte('data_lancamento', filtros.dataFim)
    if (filtros.status) query = query.eq('status_pagamento', filtros.status)

    const { data, error } = await query
    if (error) { setLoading(false); return }

    // Agrupa por agregado
    const agrupado = {}
    for (const l of data) {
      const id = l.agregado_id
      if (!agrupado[id]) {
        agrupado[id] = {
          agregado_id: id,
          nome: l.agregados?.nome,
          total_horas: 0,
          total_m3: 0,
          valor_total: 0,
          count: 0,
          is_permuta: l.is_permuta,
          status: l.is_permuta ? 'permuta' : 'em_aberto',
          lancamentos: []
        }
      }
      agrupado[id].count++
      agrupado[id].lancamentos.push(l)
      if (l.tipo === 'hora_maquina') agrupado[id].total_horas += Number(l.quantidade)
      if (l.tipo === 'carga_m3') agrupado[id].total_m3 += Number(l.quantidade)
      if (!l.is_permuta && l.valor_total) agrupado[id].valor_total += Number(l.valor_total)
    }

    setResumo(Object.values(agrupado))
    setLoading(false)
  }, [JSON.stringify(filtros)])

  const fetchFechamentos = useCallback(async () => {
    let query = supabase
      .from('fechamentos')
      .select(`*, agregados(nome)`)
      .order('criado_em', { ascending: false })

    if (filtros.agregadoId) query = query.eq('agregado_id', filtros.agregadoId)

    const { data } = await query
    if (data) setFechamentos(data)
  }, [filtros.agregadoId])

  useEffect(() => {
    fetchResumo()
    fetchFechamentos()
  }, [fetchResumo, fetchFechamentos])

  // Fecha pagamento de um agregado
  const fecharPagamento = async ({ agregadoId, dataInicio, dataFim, dataPagamento, formaPagamento, descricaoPermuta, observacoes, lancamentosIds, abastecimentosIds, valorBruto, valorDesconto, valorLiquido }) => {
    // 1. Cria o fechamento
    const { data: fechamento, error: errFech } = await supabase
      .from('fechamentos')
      .insert({
        agregado_id: agregadoId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        data_pagamento: dataPagamento,
        valor_bruto: valorBruto,
        valor_desconto_combustivel: valorDesconto,
        valor_liquido: valorLiquido,
        forma_pagamento: formaPagamento,
        descricao_permuta: descricaoPermuta,
        observacoes
      })
      .select()
      .single()

    if (errFech) return { error: errFech }

    // 2. Vincula lançamentos ao fechamento
    if (lancamentosIds?.length) {
      await supabase
        .from('lancamentos')
        .update({ fechamento_id: fechamento.id, status_pagamento: formaPagamento === 'permuta' ? 'permuta' : 'pago' })
        .in('id', lancamentosIds)
    }

    // 3. Vincula abastecimentos ao fechamento
    if (abastecimentosIds?.length) {
      await supabase
        .from('abastecimentos')
        .update({ fechamento_id: fechamento.id })
        .in('id', abastecimentosIds)
    }

    await fetchResumo()
    return { data: fechamento, error: null }
  }

  return { resumo, fechamentos, loading, refetch: fetchResumo, fecharPagamento }
}
