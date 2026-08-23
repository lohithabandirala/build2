"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navigation from '@/components/Navigation';
import { LuLayoutDashboard, LuMap, LuList, LuCheckCircle, LuClock, LuAlertTriangle, LuActivity, LuZap } from 'react-icons/lu';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function Dashboard() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [view, setView] = useState('analytics');
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      const res = await fetch('/api/feedback');
      const json = await res.json();
      if (json.success) {
        setFeedback(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch feedback", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
    const interval = setInterval(fetchFeedback, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateIssue = async (id: string, action: string, payload: any) => {
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, ...payload })
    });
    fetchFeedback();
  };

  const total = feedback.length;
  const pending = feedback.filter(f => f.status === 'Open' || f.status === 'Pending').length;
  const resolved = feedback.filter(f => f.status === 'Resolved' || f.status === 'Closed').length;
  const fake = feedback.filter(f => f.isFake === 1).length;

  const categoryCount = feedback.reduce((acc, curr) => {
    const cat = curr.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as any);
  const pieData = Object.keys(categoryCount).map(key => ({ name: key, value: categoryCount[key] }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  return (
    <div className="container">
      <Navigation />
      
      <main style={{ padding: '2rem 0', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Policymaker Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem' }}>
              Real-time analytics and AI-driven recommendations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
          <button 
            onClick={() => setView('analytics')}
            className={`glass-button ${view === 'analytics' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: view === 'analytics' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
          >
            <LuActivity size={18} /> Analytics
          </button>
          <button 
            onClick={() => setView('map')}
            className={`glass-button ${view === 'map' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: view === 'map' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
          >
            <LuMap size={18} /> Map View
          </button>
          <button 
            onClick={() => setView('list')}
            className={`glass-button ${view === 'list' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: view === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
          >
            <LuList size={18} /> Admin List View
          </button>
        </div>

        {view === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)' }}><LuLayoutDashboard /> Total Issues</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{total}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}><LuClock /> Pending</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{pending}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}><LuCheckCircle /> Resolved</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{resolved}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}><LuAlertTriangle /> Fake Reports</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>{fake}</div>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="glass-panel" style={{ padding: '2rem', height: '400px' }}>
                <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Issues by Category</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-panel" style={{ padding: '2rem', height: '400px' }}>
                <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Issue Volume</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pieData}>
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {view === 'map' && (
          <div className="glass-panel" style={{ padding: '1.5rem', height: '600px' }}>
            <MapComponent feedbackData={feedback} />
          </div>
        )}

        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {feedback.map((item) => (
              <div key={item.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, width: 'fit-content' }}>
                      {item.category}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>ID: {item.id}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <select 
                      value={item.status} 
                      onChange={(e) => updateIssue(item.id, 'update_status', { status: e.target.value })}
                      style={{ background: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}
                    >
                      <option value="Open">Open</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    {item.isFake === 1 && <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>FAKE</span>}
                  </div>
                </div>

                <p style={{ marginTop: '1rem' }}>{item.text}</p>
                
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>Admin Controls</h4>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.875rem' }}>Assign Team:</label>
                    <select 
                      value={item.assignedTeam || ''} 
                      onChange={(e) => updateIssue(item.id, 'assign_team', { team: e.target.value })}
                      style={{ background: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}
                    >
                      <option value="">Unassigned</option>
                      <option value="team-sanitation">Sanitation Team</option>
                      <option value="team-roads">Roads Dept</option>
                      <option value="team-water">Water Board</option>
                      <option value="team-elec">Electrical Dept</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
