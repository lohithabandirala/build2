"use client";

import Link from 'next/link';
import { LuLayoutDashboard, LuMic, LuGlobe } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';

export default function Navigation() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <nav className="glass-panel" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      position: 'sticky',
      top: '1rem',
      zIndex: 50,
      marginBottom: '2rem'
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.25rem' }}>
        <div style={{
          width: '36px', height: '36px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#000'
        }}>
          <LuMic size={20} />
        </div>
        <span className="gradient-text">Awaaz</span>
      </Link>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link href="/feed" className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent' }}>
           Feed
        </Link>
        <Link href="/leaderboard" className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent' }}>
           Leaderboard
        </Link>
        <Link href="/report" className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           {language === 'hi-IN' ? 'शिकायत दर्ज करें' : 'Report Issue'}
        </Link>
        <Link href="/dashboard" className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LuLayoutDashboard size={18} />
          {language === 'hi-IN' ? 'डैशबोर्ड' : 'Dashboard'}
        </Link>
        <button 
          onClick={toggleLanguage}
          className="glass-button" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }} 
          title="Change Language"
        >
          <LuGlobe size={18} />
          <span style={{ fontSize: '0.875rem' }}>{language === 'en-IN' ? 'EN' : 'HI'}</span>
        </button>
      </div>
    </nav>
  );
}
