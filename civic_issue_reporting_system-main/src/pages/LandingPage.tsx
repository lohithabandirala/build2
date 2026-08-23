import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CheckCircle2, Bell, Clock, MapPin, Camera, Eye, User } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, resolved: 0, inProgress: 0, pending: 0 });

  useEffect(() => {
    fetch('/api/public/stats')
      .then(res => res.json())
      .then(data => { if (data && typeof data.total === 'number') setStats(data); })
      .catch(console.error);
  }, []);

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F4FAF7] font-sans text-slate-800 overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00A86B] rounded-lg flex items-center justify-center text-white font-bold text-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Civic Report</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-slate-600">
          <a href="#" className="text-[#00A86B]">Home</a>
          <a href="#how" className="hover:text-[#00A86B] transition-colors">How It Works</a>
          <a href="#features" className="hover:text-[#00A86B] transition-colors">Features</a>
          <button onClick={() => navigate('/user')} className="hover:text-[#00A86B] transition-colors">Citizen Portal</button>
          <button onClick={() => navigate('/admin')} className="hover:text-[#00A86B] transition-colors">Admin Portal</button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/user')}
            className="bg-[#00A86B] hover:bg-[#008f5a] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-md shadow-[#00A86B]/20"
          >
            Report Issue
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-slate-900 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
          >
            Admin Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-[#00A86B]/10 text-[#00A86B] px-4 py-2 rounded-full text-sm font-bold mb-6 border border-[#00A86B]/20">
          <span className="w-2 h-2 bg-[#00A86B] rounded-full animate-pulse"></span>
          Live Civic Monitoring Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
          Greener City <span className="text-[#00A86B]">Together.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
          A smart AI-powered platform that connects citizens and authorities to resolve civic problems like potholes, garbage, drainage, and streetlights with real-time updates and full transparency.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <button
            onClick={() => navigate('/user')}
            className="flex items-center justify-center gap-2 bg-[#00A86B] hover:bg-[#008f5a] text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-xl shadow-[#00A86B]/30 w-full sm:w-auto"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Citizen Portal
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-sm w-full sm:w-auto"
          >
            <Eye size={20} className="text-slate-500" />
            Admin Portal
          </button>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { value: stats.total, label: 'Total Reports', color: 'text-[#00A86B]' },
            { value: stats.resolved, label: 'Resolved', color: 'text-[#00A86B]' },
            { value: stats.inProgress, label: 'In Progress', color: 'text-[#f05a1a]' },
            { value: stats.pending, label: 'Pending', color: 'text-[#f59e0b]' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
              <div className={`text-4xl font-black mb-2 ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution rate banner */}
      <div className="bg-white py-24 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#00A86B] rounded-[2.5rem] p-12 text-center text-white shadow-2xl shadow-[#00A86B]/30 max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10">
              <div className="text-8xl font-black mb-4 tracking-tighter">{resolutionRate}%</div>
              <div className="text-3xl font-bold mb-4">Resolution Rate</div>
              <p className="text-[#e6f7f0] max-w-md mx-auto text-lg font-medium">
                Of reported issues successfully resolved by our integrated civic management system
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="how" className="bg-[#F8FDFB] py-24 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">How It Works</h2>
            <p className="text-slate-500 text-lg">Simple steps to a better neighborhood</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Citizen Flow */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#00A86B] rounded-xl flex items-center justify-center text-white">
                  <User size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Citizen Flow</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Register & Login', desc: 'Create a citizen account or log in to the portal' },
                  { step: '02', title: 'Report Issue', desc: 'Upload photo, select category, detect GPS location' },
                  { step: '03', title: 'AI Classification', desc: 'System auto-detects issue type and priority level' },
                  { step: '04', title: 'Track Status', desc: 'Monitor: New → In Progress → Confirmed Resolved' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="text-2xl font-black text-slate-100 w-8 shrink-0">{item.step}</div>
                    <div>
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/user')}
                className="mt-8 w-full py-3 bg-[#00A86B] text-white rounded-xl font-bold hover:bg-[#008f5a] transition-colors"
              >
                Go to Citizen Portal →
              </button>
            </div>

            {/* Admin Flow */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                </div>
                <h3 className="text-xl font-bold">Admin / Authority Flow</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Admin Login', desc: 'Access the secure authority management console' },
                  { step: '02', title: 'View All Complaints', desc: 'Filter by type, location, severity, and status' },
                  { step: '03', title: 'Assign Department', desc: 'Route to correct team (Sanitation, Roads, Drainage)' },
                  { step: '04', title: 'Update & Notify', desc: 'Update status → citizen receives real-time alert' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="text-2xl font-black text-slate-700 w-8 shrink-0">{item.step}</div>
                    <div>
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/admin')}
                className="mt-8 w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                Go to Admin Portal →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="bg-white py-24 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Platform Features</h2>
            <p className="text-slate-500 text-lg">Everything you need for smart civic management</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>, title: 'AI Issue Detection', desc: 'Automatic category and priority classification from images using Gemini AI.' },
              { icon: <MapPin size={24} />, title: 'GPS Location', desc: 'Auto-detect location with reverse geocoding and interactive draggable maps.' },
              { icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>, title: 'Real-time Tracking', desc: 'Track complaint status from Pending through In Progress to Confirmed Resolved.' },
              { icon: <User size={24} />, title: 'Dual Portals', desc: 'Separate citizen and admin interfaces with role-based access control.' },
              { icon: <Bell size={24} />, title: 'Smart Notifications', desc: 'Get instant updates when your reported issue status changes.' },
              { icon: <Camera size={24} />, title: 'Before/After Proof', desc: 'Visual documentation showing issue resolution with full transparency.' },
              { icon: <CheckCircle2 size={24} />, title: 'Community Voting', desc: '5km geo-fenced community verification of resolved issues.' },
              { icon: <Clock size={24} />, title: 'Auto Routing', desc: 'Intelligent department assignment based on issue category.' },
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
                <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-800 mb-3 text-lg">{f.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-slate-900 py-20 px-6 text-center text-white">
        <h2 className="text-4xl font-black mb-4">Ready to make a difference?</h2>
        <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Join thousands of citizens actively improving their neighborhoods through smart reporting.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => navigate('/user')}
            className="bg-[#00A86B] hover:bg-[#008f5a] text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors shadow-xl shadow-[#00A86B]/30"
          >
            Citizen Portal →
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors"
          >
            Admin Portal →
          </button>
        </div>
        <p className="mt-12 text-slate-600 text-sm">© 2026 CivicConnect • Secure Civic Management Protocol v4.2</p>
      </div>
    </div>
  );
}
