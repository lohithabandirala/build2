import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { LuArrowRight, LuChartBar, LuMic, LuShieldCheck } from 'react-icons/lu';

export default function Home() {
  return (
    <div className="container">
      <Navigation />
      
      <main style={{ padding: '4rem 0', display: 'flex', flexDirection: 'column', gap: '6rem' }}>
        {/* Hero Section */}
        <section style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '1rem' }}>
            Empowering Citizens. Enhancing Infrastructure.
          </div>
          <h1 style={{ fontSize: '4rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }} className="animate-fade-in">
            Speak up for your <br />
            <span className="gradient-text">community's future.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: '600px' }}>
            A Digital Public Good that transforms your voice, text, and photos into actionable infrastructure projects for national policymakers.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <Link href="/report" className="primary-button hover-scale" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              Report an Issue <LuArrowRight />
            </Link>
            <Link href="/dashboard" className="glass-button hover-scale" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
              View Dashboard
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <LuMic size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Multilingual Voice First</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Report issues in Hindi, English or regional languages. Our AI automatically transcribes and understands your local dialect.
            </p>
          </div>
          
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
              <LuShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>AI Validation</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Upload photos of infrastructure damage. Our Gemini Vision models instantly verify authenticity and categorize the problem.
            </p>
          </div>
          
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <LuChartBar size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Data-Driven Policy</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Aggregating grassroots feedback with national datasets to surface real-time hotspots and recommend strategic investments.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
