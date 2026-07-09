import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAbastecimentos(filtros = {}) {
  const [abastecimentos, setAbastecimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('abastecimentos')
      .select(`*, agregados(id, nome), equipamentos(id, nome)`)
      .order('data_abastecimento', { ascending: false })

    if (filtros.agregadoId) query = query.eq('agregado_id', filtros.agregadoId)
    if (filtros.dataInicio) query = query.gte('data_abastecimento', filtros.dataInicio)
    if (filtros.dataFim) query = query.lte('data_abastecimento', filtros.dataFim)
    if (filtros.descontar !== undefined) query = query.eq('descontar_fechamento', filtros.descontar)
    if (filtros.somenteAbertos) query = query.is('fechamento_id', null)

    const { data, error } = await query
    if (error) setError(error.message)
    else setAbastecimentos(data)
    setLoading(false)
  }, [JSON.stringify(filtros)])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados) => {
    const valorTotal = dados.litros * dados.preco_por_litro
    const payload = { ...dados, valor_total: valorTotal }
    const { data, error } = await supabase.from('abastecimentos').insert(payload).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const atualizar = async (id, dados) => {
    const valorTotal = dados.litros * dados.preco_por_litro
    const payload = { ...dados, valor_total: valorTotal }
    const { data, error } = await supabase.from('abastecimentos').update(payload).eq('id', id).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const remover = async (id) => {
    const { error } = await supabase.from('abastecimentos').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  // Busca abastecimentos a descontar de um agregado
  const buscarDescontos = async (agregadoId, dataInicio, dataFim) => {
    const { data, error } = await supabase
      .from('abastecimentos')
      .select('*')
      .eq('agregado_id', agregadoId)
      .eq('descontar_fechamento', true)
      .is('fechamento_id', null)
      .gte('data_abastecimento', dataInicio)
      .lte('data_abastecimento', dataFim)
    return { data, error }
  }

  return { abastecimentos, loading, error, refetch: fetch, criar, atualizar, remover, buscarDescontos }
}
