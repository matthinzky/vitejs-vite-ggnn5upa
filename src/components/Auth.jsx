import { useState } from 'react';
import { supabase } from '../supabase';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return setError('Compila tutti i campi');
    setLoading(true);
    setError('');

    if (mode === 'register') {
      if (!name) {
        setLoading(false);
        return setError('Inserisci il tuo nome');
      }
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existing) {
        setLoading(false);
        return setError('Email già registrata');
      }
      const { data, error: err } = await supabase
        .from('users')
        .insert({ email, password_hash: password, name })
        .select()
        .single();
      if (err) {
        setLoading(false);
        return setError('Errore durante la registrazione');
      }
      onLogin(data);
    } else {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password)
        .maybeSingle();
      if (err || !data) {
        setLoading(false);
        return setError('Email o password errati');
      }
      onLogin(data);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    background: '#0f1923',
    border: '1px solid #2a3a50',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e8f0fe',
    fontSize: 15,
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1923',
      }}
    >
      <div
        style={{
          background: '#1a2535',
          borderRadius: 16,
          padding: '2.5rem',
          width: 380,
          border: '1px solid #2a3a50',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚽</div>
          <h1
            style={{
              color: '#e8f0fe',
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
            }}
          >
            SuperFantaLeague
          </h1>
          <p style={{ color: '#7a8fa6', fontSize: 14, marginTop: 6 }}>
            {mode === 'login' ? 'Accedi al tuo account' : 'Crea il tuo account'}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#3a1a1a',
              border: '1px solid #a32d2d',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#f09595',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {mode === 'register' && (
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                color: '#7a8fa6',
                fontSize: 13,
                display: 'block',
                marginBottom: 6,
              }}
            >
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Il tuo nome"
              style={inputStyle}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              color: '#7a8fa6',
              fontSize: 13,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="la-tua@email.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              color: '#7a8fa6',
              fontSize: 13,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#1e3a5f' : '#2563eb',
            border: 'none',
            borderRadius: 8,
            padding: '12px',
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading
            ? 'Attendere...'
            : mode === 'login'
            ? 'Accedi'
            : 'Registrati'}
        </button>

        <p
          style={{
            textAlign: 'center',
            color: '#7a8fa6',
            fontSize: 14,
            marginTop: 16,
          }}
        >
          {mode === 'login' ? 'Non hai un account?' : 'Hai già un account?'}{' '}
          <span
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            style={{ color: '#60a5fa', cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Registrati' : 'Accedi'}
          </span>
        </p>
      </div>
    </div>
  );
}
