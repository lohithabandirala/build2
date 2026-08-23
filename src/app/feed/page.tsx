"use client";

import Navigation from '@/components/Navigation';
import { useEffect, useState } from 'react';
import { LuThumbsUp, LuMapPin, LuClock, LuCircleCheck, LuMessageSquare, LuSend } from 'react-icons/lu';

export default function CommunityFeed() {
  const [feed, setFeed] = useState<any[]>([]);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [voteType, setVoteType] = useState('Verified');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // Generate or retrieve persistent anonymous user ID
    let storedId = localStorage.getItem('awaaz_citizen_id');
    if (!storedId) {
      storedId = "citizen_" + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('awaaz_citizen_id', storedId);
    }
    setUserId(storedId);

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
    const issue = feed.find(i => i.id === id);
    const hasVoted = issue && issue.votedBy && issue.votedBy.includes(userId);

    setFeed(prev => prev.map(item => {
      if (item.id === id) {
        if (hasVoted) {
          return {
            ...item,
            upvotes: item.upvotes - 1,
            votedBy: item.votedBy.filter((vid: string) => vid !== userId)
          };
        } else {
          return {
            ...item,
            upvotes: item.upvotes + 1,
            votedBy: [...(item.votedBy || []), userId]
          };
        }
      }
      return item;
    }));
    
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'upvote', userId })
    });
  };

  const handleVerifySubmit = async (id: string) => {
    if (!comment) return;
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'community_vote', comment, voteType, userId })
    });
    setVerifyId(null);
    setComment('');
    // Wait for the next poll to update UI, or do optimistic update
  };

  const handleConfirmResolution = async (id: string) => {
    await fetch('/api/feedback', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'confirm_resolution', isResolved: true, feedback: 'Looks good', userId })
    });
  };

  return (
    <div className="container">
      <Navigation />
      
      <main style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Community Feed</h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '1.125rem' }}>
            See what others are reporting in your city and upvote critical issues.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {feed.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
              No issues reported yet. Be the first to report an issue!
            </div>
          ) : (
            feed.map((issue) => (
              <div key={issue.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Header Row: User Info & Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
                      {issue.username ? issue.username.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{issue.username || 'Anonymous Citizen'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>{new Date(issue.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <span style={{ 
                    background: issue.ai_analysis?.urgency_score > 7 ? 'rgba(244, 63, 94, 0.1)' : 'rgba(79, 70, 229, 0.1)', 
                    color: issue.ai_analysis?.urgency_score > 7 ? 'var(--accent)' : 'var(--primary)',
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    {issue.ai_analysis?.category || issue.category}
                  </span>
                </div>

                {/* Content */}
                <div style={{ marginTop: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.4, color: 'var(--foreground)' }}>
                    {issue.ai_analysis?.summary || issue.text}
                  </h3>
                  <p style={{ color: 'var(--foreground-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginTop: '0.5rem' }}>
                    "{issue.text}"
                  </p>
                </div>

                {issue.imageUrl && (
                  <img src={issue.imageUrl} alt="Issue" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--glass-border)' }} />
                )}

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--foreground-muted)', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LuMapPin size={16} /> 
                    {issue.locationName ? issue.locationName : issue.location ? `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}` : 'Location unknown'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: issue.status === 'Resolved' || issue.status === 'Closed' ? 'var(--secondary)' : 'var(--foreground-muted)' }}>
                    <LuCircleCheck size={16} /> 
                    Status: {issue.status}
                  </div>
                </div>

                {/* Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => handleUpvote(issue.id)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '99px',
                      background: issue.votedBy?.includes(userId) ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                      color: issue.votedBy?.includes(userId) ? 'var(--primary)' : 'var(--foreground-muted)',
                      border: 'none', transition: 'background 0.2s', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <LuThumbsUp size={18} />
                    {issue.upvotes || 0}
                  </button>

                  {verifyId !== issue.id && issue.status !== 'Closed' && issue.status !== 'Resolved' && (
                    <button 
                      onClick={() => setVerifyId(issue.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--foreground-muted)', padding: '0.5rem 1rem', borderRadius: '99px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}
                    >
                      <LuMessageSquare size={18} /> Verify
                    </button>
                  )}
                </div>

                {issue.isFake === 1 && (
                  <div style={{ padding: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', color: 'var(--accent)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    <strong>⚠️ Flagged by AI:</strong> {issue.fakeReason}
                  </div>
                )}

                {issue.communityVotes && issue.communityVotes.length > 0 && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.5rem' }}>Community Verification</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {issue.communityVotes.map((vote: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', background: 'var(--glass)', padding: '0.5rem', borderRadius: '4px' }}>
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
                      style={{ background: '#10b981', color: 'var(--foreground)', border: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Confirm Resolution
                    </button>
                  </div>
                )}

                {verifyId !== issue.id && issue.status !== 'Closed' && issue.status !== 'Resolved' && (
                  <button 
                    onClick={() => setVerifyId(issue.id)}
                    style={{ marginTop: '1rem', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--foreground)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', fontSize: '0.875rem' }}
                  >
                    <LuMessageSquare /> Add Verification
                  </button>
                )}

                {verifyId === issue.id && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--glass-border)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <select value={voteType} onChange={(e) => setVoteType(e.target.value)} style={{ background: 'var(--glass)', color: 'var(--foreground)', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '4px' }}>
                        <option value="Verified">Verified</option>
                        <option value="Fake">Fake</option>
                      </select>
                      <input 
                        type="text" 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)} 
                        placeholder="Add a comment or proof link..." 
                        style={{ flex: 1, background: 'var(--glass)', color: 'var(--foreground)', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setVerifyId(null)} style={{ background: 'transparent', color: 'var(--foreground)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => handleVerifySubmit(issue.id)} style={{ background: 'var(--primary)', color: 'var(--foreground)', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
