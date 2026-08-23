"use client";

import Navigation from '@/components/Navigation';
import { useEffect, useState } from 'react';
import { LuThumbsUp, LuMapPin, LuClock } from 'react-icons/lu';

export default function CommunityFeed() {
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeed = async () => {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.success) {
        setFeed(data.data);
      }
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpvote = async (id: string) => {
    // Optimistic update
    setFeed(prev => prev.map(item => item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item));
    
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'upvote' })
    });
  };

  return (
    <div className="container">
      <Navigation />
      
      <main style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Community Feed</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem' }}>
            See what others are reporting in your city and upvote critical issues.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {feed.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
              No issues reported yet. Be the first to report an issue!
            </div>
          ) : (
            feed.map((issue) => (
              <div key={issue.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ 
                      background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', 
                      borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                      color: issue.ai_analysis?.urgency_score > 7 ? 'var(--accent)' : 'var(--primary)'
                    }}>
                      {issue.ai_analysis?.category || issue.category}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.75rem', lineHeight: 1.4 }}>
                      {issue.ai_analysis?.summary || issue.text}
                    </h3>
                  </div>
                  
                  {/* Upvote Button */}
                  <button 
                    onClick={() => handleUpvote(issue.id)}
                    className="glass-button hover-scale" 
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <LuThumbsUp size={20} style={{ marginBottom: '0.25rem' }} />
                    <span style={{ fontWeight: 700 }}>{issue.upvotes || 0}</span>
                  </button>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  "{issue.text}"
                </p>

                {issue.imageUrl && (
                  <img src={issue.imageUrl} alt="Issue" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--glass-border)' }} />
                )}

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LuMapPin /> 
                    {issue.location ? `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}` : 'Location unknown'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LuClock /> 
                    {new Date(issue.createdAt).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
                    Status: {issue.status}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
