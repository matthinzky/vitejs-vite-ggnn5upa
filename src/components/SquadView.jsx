import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function calcNextRenewal(lastPaid) {
  return Math.ceil(lastPaid * 1.2)
}

function calcInvestmentCost(lastPaid) {
  return calcNextRenewal(lastPaid) - lastPaid
}

export default function SquadView({ league, user, isAdmin, onRefresh }) {
  const [squadsByUser, setSquadsByUser] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState(user.id)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSquads() }, [])

  const fetchSquads = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('squad_players')
      .select('*, players(*)')
      .eq('league_id', league.id)

    const grouped = {}
    league.members.forEach(m => { grouped[m.user_id] = { member: m, players: [] } })
    ;(data || []).forEach(sp => {
      if (grouped[sp.user_id]) grouped[sp.user_id].players.push(sp)
    })
    setSquadsByUser(grouped)
    setLoading(false)
  }

  const roleOrder = ['Por','Dd','Ds','Dc','M','C','T','W','A','Pc','P','?']
  const roleColors = {
    Por:'#1e3a5f', Dd:'#1a3a2a', Ds:'#1a3a2a', Dc:'#1a3a2a',
    M:'#3a2a1a', C:'#3a2a1a', T:'#3a2a1a', W:'#2a1a3a',
    A:'#3a1a1a', Pc:'#3a1a1a', P:'#3a1a1a', '?':'#2a2a2a'
  }

  const currentData = squadsByUser[selectedUserId]
  const sortedPlayers = (currentData?.players || []).sort((a, b) => {
    const ra = roleOrder.indexOf(a.players?.role)
    const rb = roleOrder.indexOf(b.players?.role)
    return ra - rb
  })

  const startEdit = (sp) => {
    setEditingPlayer(sp.id)
    setEditValues({
      last_paid: sp.last_paid,
      purchase_price: sp.purchase_price,
      has_investment: sp.has_investment,
      investment_count: sp.investment_count || 0,
    })
  }

  const saveEdit = async () => {
    setSaving(true)
    const newLastPaid = parseInt(editValues.last_paid)
    await supabase.from('squad_players').update({
      last_paid: newLastPaid,
      purchase_price: parseInt(editValues.purchase_price),
      has_investment: editValues.has_investment,
      investment_count: parseInt(editValues.investment_count),
      investment_cost: editValues.has_investment ? calcInvestmentCost(newLastPaid) : 0,
      phantom_price: editValues.has_investment ? newLastPaid - calcInvestmentCost(newLastPaid) : null,
    }).eq('id', editingPlayer)
    setEditingPlayer(null)
    setSaving(false)
    fetchSquads()
  }

  if (loading) return <div style={{color:'#7a8fa6',textAlign:'center',padding:'3rem'}}>Caricamento rose...</div>

  return (
    <div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
        {league.members.map(m => (
          <button key={m.user_id} onClick={() => setSelectedUserId(m.user_id)}
            style={{background: selectedUserId===m.user_id ? '#2563eb' : '#1a2535',border:`1px solid ${selectedUserId===m.user_id ? '#2563eb' : '#2a3a50'}`,borderRadius:8,padding:'6px 14px',color:'#e8f0fe',cursor:'pointer',fontSize:13,fontWeight: selectedUserId===m.user_id ? 600 : 400}}>
            {m.team_name || m.name || 'Senza nome'}
          </button>
        ))}
      </div>

      {currentData && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
            <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:10,padding:'1rem'}}>
              <div style={{color:'#7a8fa6',fontSize:12}}>Crediti disponibili</div>
              <div style={{color:'#60a5fa',fontWeight:700,fontSize:20,marginTop:4}}>{currentData.member.credits ?? 500} cr.</div>
            </div>
            <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:10,padding:'1rem'}}>
              <div style={{color:'#7a8fa6',fontSize:12}}>Giocatori in rosa</div>
              <div style={{color:'#e8f0fe',fontWeight:700,fontSize:20,marginTop:4}}>{currentData.players.length}</div>
            </div>
            <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:10,padding:'1rem'}}>
              <div style={{color:'#7a8fa6',fontSize:12}}>Costo rinnovi totale</div>
              <div style={{color:'#C0DD97',fontWeight:700,fontSize:20,marginTop:4}}>
                {currentData.players.reduce((sum, sp) => {
                  const base = sp.has_investment && sp.phantom_price ? sp.phantom_price : sp.last_paid
                  return sum + calcNextRenewal(base)
                }, 0)} cr.
              </div>
            </div>
          </div>

          {currentData.players.length === 0 ? (
            <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'3rem',textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:8}}>👥</div>
              <p style={{color:'#7a8fa6'}}>Nessun giocatore in rosa</p>
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #2a3a50'}}>
                    {['Ruolo','Giocatore','Ultimo pag.','Prox. rinnovo','Investimento','Stato',isAdmin?'Admin':''].filter(Boolean).map(h => (
                      <th key={h} style={{color:'#7a8fa6',fontWeight:500,padding:'8px 12px',textAlign:'left',fontSize:12}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map(sp => {
                    const isInvested = sp.has_investment
                    const basePrice = isInvested && sp.phantom_price ? sp.phantom_price : sp.last_paid
                    const nextRenewal = calcNextRenewal(basePrice)
                    const investCost = calcInvestmentCost(sp.last_paid)
                    const isEditing = editingPlayer === sp.id

                    return (
                      <tr key={sp.id}
                        style={{borderBottom:'1px solid #1a2535', background: isInvested ? 'rgba(234,179,8,0.08)' : 'transparent'}}>
                        <td style={{padding:'10px 12px'}}>
                          <span style={{background: roleColors[sp.players?.role] || '#2a2a2a',color:'#e8f0fe',fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600}}>
                            {sp.players?.role || '?'}
                          </span>
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            {isInvested && <span style={{fontSize:10,background:'#78350f',color:'#fbbf24',padding:'1px 6px',borderRadius:4}}>INV</span>}
                            <span style={{color:'#e8f0fe',fontWeight:500}}>{sp.players?.name}</span>
                          </div>
                        </td>

                        {isEditing ? (
                          <>
                            <td style={{padding:'6px 12px'}}>
                              <input type="number" value={editValues.last_paid}
                                onChange={e => setEditValues({...editValues, last_paid: e.target.value})}
                                style={{width:70,background:'#0f1923',border:'1px solid #2563eb',borderRadius:4,padding:'4px 8px',color:'#e8f0fe',fontSize:13}} />
                            </td>
                            <td style={{padding:'6px 12px',color:'#C0DD97'}}>{calcNextRenewal(parseInt(editValues.last_paid)||0)} cr.</td>
                            <td style={{padding:'6px 12px'}}>
                              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                                <input type="checkbox" checked={editValues.has_investment}
                                  onChange={e => setEditValues({...editValues, has_investment: e.target.checked})}/>
                                <span style={{color:'#7a8fa6',fontSize:12}}>Investito</span>
                              </label>
                            </td>
                            <td style={{padding:'6px 12px'}}>
                              <div style={{display:'flex',gap:6}}>
                                <button onClick={saveEdit} disabled={saving}
                                  style={{background:'#2563eb',border:'none',borderRadius:4,padding:'4px 10px',color:'white',fontSize:12,cursor:'pointer'}}>
                                  {saving ? '...' : '✓'}
                                </button>
                                <button onClick={() => setEditingPlayer(null)}
                                  style={{background:'transparent',border:'1px solid #2a3a50',borderRadius:4,padding:'4px 10px',color:'#7a8fa6',fontSize:12,cursor:'pointer'}}>
                                  ✕
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{padding:'10px 12px',color:'#e8f0fe'}}>{sp.last_paid} cr.</td>
                            <td style={{padding:'10px 12px',color:'#C0DD97',fontWeight:600}}>{nextRenewal} cr.</td>
                            <td style={{padding:'10px 12px'}}>
                              {isInvested ? (
                                <span style={{color:'#fbbf24',fontSize:12}}>✓ Fatto ({investCost} cr.)</span>
                              ) : sp.last_paid > 1 ? (
                                <span style={{color:'#7a8fa6',fontSize:12}}>{investCost} cr.</span>
                              ) : (
                                <span style={{color:'#3a3a4a',fontSize:12}}>—</span>
                              )}
                            </td>
                            <td style={{padding:'10px 12px'}}>
                              {isInvested ? (
                                <span style={{background:'#78350f',color:'#fbbf24',fontSize:11,padding:'2px 8px',borderRadius:4}}>Investito</span>
                              ) : (
                                <span style={{background:'#1a2535',color:'#7a8fa6',fontSize:11,padding:'2px 8px',borderRadius:4}}>Standard</span>
                              )}
                            </td>
                            {isAdmin && (
                              <td style={{padding:'10px 12px'}}>
                                <button onClick={() => startEdit(sp)}
                                  style={{background:'transparent',border:'1px solid #2a3a50',borderRadius:4,padding:'4px 10px',color:'#7a8fa6',cursor:'pointer',fontSize:12}}>
                                  ✏️
                                </button>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}