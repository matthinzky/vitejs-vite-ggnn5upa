import { useState } from 'react'
import LeagueSelection from './LeagueSelection'

export default function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('leagues')

  return (
    <div style={{minHeight:'100vh',background:'#0f1923',color:'#e8f0fe'}}>
      <div style={{background:'#1a2535',borderBottom:'1px solid #2a3a50',padding:'0 2rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>⚽</span>
          <span style={{fontWeight:700,fontSize:18,color:'#e8f0fe'}}>SuperFantaLeague</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{color:'#7a8fa6',fontSize:14}}>Ciao, <strong style={{color:'#e8f0fe'}}>{user.name}</strong></span>
          <button
            onClick={onLogout}
            style={{background:'transparent',border:'1px solid #2a3a50',borderRadius:8,padding:'6px 14px',color:'#7a8fa6',cursor:'pointer',fontSize:13}}
          >
            Esci
          </button>
        </div>
      </div>

      <div style={{padding:'2rem'}}>
        <LeagueSelection user={user} />
      </div>
    </div>
  )
}