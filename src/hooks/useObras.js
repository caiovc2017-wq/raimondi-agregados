import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useObras(apenasAtivas = false) {
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('obras').select('*').order('nome')
    if (apenasAtivas) query = query.eq('status', 'ativa')
    const { data, error } = await query
    if (error) setError(error.message)
    else setObras(data)
    setLoading(false)
  }, [apenasAtivas])

  useEffect(() => { fetch() }, [fetch])

  const criar = async (dados) => {
    const { data, error } = await supabase.from('obras').insert(dados).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const atualizar = async (id, dados) => {
    const { data, error } = await supabase.from('obras').update(dados).eq('id', id).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const remover = async (id) => {
    const { error } = await supabase.from('obras').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { obras, loading, error, refetch: fetch, criar, atualizar, remover }
}
