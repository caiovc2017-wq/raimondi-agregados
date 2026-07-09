import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await signIn(email, senha)
    if (error) setErro('E-mail ou senha inválidos.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0D3D7A 0%, #1B5FAD 100%)'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px', width: 400,
        boxShadow: '0 12px 40px rgba(0,0,0,.25)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="./logo.png"
            alt="Raimondi"
            style={{ height: 64, objectFit: 'contain', marginBottom: 8 }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <p style={{ fontSize: 14, color: '#8a93a5', marginTop: 8 }}>Gestão de Agregados e Terceirizados</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 5 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{ width: '100%', fontSize: 14, border: '1.5px solid #dde1e8', borderRadius: 8, padding: '10px 14px', background: '#fafbfc' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 5 }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', fontSize: 14, border: '1.5px solid #dde1e8', borderRadius: 8, padding: '10px 14px', background: '#fafbfc' }}
            />
          </div>

          {erro && (
            <div style={{ background: '#fddada', color: '#b03030', padding: '10px 14px', borderRadius: 8, fontSize: 13, border: '1px solid #f5c6c6' }}>
              <i className="ti ti-alert-circle" /> {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: '#1B5FAD', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, marginTop: 4 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#8a93a5', marginTop: 24 }}>
          v1.0.0 · Raimondi Artefatos de Cimento
        </p>
      </div>
    </div>
  )
}
