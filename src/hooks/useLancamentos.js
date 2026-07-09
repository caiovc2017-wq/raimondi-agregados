import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLancamentos(filtros = {}) {
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('lancamentos')
      .select(`
        *,
        agregados(id, nome),
        equipamentos(id, nome, tipo, modo_lancamento),
        obras(id, nome, codigo)
      `)
      .order('data_lancamento', { ascending: false })
      .order('criado_em', { ascending: false })

    if (filtros.agregadoId) query = query.eq('agregado_id', filtros.agregadoId)
    if (filtros.dataInicio) query = query.gte('data_lancamento', filtros.dataInicio)
    if (filtros.dataFim) query = query.lte('data_lancamento', filtros.dataFim)
    if (filtros.status) query = query.eq('status_pagamento', filtros.status)
    if (filtros.tipo) query = query.eq('tipo', filtros.tipo)
    if (filtros.requisicao) query = query.ilike('requisicao', `%${filtros.requisicao}%`)
    if (filtros.somenteAbertos) query = query.is('fechamento_id', null)

    const { data, error } = await query
    if (error) setError(error.message)
    else setLancamentos(data)
    setLoading(false)
  }, [JSON.stringify(filtros)])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados) => {
    // Calcula total automaticamente
    const valorTotal = dados.is_permuta ? null : (dados.quantidade * dados.valor_unitario)
    const payload = { ...dados, valor_total: valorTotal }

    const { data, error } = await supabase.from('lancamentos').insert(payload).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const atualizar = async (id, dados) => {
    const valorTotal = dados.is_permuta ? null : (dados.quantidade * dados.valor_unitario)
    const payload = { ...dados, valor_total: valorTotal }

    const { data, error } = await supabase.from('lancamentos').update(payload).eq('id', id).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const remover = async (id) => {
    const { error } = await supabase.from('lancamentos').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  // Busca lançamentos em aberto de um agregado para fechamento
  const buscarAbertos = async (agregadoId, dataInicio, dataFim) => {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(`*, equipamentos(nome, modo_lancamento)`)
      .eq('agregado_id', agregadoId)
      .is('fechamento_id', null)
      .neq('status_pagamento', 'pago')
      .gte('data_lancamento', dataInicio)
      .lte('data_lancamento', dataFim)
      .order('data_lancamento')
    return { data, error }
  }

  return { lancamentos, loading, error, refetch: fetch, criar, atualizar, remover, buscarAbertos }
}
