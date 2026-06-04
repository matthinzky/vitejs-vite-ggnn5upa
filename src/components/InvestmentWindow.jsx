import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function calcNextRenewal(lastPaid) {
  return Math.ceil(lastPaid * 1.2)
}
function calcInvestmentCost(lastPaid) {
  return calcNextRenewal(lastPaid) - lastPaid
}

export default function InvestmentWindow({ league, user, isAdmin }) {
  const [windows, setWindows] = useState([])
  const [activeWindow, setActiveWindow] = useState(null)
  const [mySquad, setMySquad] = useState([])
  const [investmentsDone, setInvestmentsDone] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('main')
  const [newWindow, setNewWindow] = useState({ name: '', max_investments: 2, deadline: '' })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data: wins } = await supabase
      .from('investment_windows')
      .select('*')
      .eq('league_id', league.id)
      .order('created_at', { ascending: false })
    setWindows(wins || [])
    const active = (wins || []).find(w => w.is_open)
    setActiveWindow(active || null)

    if (active) {
      const { data: squad } = await supabase
        .from('squad_players')
        .select('*, players(*)')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
      const eligible = (squad || []).filter(sp =>
        sp.last_paid > 1 && !sp.has_investment
      )
      setMySquad(eligible)
      const invested = (squad || []).filter(sp => sp.has_investment).length
      setInvestmentsDone(invested)
    }
    setLoading(false)
  }

  const createWindow = async () => {
    if (!newWindow.name.trim()) return setError('Inserisci un nome')
    if (!newWindow.deadline) return setError('Inserisci una scadenza')
    const { error: err } = await supabase.from('investment_windows').insert({
      league_id: league.id,
      name: newWindow.name,
      max_investments_per_team: parseInt(newWindow.max_investments),
      deadline: new Date(newWindow.deadline).toISOString(),
      is_open: true,
      created_by: user.id
    })
    if (err) return setError('Errore nella creazione')
    setSuccess('Finestra investimenti aperta!')
    setView('main')
    setNewWindow({ name: '', max_investments: 2, deadline: '' })
    fetchAll()
  }

  const closeWindow = async (windowId) => {
    await supabase.from('investment_windows').update({ is_open: false }).eq('id', windowId)
    setSuccess('Finestra chiusa')
    fetchAll()
  }

  const makeInvestment = async (sp) => {
    if (investmentsDone >= activeWindow.max_investments_per_team) {
      return setError(`Hai già raggiunto il massimo di ${activeWindow.max_investments_per_team} investimenti`)
    }
    const cost = calcInvestmentCost(sp.last_paid)
    const phantom = sp.last_paid - cost

    const member = league.members.find(m => m.user_id === user.id)
    if ((member?.credits || 0) < cost) return setError('Crediti insufficienti')

    await supabase.from('squad_players').update({
      has_investment: true,
      investment_cost: cost,
      phantom_price: phantom,
      investment_count: (sp.investment_count || 0) + 1
    }).eq('id', sp.id)

    await supabase.from('league_members').update({
      credits: (member?.credits || 0) - cost
    }).eq('league_id', league.id).eq('user_id', user.id)

    await supabase.from('credit_log').insert({
      league_id: league.id,
      user_id: user.id,
      amount: -cost,
      reason: `Investimento su ${sp.players?.name}`
    })

    setSuccess(`Investimento su ${sp.players?.name} effettuato! (-${cost} cr.)`)
    setError('')
    fetchAll()
  }

  if (loading) return <div style={{color:'#7a8fa6',textAlign:'center',padding:'3rem'}}>Caricamento...</div>

  const inputStyle = {
    width:'100%', background:'#0f1923', border:'1px solid #2a3a50',
    borderRadius:8, padding:'10px 14px', color:'#e8f0fe', fontSize:14,
    boxSizing:'border-box'
  }

  if (view === 'create' && isAdmin) return (
    <div style={{maxWidth:500,margin:'0 auto'}}>
      <button onClick={() => { setView('main'); setError('') }}
        style={{background:'transparent',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:14,marginBottom:20,padding:0}}>
        ← Torna indietro
      </button>
      <h3 style={{color:'#e8f0fe',marginTop:0}}>Nuova finestra investimenti</h3>
      {error && <div style={{background:'#3a1a1a',border:'1px solid #a32d2d',borderRadius:8,padding:'10px 14px',color:'#f09595',fontSize:14,marginBottom:16}}>{error}</div>}
      <div style={{display:'grid',gap:14}}>
        <div>
          <label style={{color:'#7a8fa6',fontSize:13,display:'block',marginBottom:6}}>Nome finestra</label>
          <input value={newWindow.name} onChange={e => setNewWindow({...newWindow, name: e.target.value})}
            placeholder="Es. Investimenti post-asta invernale" style={inputStyle} />
        </div>
        <div>
          <label style={{color:'#7a8fa6',fontSize:13,display:'block',marginBottom:6}}>Max investimenti per squadra</label>
          <input type="number" min="1" max="10" value={newWindow.max_investments}
            onChange={e => setNewWindow({...newWindow, max_investments: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={{color:'#7a8fa6',fontSize:13,display:'block',marginBottom:6}}>Scadenza</label>
          <input type="datetime-local" value={newWindow.deadline}
            onChange={e => setNewWindow({...newWindow, deadline: e.target.value})} style={inputStyle} />
        </div>
        <button onClick={createWindow}
          style={{background:'#2563eb',border:'none',borderRadius:8,padding:'12px',color:'white',fontSize:15,fontWeight:600,cursor:'pointer'}}>
          Apri finestra investimenti
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {success && <div style={{background:'#0f2a1a',border:'1px solid #3B6D11',borderRadius:8,padding:'10px 14px',color:'#C0DD97',fontSize:14,marginBottom:16}}>{success}</div>}
      {error && <div style={{background:'#3a1a1a',border:'1px solid #a32d2d',borderRadius:8,padding:'10px 14px',color:'#f09595',fontSize:14,marginBottom:16}}>{error}</div>}

      {activeWindow ? (
        <div>
          <div style={{background:'#0f2a1a',border:'1px solid #3B6D11',borderRadius:12,padding:'1.25rem',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{color:'#C0DD97',fontWeight:600,fontSize:16}}>🟢 {activeWindow.name}</div>
              <div style={{color:'#7a8fa6',fontSize:13,marginTop:4}}>
                Scadenza: {new Date(activeWindow.deadline).toLocaleString('it-IT')} •
                Max {activeWindow.max_investments_per_team} investimenti per squadra •
                Tuoi: {investmentsDone}/{activeWindow.max_investments_per_team}
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => closeWindow(activeWindow.id)}
                style={{background:'#3a1a1a',border:'1px solid #a32d2d',borderRadius:8,padding:'8px 16px',color:'#f09595',cursor:'pointer',fontSize:13}}>
                Chiudi finestra
              </button>
            )}
          </div>

          {investmentsDone < activeWindow.max_investments_per_team ? (
            <>
              <h3 style={{color:'#e8f0fe',marginBottom:16}}>
                Giocatori disponibili per investimento
                <span style={{color:'#7a8fa6',fontSize:14,fontWeight:400,marginLeft:8}}>
                  ({mySquad.length} giocatori)
                </span>
              </h3>
              {mySquad.length === 0 ? (
                <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'2rem',textAlign:'center'}}>
                  <p style={{color:'#7a8fa6'}}>Nessun giocatore disponibile per investimento</p>
                </div>
              ) : (
                <div style={{display:'grid',gap:10}}>
                  {mySquad.map(sp => {
                    const cost = calcInvestmentCost(sp.last_paid)
                    const nextAfterInv = calcNextRenewal(sp.last_paid - cost)
                    return (
                      <div key={sp.id} style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:10,padding:'1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div>
                          <div style={{color:'#e8f0fe',fontWeight:500}}>{sp.players?.name}</div>
                          <div style={{color:'#7a8fa6',fontSize:13,marginTop:4}}>
                            Ultimo pag.: <strong style={{color:'#e8f0fe'}}>{sp.last_paid} cr.</strong> →
                            Prossimo rinnovo senza inv.: <strong style={{color:'#f09595'}}>{calcNextRenewal(sp.last_paid)} cr.</strong> →
                            Con inv.: <strong style={{color:'#C0DD97'}}>{nextAfterInv} cr.</strong>
                          </div>
                        </div>
                        <button onClick={() => makeInvestment(sp)}
                          style={{background:'#2563eb',border:'none',borderRadius:8,padding:'8px 18px',color:'white',fontSize:14,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',marginLeft:16}}>
                          Investi {cost} cr.
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'2rem',textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <p style={{color:'#C0DD97',fontWeight:600}}>Hai usato tutti i tuoi investimenti disponibili</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'3rem',textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:32,marginBottom:12}}>💰</div>
          <p style={{color:'#7a8fa6',marginBottom:0}}>Nessuna finestra investimenti aperta al momento</p>
        </div>
      )}

      {isAdmin && (
        <div style={{marginTop:24}}>
          <h3 style={{color:'#e8f0fe',marginBottom:16}}>Gestione finestre</h3>
          <button onClick={() => { setView('create'); setError('') }}
            style={{background:'#1a2535',border:'1px solid #2563eb',borderRadius:10,padding:'1rem 1.5rem',color:'#60a5fa',cursor:'pointer',fontSize:14,marginBottom:16}}>
            ➕ Apri nuova finestra investimenti
          </button>
          {windows.length > 0 && (
            <div style={{display:'grid',gap:8}}>
              {windows.map(w => (
                <div key={w.id} style={{background:'#1a2535',border:`1px solid ${w.is_open ? '#3B6D11' : '#2a3a50'}`,borderRadius:8,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <span style={{color: w.is_open ? '#C0DD97' : '#7a8fa6',fontWeight:500}}>{w.name}</span>
                    <span style={{color:'#7a8fa6',fontSize:12,marginLeft:12}}>Max {w.max_investments_per_team} inv. • Scadenza: {new Date(w.deadline).toLocaleString('it-IT')}</span>
                  </div>
                  <span style={{background: w.is_open ? '#0f2a1a' : '#1a2535',color: w.is_open ? '#C0DD97' : '#7a8fa6',fontSize:11,padding:'2px 10px',borderRadius:20,border:`1px solid ${w.is_open ? '#3B6D11' : '#2a3a50'}`}}>
                    {w.is_open ? 'Aperta' : 'Chiusa'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
