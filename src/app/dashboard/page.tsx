"use client";

import Navigation from '@/components/Navigation';
import { LuTrendingUp, LuTriangleAlert, LuMap, LuZap, LuCircleCheck, LuClock } from 'react-icons/lu';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function Dashboard() {
  const [feedbackData, setFeedbackData] = useState<any[]>([]);

  useEffect(() => {
    // Fetch live feedback from our in-memory database
    const fetchData = async () => {
      try {
        const res = await fetch('/api/feedback');
        const json = await res.json();
        if (json.success) {
          setFeedbackData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch feedback", err);
      }
    };
    
    fetchData();
    // In a real app, you might poll this every 5 seconds or use WebSockets
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

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
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem' }}>
            <select style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}>
              <option value="all">All States</option>
              <option value="haryana">Haryana</option>
              <option value="maharashtra">Maharashtra</option>
            </select>
            <div style={{ width: '1px', background: 'var(--glass-border)' }} />
            <select style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none' }}>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Stats Row */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          <StatCard title="Total Requests" value={(12482 + feedbackData.length).toLocaleString()} trend="+14%" icon={<LuTrendingUp />} color="var(--primary)" />
          <StatCard title="High Urgency" value={(842 + feedbackData.filter(d => d.ai_analysis?.urgency_score > 7).length).toLocaleString()} trend="+2%" icon={<LuTriangleAlert />} color="var(--accent)" />
          <StatCard title="Resolved" value="8,912" trend="+24%" icon={<LuCircleCheck />} color="var(--secondary)" />
          <StatCard title="Avg. Resolution" value="3.4 Days" trend="-1.2 Days" icon={<LuClock />} color="#eab308" />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', minHeight: '400px' }}>
          {/* Geospatial Map */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <LuMap /> Demand Hotspots
            </div>
            <div style={{ flex: 1, borderRadius: '12px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
               <MapComponent feedbackData={feedbackData} />
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(24, 24, 27, 0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary)' }}>
              <LuZap fill="var(--primary)" /> Gemini Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              
              {feedbackData.slice(0, 2).map((feedback) => (
                <RecommendationCard 
                  key={feedback.id}
                  title={`Live Issue: ${feedback.ai_analysis?.category || feedback.category}`} 
                  desc={feedback.ai_analysis?.summary || feedback.text}
                  impact={feedback.ai_analysis?.urgency_score > 7 ? 'Critical' : 'Medium'}
                />
              ))}

              <RecommendationCard 
                title="Water Infrastructure Gap" 
                desc="High clustering of complaints (1,200+) in District Pune regarding dry borewells. Recommend expediting the 'Jal Jeevan' pipeline extension."
                impact="High"
              />
              <RecommendationCard 
                title="Road Repair Hotspot" 
                desc="842 visual reports of severe potholes on SH-14. Immediate patching recommended to prevent accidents."
                impact="Critical"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ title, value, trend, icon, color }: any) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{title}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.875rem', color: trend.startsWith('+') ? 'var(--primary)' : 'var(--accent)' }}>
        {trend} from last month
      </div>
    </div>
  );
}

function RecommendationCard({ title, desc, impact }: any) {
  const getImpactColor = () => {
    if (impact === 'Critical') return 'var(--accent)';
    if (impact === 'High') return '#eab308';
    return 'var(--secondary)';
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</h4>
        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', color: getImpactColor() }}>
          {impact}
        </span>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
        {desc}
      </p>
    </div>
  );
}
