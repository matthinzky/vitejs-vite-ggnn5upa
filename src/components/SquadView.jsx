import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function calcNextRenewal(lastPaid) {
  return Math.ceil(lastPaid * 1.2)
}

function calcInvestment(lastPaid) {
  return calcNextRenewal(lastPaid) - lastPaid
}

function calcPhantomPrice(lastPaid) {
  return lastPaid - calcInvestment(lastPaid)
}

export default function SquadView({ league, user, isAdmin }) {
  const [squadsByUser, setSquadsByUser] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState(user.id)

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

  const roleOrder = ['Por','Dd','Ds','Dc','M','C','T','W','A','Pc','P']
  const roleColors = {
    Por:'#1e3a5f', Dd:'#1a3a2a', Ds:'#1a3a2a', Dc:'#1a3a2a',
    M:'#3a2a1a', C:'#3a2a1a', T:'#3a2a1a', W:'#2a1a3a',
    A:'#3a1a1a', Pc:'#3a1a1a', P:'#3a1a1a'
  }

  const currentData = squadsByUser[selectedUserId]
  const sortedPlayers = (currentData?.players || []).sort((a, b) => {
    const ra = roleOrder.indexOf(a.players?.role)
    const rb = roleOrder.indexOf(b.players?.role)
    return ra - rb
  })

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
                {currentData.players.reduce((sum, sp) => sum + calcNextRenewal(sp.last_paid), 0)} cr.
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
                  <tr style={{borderBottom:'1px solid #2a3a50'}}>
                    {['Ruolo','Giocatore','Squadra','Ultimo pag.','Prox. rinnovo','Investimento','Stato'].map(h => (
                      <th key={h} style={{color:'#7a8fa6',fontWeight:500,padding:'8px 12px',textAlign:'left',fontSize:12}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map(sp => {
                    const nextRenewal = calcNextRenewal(sp.last_paid)
                    const investment = calcInvestment(sp.last_paid)
                    return (
                      <tr key={sp.id} style={{borderBottom:'1px solid #1a2535'}}>
                        <td style={{padding:'10px 12px'}}>
                          <span style={{background: roleColors[sp.players?.role] || '#1a2535',color:'#e8f0fe',fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600}}>
                            {sp.players?.role}
                          </span>
                        </td>
                        <td style={{padding:'10px 12px',color:'#e8f0fe',fontWeight:500}}>
                          {sp.shirt_number && <span style={{color:'#7a8fa6',fontSize:12,marginRight:6}}>#{sp.shirt_number}</span>}
                          {sp.players?.name}
                        </td>
                        <td style={{padding:'10px 12px',color:'#7a8fa6'}}>{sp.players?.real_team}</td>
                        <td style={{padding:'10px 12px',color:'#e8f0fe'}}>{sp.last_paid} cr.</td>
                        <td style={{padding:'10px 12px',color:'#C0DD97',fontWeight:600}}>{nextRenewal} cr.</td>
                        <td style={{padding:'10px 12px'}}>
                          {sp.has_investment ? (
                            <span style={{color:'#60a5fa',fontSize:12}}>✓ Fatto ({investment} cr.)</span>
                          ) : sp.last_paid > 1 ? (
                            <span style={{color:'#7a8fa6',fontSize:12}}>{investment} cr.</span>
                          ) : (
                            <span style={{color:'#3a3a4a',fontSize:12}}>—</span>
                          )}
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          {sp.has_investment ? (
                            <span style={{background:'#1e3a5f',color:'#60a5fa',fontSize:11,padding:'2px 8px',borderRadius:4}}>Investito</span>
                          ) : (
                            <span style={{background:'#1a2535',color:'#7a8fa6',fontSize:11,padding:'2px 8px',borderRadius:4}}>Standard</span>
                          )}
                        </td>
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