import { useState } from 'react'
import { supabase } from '../supabase'
import SquadView from './SquadView'

export default function LeagueDashboard({ league, user, onBack, onUpdate }) {
  const member = league.members?.find(m => m.user_id === user.id)
  const isAdmin = member?.is_admin
  const [view, setView] = useState('home')
  const [teamName, setTeamName] = useState(member?.team_name || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const saveTeamName = async () => {
    setSaving(true)
    await supabase.from('league_members')
      .update({ team_name: teamName })
      .eq('league_id', league.id).eq('user_id', user.id)
    setSaving(false)
    setSuccess('Nome squadra salvato!')
    setTimeout(() => setSuccess(''), 2000)
    onUpdate()
  }

  const generateCode = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    await supabase.from('leagues').update({ invite_code: code }).eq('id', league.id)
    onUpdate()
  }

  const copyCode = () => {
    navigator.clipboard.writeText(league.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const promoteAdmin = async (userId) => {
    await supabase.from('league_members')
      .update({ is_admin: true })
      .eq('league_id', league.id).eq('user_id', userId)
    onUpdate()
  }

  const tabs = [
    {id:'home', label:'Home', icon:'🏠'},
    {id:'squads', label:'Rose', icon:'👥'},
    {id:'members', label:'Partecipanti', icon:'🏆'},
    {id:'team', label:'La mia squadra', icon:'⚽'},
    ...(isAdmin ? [{id:'admin', label:'Admin', icon:'⚙️'}] : [])
  ]

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>
      <button onClick={onBack} style={{background:'transparent',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:14,marginBottom:20,padding:0}}>
        ← Torna alle leghe
      </button>

      <div style={{marginBottom:24}}>
        <h2 style={{color:'#e8f0fe',margin:0}}>{league.name}</h2>
        <p style={{color:'#7a8fa6',fontSize:14,margin:'4px 0 0'}}>
          {league.members?.length} partecipanti
          {isAdmin && <span style={{marginLeft:10,background:'#1e3a5f',color:'#60a5fa',fontSize:11,padding:'2px 8px',borderRadius:20}}>Admin</span>}
        </p>
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:24}}>
        {tabs.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            style={{background: view===item.id ? '#1e3a5f' : '#1a2535',border:`1px solid ${view===item.id ? '#2563eb' : '#2a3a50'}`,borderRadius:10,padding:'8px 16px',color:'#e8f0fe',cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:14,fontWeight: view===item.id ? 600 : 400}}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {view === 'home' && (
        <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'1.5rem'}}>
          <h3 style={{color:'#e8f0fe',marginTop:0}}>Benvenuto in {league.name}</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:16}}>
            <div style={{background:'#0f1923',borderRadius:8,padding:'1rem'}}>
              <div style={{color:'#7a8fa6',fontSize:13}}>La tua squadra</div>
              <div style={{color:'#e8f0fe',fontWeight:600,fontSize:16,marginTop:4}}>{member?.team_name || '—'}</div>
            </div>
            <div style={{background:'#0f1923',borderRadius:8,padding:'1rem'}}>
              <div style={{color:'#7a8fa6',fontSize:13}}>I tuoi crediti</div>
              <div style={{color:'#60a5fa',fontWeight:600,fontSize:16,marginTop:4}}>{member?.credits ?? 500} cr.</div>
            </div>
          </div>
        </div>
      )}

      {view === 'squads' && (
        <SquadView league={league} user={user} isAdmin={isAdmin} onRefresh={onUpdate} />
      )}

      {view === 'members' && (
        <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'1.5rem'}}>
          <h3 style={{color:'#e8f0fe',marginTop:0}}>Partecipanti</h3>
          {league.members?.map(m => (
            <div key={m.user_id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #2a3a50'}}>
              <div>
                <div style={{color:'#e8f0fe',fontWeight:500}}>{m.name || m.user_id}</div>
                <div style={{color:'#7a8fa6',fontSize:13}}>{m.team_name || 'Squadra non impostata'}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:'#60a5fa',fontSize:14}}>{m.credits ?? 500} cr.</span>
                {m.is_admin && <span style={{background:'#1e3a5f',color:'#60a5fa',fontSize:11,padding:'2px 8px',borderRadius:20}}>Admin</span>}
                {isAdmin && !m.is_admin && (
                  <button onClick={() => promoteAdmin(m.user_id)}
                    style={{background:'transparent',border:'1px solid #2a3a50',borderRadius:6,padding:'4px 10px',color:'#7a8fa6',cursor:'pointer',fontSize:12}}>
                    Promuovi admin
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'team' && (
        <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'1.5rem'}}>
          <h3 style={{color:'#e8f0fe',marginTop:0}}>La mia squadra</h3>
          {success && <div style={{background:'#0f2a1a',border:'1px solid #3B6D11',borderRadius:8,padding:'10px 14px',color:'#C0DD97',fontSize:14,marginBottom:16}}>{success}</div>}
          <label style={{color:'#7a8fa6',fontSize:13,display:'block',marginBottom:6}}>Nome squadra</label>
          <input value={teamName} onChange={e => setTeamName(e.target.value)}
            placeholder="Es. AC Ciughina"
            style={{width:'100%',background:'#0f1923',border:'1px solid #2a3a50',borderRadius:8,padding:'10px 14px',color:'#e8f0fe',fontSize:15,boxSizing:'border-box',marginBottom:16}} />
          <button onClick={saveTeamName} disabled={saving}
            style={{background:'#2563eb',border:'none',borderRadius:8,padding:'10px 24px',color:'white',fontSize:15,fontWeight:600,cursor:'pointer'}}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      )}

      {view === 'admin' && isAdmin && (
        <div style={{display:'grid',gap:16}}>
          <div style={{background:'#1a2535',border:'1px solid #2a3a50',borderRadius:12,padding:'1.5rem'}}>
            <h3 style={{color:'#e8f0fe',marginTop:0}}>Codice invito</h3>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{background:'#0f1923',borderRadius:8,padding:'10px 20px',fontSize:22,fontWeight:700,color:'#60a5fa',letterSpacing:6}}>
                {league.invite_code}
              </div>
              <button onClick={copyCode}
                style={{background:'transparent',border:'1px solid #2a3a50',borderRadius:8,padding:'10px 16px',color: copied ? '#C0DD97' : '#7a8fa6',cursor:'pointer',fontSize:14}}>
                {copied ? '✓ Copiato' : 'Copia'}
              </button>
            </div>
            <button onClick={generateCode}
              style={{background:'transparent',border:'1px solid #2563eb',borderRadius:8,padding:'8px 16px',color:'#60a5fa',cursor:'pointer',fontSize:14}}>
              Genera nuovo codice
            </button>
          </div>
        </div>
      )}
    </div>
  )
}