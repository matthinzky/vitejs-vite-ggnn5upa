import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import LeagueDashboard from './LeagueDashboard';

export default function LeagueSelection({ user }) {
  const [view, setView] = useState('home');
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [leagueName, setLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    setLoading(true);
    const { data: memberships } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', user.id);
    if (!memberships || memberships.length === 0) {
      setLeagues([]);
      setLoading(false);
      return;
    }
    const ids = memberships.map((m) => m.league_id);
    const { data } = await supabase.from('leagues').select('*').in('id', ids);
    setLeagues(data || []);
    setLoading(false);
  };

  const fetchFullLeague = async (leagueId) => {
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single();
    const { data: members } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', leagueId);
    return { ...league, members: members || [] };
  };

  const createLeague = async () => {
    if (!leagueName.trim()) return setError('Inserisci un nome per la lega');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: league, error: err } = await supabase
      .from('leagues')
      .insert({
        name: leagueName.trim(),
        invite_code: code,
        created_by: user.id,
      })
      .select()
      .single();
    if (err) return setError('Errore nella creazione della lega');
    await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
      team_name: '',
      credits: 500,
      is_admin: true,
    });
    await supabase.from('credit_log').insert({
      league_id: league.id,
      user_id: user.id,
      amount: 500,
      reason: 'Crediti iniziali',
    });
    setSuccess(`Lega "${leagueName}" creata! Codice invito: ${code}`);
    setLeagueName('');
    setView('home');
    fetchLeagues();
  };

  const joinLeague = async () => {
    if (!inviteCode.trim()) return setError('Inserisci il codice invito');
    const { data: league } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle();
    if (!league) return setError('Codice invito non valido');
    const { data: existing } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) return setError('Sei già in questa lega');
    await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
      team_name: '',
      credits: 500,
      is_admin: false,
    });
    await supabase.from('credit_log').insert({
      league_id: league.id,
      user_id: user.id,
      amount: 500,
      reason: 'Crediti iniziali',
    });
    setSuccess(`Sei entrato nella lega "${league.name}"!`);
    setInviteCode('');
    setView('home');
    fetchLeagues();
  };

  const handleEnterLeague = async (league) => {
    const full = await fetchFullLeague(league.id);
    setSelectedLeague(full);
  };

  const handleUpdate = async () => {
    const full = await fetchFullLeague(selectedLeague.id);
    setSelectedLeague(full);
    fetchLeagues();
  };

  if (selectedLeague)
    return (
      <LeagueDashboard
        league={selectedLeague}
        user={user}
        onBack={() => {
          setSelectedLeague(null);
          fetchLeagues();
        }}
        onUpdate={handleUpdate}
      />
    );

  if (view === 'create')
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button
          onClick={() => {
            setView('home');
            setError('');
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#60a5fa',
            cursor: 'pointer',
            fontSize: 14,
            marginBottom: 20,
            padding: 0,
          }}
        >
          ← Torna indietro
        </button>
        <h2 style={{ color: '#e8f0fe', marginBottom: 24 }}>
          Crea una nuova lega
        </h2>
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
        <label
          style={{
            color: '#7a8fa6',
            fontSize: 13,
            display: 'block',
            marginBottom: 6,
          }}
        >
          Nome della lega
        </label>
        <input
          value={leagueName}
          onChange={(e) => setLeagueName(e.target.value)}
          placeholder="Es. SuperFantaLeague Serie A"
          style={{
            width: '100%',
            background: '#0f1923',
            border: '1px solid #2a3a50',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#e8f0fe',
            fontSize: 15,
            boxSizing: 'border-box',
            marginBottom: 20,
          }}
        />
        <button
          onClick={createLeague}
          style={{
            width: '100%',
            background: '#2563eb',
            border: 'none',
            borderRadius: 8,
            padding: '12px',
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Crea lega
        </button>
      </div>
    );

  if (view === 'join')
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button
          onClick={() => {
            setView('home');
            setError('');
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#60a5fa',
            cursor: 'pointer',
            fontSize: 14,
            marginBottom: 20,
            padding: 0,
          }}
        >
          ← Torna indietro
        </button>
        <h2 style={{ color: '#e8f0fe', marginBottom: 24 }}>
          Accedi a una lega
        </h2>
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
        <label
          style={{
            color: '#7a8fa6',
            fontSize: 13,
            display: 'block',
            marginBottom: 6,
          }}
        >
          Codice invito (6 caratteri)
        </label>
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Es. AB12CD"
          maxLength={6}
          style={{
            width: '100%',
            background: '#0f1923',
            border: '1px solid #2a3a50',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#e8f0fe',
            fontSize: 15,
            boxSizing: 'border-box',
            marginBottom: 20,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        />
        <button
          onClick={joinLeague}
          style={{
            width: '100%',
            background: '#2563eb',
            border: 'none',
            borderRadius: 8,
            padding: '12px',
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Entra nella lega
        </button>
      </div>
    );

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ color: '#e8f0fe', marginBottom: 8 }}>Le tue leghe</h2>
      <p style={{ color: '#7a8fa6', fontSize: 14, marginBottom: 24 }}>
        Gestisci le tue leghe o creane una nuova.
      </p>

      {success && (
        <div
          style={{
            background: '#0f2a1a',
            border: '1px solid #3B6D11',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#C0DD97',
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#7a8fa6', padding: '3rem' }}>
          Caricamento...
        </div>
      ) : leagues.length === 0 ? (
        <div
          style={{
            background: '#1a2535',
            border: '1px solid #2a3a50',
            borderRadius: 12,
            padding: '3rem',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <p style={{ color: '#7a8fa6', marginBottom: 0 }}>
            Non sei ancora in nessuna lega.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {leagues.map((l) => (
            <div
              key={l.id}
              style={{
                background: '#1a2535',
                border: '1px solid #2a3a50',
                borderRadius: 12,
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{ fontWeight: 600, fontSize: 16, color: '#e8f0fe' }}
                >
                  {l.name}
                </div>
                <div style={{ color: '#7a8fa6', fontSize: 13, marginTop: 4 }}>
                  Codice: {l.invite_code}
                </div>
              </div>
              <button
                onClick={() => handleEnterLeague(l)}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Entra
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={() => {
            setView('create');
            setError('');
            setSuccess('');
          }}
          style={{
            background: '#1a2535',
            border: '1px solid #2563eb',
            borderRadius: 12,
            padding: '1.5rem',
            color: '#e8f0fe',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>➕</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Crea una lega</div>
          <div style={{ color: '#7a8fa6', fontSize: 13, marginTop: 4 }}>
            Diventa admin della tua lega
          </div>
        </button>
        <button
          onClick={() => {
            setView('join');
            setError('');
            setSuccess('');
          }}
          style={{
            background: '#1a2535',
            border: '1px solid #2a3a50',
            borderRadius: 12,
            padding: '1.5rem',
            color: '#e8f0fe',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔑</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Accedi a una lega</div>
          <div style={{ color: '#7a8fa6', fontSize: 13, marginTop: 4 }}>
            Inserisci il codice invito
          </div>
        </button>
      </div>
    </div>
  );
}
