"use client";

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { LuAward, LuMedal, LuTrophy, LuLoader } from 'react-icons/lu';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (data.success) {
          setLeaderboardData(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);
  return (
    <div className="container">
      <Navigation />
      
      <main style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
            marginBottom: '1rem', boxShadow: '0 0 30px rgba(245, 158, 11, 0.3)'
          }}>
            <LuTrophy size={40} color="#000" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Civic Leaderboard</h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '1.125rem', maxWidth: '500px', margin: '0 auto' }}>
            Earn points by reporting verified issues and upvoting hazards in your community.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '50px 2fr 1fr 1fr', padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--foreground-muted)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase' }}>
            <div>Rank</div>
            <div>Citizen</div>
            <div>Badge</div>
            <div style={{ textAlign: 'right' }}>Points</div>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
              <LuLoader className="spin" size={24} style={{ marginBottom: '1rem' }} />
              <p>Loading ranking data...</p>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
              No citizens found on the leaderboard yet.
            </div>
          ) : (
            leaderboardData.map((user, index) => (
              <div key={user.id} style={{ 
                display: 'grid', gridTemplateColumns: '50px 2fr 1fr 1fr', 
                padding: '1rem', 
                alignItems: 'center',
                background: index === 0 ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                borderRadius: '8px',
                border: index === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {index === 0 ? <LuTrophy color="#fbbf24" size={24} /> : 
                   index === 1 ? <LuMedal color="#94a3b8" size={24} /> : 
                   index === 2 ? <LuMedal color="#b45309" size={24} /> : 
                   <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground-muted)', paddingLeft: '8px' }}>{index + 1}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{user.username}</span>
                  <span style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>Level {Math.floor(user.reputationPoints / 100) + 1}</span>
                </div>
                <div>
                  <span style={{ 
                    background: 'var(--glass-border)', padding: '0.25rem 0.75rem', 
                    borderRadius: '999px', fontSize: '0.75rem', fontWeight: 500,
                    color: index === 0 ? '#fbbf24' : 'var(--primary)'
                  }}>
                    {user.badges?.[0] || 'Citizen'}
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.25rem', color: index === 0 ? '#fbbf24' : '#fff' }}>
                  {user.reputationPoints}
                </div>
              </div>
            ))
          )}

        </div>
      </main>
    </div>
  );
}
