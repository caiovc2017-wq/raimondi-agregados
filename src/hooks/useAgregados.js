import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── AGREGADOS ──────────────────────────────────────────────
export function useAgregados() {
  const [agregados, setAgregados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('agregados')
      .select(`*, equipamentos(*)`)
      .order('nome')
    if (error) setError(error.message)
    else setAgregados(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados) => {
    const { data, error } = await supabase.from('agregados').insert(dados).select('id, nome, cpf_cnpj, telefone, chave_pix, banco, agencia, conta, status, observacoes, criado_em').single()
    if (!error) await fetch()
    return { data, error }
  }

  const atualizar = async (id, dados) => {
    // Remove campos relacionais antes de salvar
    const { equipamentos: _, ...payload } = dados
    const { data, error } = await supabase.from('agregados').update(payload).eq('id', id).select('id, nome, cpf_cnpj, telefone, chave_pix, banco, agencia, conta, status, observacoes, criado_em').single()
    if (!error) await fetch()
    return { data, error }
  }

  const remover = async (id) => {
    const { error } = await supabase.from('agregados').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { agregados, loading, error, refetch: fetch, criar, atualizar, remover }
}

// ── EQUIPAMENTOS ───────────────────────────────────────────
export function useEquipamentos(agregadoId = null) {
  const [equipamentos, setEquipamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('equipamentos').select(`*, agregados(nome)`).order('nome')
    if (agregadoId) query = query.eq('agregado_id', agregadoId)
    const { data, error } = await query
    if (!error) setEquipamentos(data)
    setLoading(false)
  }, [agregadoId])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados) => {
    // Remove campos relacionais que não são colunas diretas
    const { agregados: _, ...payload } = dados
    const { data, error } = await supabase.from('equipamentos').insert(payload).select('id, nome, tipo, placa, capacidade, modo_lancamento, ativo, agregado_id').single()
    if (!error) await fetch()
    return { data, error }
  }

  const atualizar = async (id, dados) => {
    // Remove campos relacionais que não são colunas diretas
    const { agregados: _, ...payload } = dados
    const { data, error } = await supabase.from('equipamentos').update(payload).eq('id', id).select('id, nome, tipo, placa, capacidade, modo_lancamento, ativo, agregado_id').single()
    if (!error) await fetch()
    return { data, error }
  }

  const remover = async (id) => {
    const { error } = await supabase.from('equipamentos').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { equipamentos, loading, refetch: fetch, criar, atualizar, remover }
}
