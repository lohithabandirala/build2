"use client";

import Navigation from '@/components/Navigation';
import { useEffect, useState } from 'react';
import { LuThumbsUp, LuMapPin, LuClock, LuCheckCircle2, LuMessageSquare, LuSend } from 'react-icons/lu';

export default function CommunityFeed() {
  const [feed, setFeed] = useState<any[]>([]);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [voteType, setVoteType] = useState('Verified');

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
    setFeed(prev => prev.map(item => item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item));
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'upvote' })
    });
  };

  const handleVerifySubmit = async (id: string) => {
    if (!comment) return;
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'community_vote', comment, voteType })
    });
    setVerifyId(null);
    setComment('');
    // Wait for the next poll to update UI, or do optimistic update
  };

  const handleConfirmResolution = async (id: string) => {
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'confirm_resolution', isResolved: true, feedback: 'Looks good' })
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

                {issue.isFake === 1 && (
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.875rem' }}>
                    <strong>⚠️ Flagged by AI:</strong> {issue.fakeReason}
                  </div>
                )}

                {issue.communityVotes && issue.communityVotes.length > 0 && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Community Verification</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {issue.communityVotes.map((vote: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                          <span style={{ fontWeight: 600, color: vote.vote === 'Verified' || vote.vote === 'Confirmed Resolved' ? '#10b981' : '#f43f5e' }}>[{vote.vote}]</span> {vote.comment} — <em>{vote.username}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {issue.status === 'Resolved' && (
                  <div style={{ marginTop: '1rem', background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <p style={{ fontSize: '0.875rem', color: '#10b981', marginBottom: '0.5rem', fontWeight: 600 }}>Admin marked this as resolved. Did they fix it?</p>
                    <button 
                      onClick={() => handleConfirmResolution(issue.id)}
                      className="glass-button hover-scale"
                      style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Confirm Resolution
                    </button>
                  </div>
                )}

                {verifyId !== issue.id && issue.status !== 'Closed' && issue.status !== 'Resolved' && (
                  <button 
                    onClick={() => setVerifyId(issue.id)}
                    style={{ marginTop: '1rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', fontSize: '0.875rem' }}
                  >
                    <LuMessageSquare /> Add Verification
                  </button>
                )}

                {verifyId === issue.id && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <select value={voteType} onChange={(e) => setVoteType(e.target.value)} style={{ background: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '4px' }}>
                        <option value="Verified">Verified</option>
                        <option value="Fake">Fake</option>
                      </select>
                      <input 
                        type="text" 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)} 
                        placeholder="Add a comment or proof link..." 
                        style={{ flex: 1, background: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setVerifyId(null)} style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => handleVerifySubmit(issue.id)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LuSend size={14} /> Submit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
