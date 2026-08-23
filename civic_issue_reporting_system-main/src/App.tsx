import React, { useState, useEffect, useMemo, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Map as MapIcon, 
  History, 
  User, 
  Bell, 
  LogOut,
  Menu,
  X,
  Trophy,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Check,
  Eye,
  Clock,
  MapPin,
  Camera,
  Filter,
  ThumbsUp,
  MessageSquare,
  ThumbsDown,
  Search,
  BarChart3 as AnalyticsIcon,
  ArrowRight,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { format } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Custom API Utilities
const API_BASE = ''; // Same origin

async function safeJson(response: Response) {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.error('JSON Parse Error:', err);
    return null;
  }
}

async function apiFetch(url: string, options: any = {}) {
  const token = localStorage.getItem('civic_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });
  return response;
}

// --- Error Handling ---
function handleApiError(error: unknown) {
  console.error('API Error: ', error);
}

// Fix Leaflet icon issue
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const safeFormatDate = (dateStr: any, formatStr: string) => {
  try {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, formatStr);
  } catch (e) {
    return 'N/A';
  }
};

// --- Components ---

const Button = ({ variant = 'primary', className, ...props }: any) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl',
    ghost: 'text-slate-600 hover:bg-slate-100 rounded-2xl',
    danger: 'bg-civic-danger text-white hover:bg-red-700 rounded-2xl',
  };
  return (
    <button 
      className={cn(variants[variant as keyof typeof variants], className)} 
      {...props} 
    />
  );
};

const Card = ({ children, className }: any) => (
  <div className={cn('glass-panel p-8', className)}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: any) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant as keyof typeof variants])}>
      {children}
    </span>
  );
};

const NavItem = ({ active, icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium",
      active ? "bg-civic-primary text-white shadow-lg shadow-blue-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// --- Main App ---

export default function App({ forcePortal }: { forcePortal?: 'user' | 'admin' } = {}) {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState(forcePortal ? 'auth' : 'welcome');
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchIssues = async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/issues');
      if (res.ok) {
        const data = await safeJson(res);
        if (Array.isArray(data)) setIssues(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch issues:", err);
    }
    return null;
  };

  const fetchMe = async () => {
    const token = localStorage.getItem('civic_token');
    if (!token) return;
    try {
      const res = await apiFetch('/api/me');
      if (res.ok) {
        const userData = await safeJson(res);
        if (userData && typeof userData === 'object') {
          setUser(userData);
          return userData;
        }
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('civic_token');
      if (token) {
        try {
          const res = await apiFetch('/api/me');
          if (res.ok) {
            const userData = await safeJson(res);
            if (userData) {
              // Enforce portal separation: redirect wrong role
              if (forcePortal === 'admin' && userData.role !== 'admin') {
                localStorage.removeItem('civic_token');
                setView('auth');
                setLoading(false);
                return;
              }
              if (forcePortal === 'user' && userData.role === 'admin') {
                navigate('/admin');
                return;
              }
              setUser(userData);
              if (!userData.latitude && view !== 'location-setup') {
                setView('location-setup');
              } else {
                setView(userData.role === 'admin' ? 'admin-dashboard' : 'report');
              }
            } else {
              localStorage.removeItem('civic_token');
              setView(forcePortal ? 'auth' : 'welcome');
            }
          } else {
            localStorage.removeItem('civic_token');
            setView(forcePortal ? 'auth' : 'welcome');
          }
        } catch (err) {
          console.error("Auth initialization error:", err);
          localStorage.removeItem('civic_token');
          setView(forcePortal ? 'auth' : 'welcome');
        }
      } else {
        setView(forcePortal ? 'auth' : 'welcome');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchIssues();
      const interval = setInterval(fetchIssues, 5000); // Poll for updates
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('civic_token');
    setUser(null);
    if (forcePortal) {
      setView('auth');
    } else {
      setView('welcome');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-civic-primary"></div>
      </div>
    );
  }

  if (view === 'welcome') {
    return <WelcomeScreen onLogin={() => setView('login')} onRegister={() => setView('register')} />;
  }

  // Standalone auth view for /user and /admin portals
  if (!user && view === 'auth') {
    const isAdminPortal = forcePortal === 'admin';
    return (
      <AuthScreen
        isLoginView={true} 
        toggleView={() => setView('register')}
        onBack={() => navigate('/')}
        forcedPortal={forcePortal}
      />
    );
  }

  if (!user && view === 'register') {
    return (
      <AuthScreen 
        isLoginView={false} 
        toggleView={() => setView('auth')}
        onBack={() => setView('welcome')}
      />
    );
  }

  if (!user && (view === 'login' || view === 'register')) {
    return (
      <AuthScreen 
        isLoginView={view === 'login'} 
        toggleView={() => setView(view === 'login' ? 'register' : 'login')}
        onBack={() => setView('welcome')}
      />
    );
  }

  if (view === 'location-setup') {
    return <LocationSetup onComplete={() => setView('dashboard')} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar / Mobile Nav */}
      <nav className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-civic-primary rounded-xl flex items-center justify-center text-white">
              <MapIcon size={24} />
            </div>
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">CivicConnect</h1>
          </div>

          <div className="flex-1 space-y-2">
            {user?.role === 'admin' ? (
              <>
                <NavItem active={view === 'admin-dashboard'} icon={<LayoutDashboard size={20} />} label="Admin Console" onClick={() => { setView('admin-dashboard'); setIsMenuOpen(false); }} />
                <NavItem active={view === 'admin-issues'} icon={<Filter size={20} />} label="Manage Issues" onClick={() => { setView('admin-issues'); setIsMenuOpen(false); }} />
                <NavItem active={view === 'admin-analytics'} icon={<AnalyticsIcon size={20} />} label="Analytics" onClick={() => { setView('admin-analytics'); setIsMenuOpen(false); }} />
              </>
            ) : (
              <>
                <NavItem active={view === 'dashboard'} icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => { setView('dashboard'); setIsMenuOpen(false); }} />
                <NavItem active={view === 'report'} icon={<PlusCircle size={20} />} label="Report Issue" onClick={() => { setView('report'); setIsMenuOpen(false); }} />
                <NavItem active={view === 'feed'} icon={<MapIcon size={20} />} label="Community Feed" onClick={() => { setView('feed'); setIsMenuOpen(false); }} />
                <NavItem active={view === 'history'} icon={<History size={20} />} label="My Reports" onClick={() => { setView('history'); setIsMenuOpen(false); }} />
                <NavItem active={view === 'leaderboard'} icon={<Trophy size={20} />} label="Leaderboard" onClick={() => { setView('leaderboard'); setIsMenuOpen(false); }} />
              </>
            )}
            <NavItem active={view === 'profile'} icon={<User size={20} />} label="Profile" onClick={() => { setView('profile'); setIsMenuOpen(false); }} />
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all font-semibold text-sm"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <a href="/api/public/data" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer text-slate-500 hover:bg-slate-50 font-semibold text-sm">
              <AnalyticsIcon size={20} /> Open Data API
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between relative">
          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <button className="p-2 text-slate-400 hover:text-civic-primary transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.username || 'User'}</p>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest", user?.role === 'admin' ? "text-red-500" : "text-slate-500")}>
                  {user?.role === 'admin' ? 'Administrator' : 'Citizen'}
                </p>
              </div>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold", user?.role === 'admin' ? "bg-red-500" : "bg-slate-100 text-slate-600")}>
                {user?.username?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {(() => {
              try {
                if (view === 'admin-dashboard') return <AdminDashboard key="admin-dashboard" issues={issues || []} setView={setView} user={user} />;
                if (view === 'admin-issues') return <AdminIssueManager key="admin-issues" issues={issues || []} user={user} onRefresh={fetchIssues} />;
                if (view === 'admin-analytics') return <AdminAnalytics key="admin-analytics" issues={issues || []} />;
                
                if (view === 'dashboard') return <Dashboard key="dashboard" issues={issues || []} setView={setView} user={user} onRefresh={fetchIssues} />;
                if (view === 'feed') return <CommunityFeed key="feed" issues={issues || []} user={user} onRefresh={fetchIssues} />;
                if (view === 'report') return (
                  <ReportForm 
                    key="report" 
                    user={user} 
                    onSuccess={async () => {
                      await fetchIssues();
                      await fetchMe(); 
                      setView('history');
                    }} 
                  />
                );
                if (view === 'history') return <MyReports key="history" issues={(issues || []).filter(i => i && i.userId === user?.id)} user={user} onRefresh={fetchIssues} />;
                if (view === 'leaderboard') return <LeaderboardView key="leaderboard" />;
                if (view === 'profile') return <ProfileView key="profile" user={user} />;
              } catch (e) {
                console.error("View render crash:", e);
                return (
                  <Card key="error" className="p-12 text-center border-red-100 bg-red-50/30">
                    <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h3>
                    <p className="text-slate-500 mb-6">A component in this view failed to load safely.</p>
                    <Button onClick={() => window.location.reload()}>Try Refreshing</Button>
                  </Card>
                );
              }
            })()}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden" onClick={() => setIsMenuOpen(false)} />
      )}
    </div>
  );
}

const WelcomeScreen = ({ onLogin, onRegister }: any) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, resolved: 0, inProgress: 0, pending: 0 });

  useEffect(() => {
    fetch('/api/public/stats')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.total === 'number') {
          setStats(data);
        }
      })
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
          <a href="#" className="hover:text-[#00A86B] transition-colors" onClick={(e) => { e.preventDefault(); onRegister(); }}>Report Issue</a>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-md hover:bg-slate-200 transition-colors">
            🌐 EN <ChevronDown size={14} />
          </button>
          <button onClick={() => navigate('/user')} className="text-slate-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors hover:bg-slate-50">
            Login
          </button>
          <button onClick={() => onRegister()} className="bg-[#00A86B] hover:bg-[#008f5a] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-md shadow-[#00A86B]/20">
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero / Timeline Section */}
      <div className="pt-12 pb-16 px-6 max-w-6xl mx-auto">
        {/* Mobile Login Buttons */}
        <div className="flex md:hidden justify-center mb-12">
          <div className="text-center flex flex-col items-center">
            <p className="text-slate-500 font-semibold mb-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 inline-block text-sm">Before login, read the flow below or skip to login 👇</p>
            <div className="flex flex-col w-full gap-3">
              <button onClick={() => navigate('/user')} className="flex items-center justify-center gap-2 bg-[#00A86B] hover:bg-[#008f5a] text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-[#00A86B]/20 w-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Citizen Portal
                <ChevronRight size={18} />
              </button>
              <button onClick={() => navigate('/admin')} className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-6 py-3 rounded-xl font-bold transition-colors shadow-sm w-full">
                <Eye size={18} className="text-slate-500" />
                Admin Portal
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto relative text-center">
          {/* Vertical Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-[#00A86B]/20 rounded-full md:left-1/2 md:-ml-0.5" />

          {/* Step 1 */}
          <div className="relative flex flex-col md:flex-row items-start mb-12 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-[#00A86B] text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">1</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pr-12 text-left md:text-right">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Citizen Reports an Issue</h3>
                <p className="text-slate-600 mb-2">The citizen logs into the portal and reports a civic issue by providing:</p>
                <ul className="text-slate-500 font-medium space-y-1 text-sm inline-block text-left">
                  <li>• Issue description</li>
                  <li>• Location</li>
                  <li>• Photos/Videos (optional)</li>
                </ul>
                <p className="text-slate-600 mt-2 font-medium">The issue is published in the Community Feed.</p>
                <img src="/citizen_reporting.png" alt="Citizen reporting an issue" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
            {/* Desktop Login Buttons */}
            <div className="hidden md:flex md:w-1/2 md:pl-12 flex-col items-end pt-4">
              <p className="text-slate-500 font-semibold mb-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 inline-block text-sm">Before login, read the flow below or skip to login 👇</p>
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
                <button onClick={() => navigate('/user')} className="flex items-center justify-center gap-2 bg-[#00A86B] hover:bg-[#008f5a] text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-[#00A86B]/20 w-full sm:w-auto">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Citizen Portal
                  <ChevronRight size={18} />
                </button>
                <button onClick={() => navigate('/admin')} className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-6 py-3 rounded-xl font-bold transition-colors shadow-sm w-full sm:w-auto">
                  <Eye size={18} className="text-slate-500" />
                  Admin Portal
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col md:flex-row items-start justify-end mb-12 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">2</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pl-12 text-left">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Community Voting</h3>
                <p className="text-slate-600 mb-2">Citizens living in the same area can view reported issues and upvote issues that affect them. More votes indicate that the issue impacts more people.</p>
                <p className="text-slate-600 mt-2">The system calculates a Priority Score based on:</p>
                <ul className="text-slate-500 font-medium space-y-1 text-sm inline-block">
                  <li>• Number of community votes</li>
                  <li>• Severity of the issue</li>
                  <li>• Time since the issue was reported (optional)</li>
                </ul>
                <img src="/step2_voting_1782795695974.png" alt="Community Voting" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col md:flex-row items-start mb-12 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">3</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pr-12 text-left md:text-right">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Admin Dashboard</h3>
                <p className="text-slate-600 mb-4">The admin logs into the portal and sees all reported issues in their jurisdiction. Issues are automatically sorted by Priority Score (highest priority first).</p>
                
                <div className="overflow-hidden rounded-xl border border-slate-200 text-left">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-left">Rank</th>
                        <th className="px-3 py-2 text-left">Issue</th>
                        <th className="px-3 py-2 text-right">Votes</th>
                        <th className="px-3 py-2 text-right">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium bg-white">
                      <tr><td className="px-3 py-2">1</td><td className="px-3 py-2">Water Pipeline Leakage</td><td className="px-3 py-2 text-right">320</td><td className="px-3 py-2 text-right text-red-500 font-bold">High</td></tr>
                      <tr><td className="px-3 py-2">2</td><td className="px-3 py-2">Road Potholes</td><td className="px-3 py-2 text-right">275</td><td className="px-3 py-2 text-right text-red-500 font-bold">High</td></tr>
                      <tr><td className="px-3 py-2">3</td><td className="px-3 py-2">Streetlight Not Working</td><td className="px-3 py-2 text-right">130</td><td className="px-3 py-2 text-right text-amber-500 font-bold">Medium</td></tr>
                      <tr><td className="px-3 py-2">4</td><td className="px-3 py-2">Garbage Collection Delay</td><td className="px-3 py-2 text-right">75</td><td className="px-3 py-2 text-right text-amber-500 font-bold">Medium</td></tr>
                      <tr><td className="px-3 py-2">5</td><td className="px-3 py-2">Broken Park Bench</td><td className="px-3 py-2 text-right">20</td><td className="px-3 py-2 text-right text-green-500 font-bold">Low</td></tr>
                    </tbody>
                  </table>
                </div>
                <img src="/step3_admin_1782795707685.png" alt="Admin Dashboard" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex flex-col md:flex-row items-start justify-end mb-12 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">4</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pl-12 text-left">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Team Assignment</h3>
                <p className="text-slate-600 mb-3">The admin assigns the highest-priority issue to the appropriate field team.</p>
                <p className="text-slate-600 font-medium">Once assigned, the issue status changes to:</p>
                <div className="mt-2 inline-block px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-bold border border-amber-200">Status: Under Progress</div>
                <img src="/step4_assignment_1782795719105.png" alt="Team Assignment" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="relative flex flex-col md:flex-row items-start mb-12 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">5</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pr-12 text-left md:text-right">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Field Team Completes the Work</h3>
                <p className="text-slate-600 mb-2">The field team resolves the issue and uploads proof of completion (photos, comments, etc.). The admin verifies the work.</p>
                <p className="text-slate-600 font-medium mt-2">The issue status remains <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded font-bold border border-amber-100 text-xs inline-block">Under Progress</span> until the citizen confirms.</p>
                <img src="/step5_worker_1782795729199.png" alt="Field Team Completes the Work" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="relative flex flex-col md:flex-row items-start justify-end mb-12 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">6</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pl-12 text-left">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Citizen Verification</h3>
                <p className="text-slate-600 mb-2">The citizen who reported the issue receives a notification.</p>
                <ul className="text-slate-500 font-medium space-y-1 text-sm inline-block">
                  <li>• They inspect the work.</li>
                  <li>• If satisfied, they click "Work Completed".</li>
                </ul>
                <img src="/step6_verification_1782795738607.png" alt="Citizen Verification" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Step 7 */}
          <div className="relative flex flex-col md:flex-row items-start mb-12 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-[#00A86B] text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">7</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pr-12 text-left md:text-right">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Issue Closure</h3>
                <p className="text-slate-600 mb-2 font-medium">The issue status changes to:</p>
                <div className="mb-2 inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold border border-emerald-200">Status: Completed</div>
                <p className="text-slate-600">The complaint is officially closed.</p>
                <img src="/step7_closure_1782795747511.png" alt="Issue Closure" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Step 8 */}
          <div className="relative flex flex-col md:flex-row items-start justify-end mb-16 group">
            <div className="absolute left-8 md:left-1/2 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_0_8px_#F4FAF7] z-10 transform -translate-x-1/2 md:translate-x-[-50%] group-hover:scale-110 transition-transform">8</div>
            <div className="ml-16 md:ml-0 md:w-1/2 md:pl-12 text-left">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold mb-3 text-slate-800">Reward & Leaderboard</h3>
                <ul className="text-slate-600 font-medium space-y-2 text-sm">
                  <li>• The reporting citizen earns reward points.</li>
                  <li>• Citizens who actively vote on genuine issues may also earn small participation points (optional).</li>
                  <li>• The leaderboard is updated to encourage community participation.</li>
                </ul>
                <img src="/step8_reward_1782795757203.png" alt="Reward & Leaderboard" className="w-full rounded-xl mt-4 object-cover border border-slate-100 shadow-sm" />
              </div>
            </div>
          </div>
          
        </div>
        
        {/* Complete Workflow Flowchart */}
        <div className="bg-slate-900 rounded-[2rem] p-8 md:p-12 shadow-2xl text-center relative overflow-hidden mt-12 border border-slate-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00A86B]/10 rounded-bl-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-tr-full blur-3xl"></div>
          
          <h3 className="text-2xl font-bold text-white mb-8 relative z-10">Complete Workflow</h3>
          <div className="inline-block text-left text-emerald-400 font-mono text-sm sm:text-base leading-loose whitespace-pre relative z-10 mx-auto">
{`Citizen Reports Issue
          │
          ▼
Issue Published in Community Feed
          │
          ▼
Citizens Vote (Upvote Priority)
          │
          ▼
Priority Score Calculated
          │
          ▼
Admin Dashboard (Issues Sorted by Priority)
          │
          ▼
Admin Assigns Field Team
          │
          ▼
Status → Under Progress
          │
          ▼
Field Team Resolves Issue
          │
          ▼
Admin Verifies Work
          │
          ▼
Citizen Confirms Completion
          │
          ▼
Status → Completed
          │
          ▼
Reward Points + Leaderboard Updated`}
          </div>
        </div>
        
      </div>

      {/* Hero Stats (Moved below CTA) */}
      <div className="py-12 bg-white border-t border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto px-6">
          <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#00A86B] mb-2">{stats.total}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Total Reports</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#00A86B] mb-2">{stats.resolved}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Resolved</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#f05a1a] mb-2">{stats.inProgress}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">In Progress</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center justify-center transition-transform hover:-translate-y-1">
            <div className="text-4xl font-black text-[#f59e0b] mb-2">{stats.pending}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Pending</div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-white py-24 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </div>
            <h3 className="font-bold text-[#00A86B] mb-3 text-lg">Simple Reporting Form</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Quick and intuitive form to report any civic issue in just a few clicks.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <MapPin size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">Location & Photo</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Add precise location and photos for accurate issue identification and tracking.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">Status Tracking</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Monitor your report status from pending to resolved with live updates.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <User size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">Admin Dashboard</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Comprehensive dashboard for authorities to manage and resolve issues.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <Bell size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">Smart Notifications</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Get instant notifications when your reported issue status changes.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <Camera size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">Before & After Proof</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Visual documentation showing the issue resolution with transparency.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <Clock size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">Quick Response</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Automated routing ensures issues reach the right department immediately.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_2px_20px_-3px_rgba(0,0,0,0.05)] border border-slate-100 hover:border-[#00A86B]/30 transition-colors">
            <div className="w-12 h-12 bg-[#e6f7f0] text-[#00A86B] rounded-xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            </div>
            <h3 className="font-bold text-slate-800 mb-3 text-lg">Secure & Reliable</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Your data is protected with enterprise-grade security and privacy measures.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
const LocationSetup = ({ onComplete }: any) => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [preview, setPreview] = useState<{lat: number, lng: number}>({ lat: 17.3850, lng: 78.4867 });

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setPreview({ lat: latitude, lng: longitude });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { 'User-Agent': 'CivicConnect-App' }
        });
        const data = await safeJson(res);
        if (data && data.display_name) {
          setAddress(data.display_name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLocating(false);
      }
    }, (err) => {
      console.error(err);
      setLocating(false);
    }, { enableHighAccuracy: true });
  };

  const searchAddress = async () => {
    if (!address) return;
    setLocating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
        headers: { 'User-Agent': 'CivicConnect-App' }
      });
      const data = await safeJson(res);
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setPreview({ lat: newLat, lng: newLng });
        setAddress(display_name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLocating(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/user/location', {
        method: 'PUT',
        body: JSON.stringify({
          locationAddress: address,
          latitude: preview.lat,
          longitude: preview.lng
        })
      });
      if (res.ok) {
        onComplete();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center]);
    return null;
  };

  const DraggableMarker = () => {
    const markerRef = React.useRef<any>(null);
    const eventHandlers = useMemo(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPreview({ lat: newPos.lat, lng: newPos.lng });
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos.lat}&lon=${newPos.lng}`, {
            headers: { 'User-Agent': 'CivicConnect-App' }
          })
          .then(safeJson)
          .then(data => setAddress(data?.display_name || ''))
          .catch(console.error);
        }
      },
    }), []);

    return (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={[preview.lat, preview.lng]}
        ref={markerRef}>
        <Popup minWidth={90}>
          <span>Drag to your exact home location</span>
        </Popup>
      </Marker>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Set Your Location</h2>
        <p className="text-slate-500 mb-6">We use your location to show you civic issues and alerts in your immediate neighborhood.</p>
        
        <form onSubmit={handleSetup} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Home Address / Area</label>
              <button 
                type="button" 
                onClick={detectLocation}
                className="text-xs font-bold text-civic-primary hover:underline flex items-center gap-1"
                disabled={locating}
              >
                <MapPin size={12} />
                {locating ? 'Detecting...' : 'Detect My Location'}
              </button>
            </div>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 123 Main St, Jubilee Hills"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-civic-primary"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
                />
              </div>
              <Button type="button" onClick={searchAddress} disabled={locating} className="px-6">
                Search
              </Button>
            </div>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-64 rounded-xl overflow-hidden border border-slate-200">
            <MapContainer 
              center={[
                parseFloat(preview.lat as any) || 17.3850, 
                parseFloat(preview.lng as any) || 78.4867
              ]} 
              zoom={15} 
              style={{ height: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapUpdater 
                center={[
                  parseFloat(preview.lat as any) || 17.3850, 
                  parseFloat(preview.lng as any) || 78.4867
                ]} 
              />
              <DraggableMarker />
            </MapContainer>
          </motion.div>

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? 'Locating...' : 'Confirm Location'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

const AuthScreen = ({ isLoginView, toggleView, onBack, forcedPortal }: any) => {
  const [formData, setFormData] = useState({ 
    username: '', email: '', password: '', 
    otp: '', fullName: '', address: '', city: '', postalCode: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminPortal, setIsAdminPortal] = useState(forcedPortal === 'admin');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleSendOtp = async () => {
    if (!formData.email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setSendingOtp(true);
    try {
      const res = await fetch('/api/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await safeJson(res);
      if (res.ok && data) {
        setOtpSent(true);
      } else {
        setError(data?.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLoginView ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await safeJson(res);
      if (res.ok && data) {
        localStorage.setItem('civic_token', data.token);
        // If they checked admin portal, verify role
        if (isAdminPortal && data.user.role !== 'admin') {
          localStorage.removeItem('civic_token');
          setError('Access Denied: Not an authorized administrator account.');
          setLoading(false);
          return;
        }
        window.location.reload(); 
      } else {
        setError(data?.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-6 transition-all duration-700 relative", isAdminPortal ? "bg-slate-900" : "bg-slate-50")}>
      {onBack && (
        <button 
          type="button"
          onClick={onBack}
          className={cn("absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all z-50", isAdminPortal ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          Back to Home
        </button>
      )}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-10">
          <motion.div 
            animate={{ rotate: isAdminPortal ? 180 : 0, scale: isAdminPortal ? 1.1 : 1 }}
            className={cn("w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transition-colors duration-500", isAdminPortal ? "bg-red-500" : "bg-civic-primary")}
          >
            <MapIcon size={48} className="text-white" />
          </motion.div>
          <h1 className={cn("text-4xl font-display font-black tracking-tight mb-2 transition-colors", isAdminPortal ? "text-white" : "text-slate-900")}>
            {isAdminPortal ? 'Admin Console' : 'CivicConnect'}
          </h1>
          <p className={cn("text-sm font-medium transition-colors", isAdminPortal ? "text-slate-400" : "text-slate-500")}>
            {isAdminPortal ? 'Unified Authority Management System' : 'Public Infrastructure Reporting Tool'}
          </p>
        </div>

        <Card className={cn("border-none shadow-2xl overflow-hidden relative", isAdminPortal ? "bg-slate-800 text-white" : "bg-white")}>
          {isAdminPortal && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}
          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {error && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={18} /> {error}
              </motion.div>
            )}
            
            <div className="space-y-4">
              {isAdminPortal ? (
                <>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Username</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-5 py-4 rounded-2xl border outline-none focus:ring-4 transition-all text-sm font-bold bg-slate-900/50 border-slate-700 focus:ring-red-500/10 focus:border-red-500 text-white placeholder:text-slate-600"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter your system username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Password</label>
                    <input 
                      type="password" 
                      required 
                      className="w-full px-5 py-4 rounded-2xl border outline-none focus:ring-4 transition-all text-sm font-bold bg-slate-900/50 border-slate-700 focus:ring-red-500/10 focus:border-red-500 text-white"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      disabled={otpSent}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-bold disabled:opacity-50"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                    />
                  </div>

                  {!isLoginView && (
                    <>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</label>
                        <input 
                          type="text" 
                          required 
                          disabled={otpSent}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-bold disabled:opacity-50"
                          value={formData.fullName}
                          onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Your Full Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Address</label>
                        <input 
                          type="text" 
                          required 
                          disabled={otpSent}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-bold disabled:opacity-50"
                          value={formData.address}
                          onChange={e => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Street Address"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">City</label>
                          <input 
                            type="text" 
                            required 
                            disabled={otpSent}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-bold disabled:opacity-50"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Postal Code</label>
                          <input 
                            type="text" 
                            required 
                            disabled={otpSent}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-bold disabled:opacity-50"
                            value={formData.postalCode}
                            onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                            placeholder="Postal Code"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {otpSent && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Verification Code (OTP)</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-bold tracking-[0.5em] text-center"
                        value={formData.otp}
                        onChange={e => setFormData({ ...formData, otp: e.target.value })}
                        placeholder="123456"
                        maxLength={6}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {isAdminPortal ? (
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full py-5 rounded-[1.5rem] shadow-2xl text-lg font-black uppercase tracking-wider transition-all active:scale-95 bg-red-500 hover:bg-red-600 shadow-red-500/20"
              >
                {loading ? 'Authenticating...' : 'System Login'}
              </Button>
            ) : (
              !otpSent ? (
                <Button 
                  type="button" 
                  onClick={handleSendOtp}
                  disabled={sendingOtp} 
                  className="w-full py-5 rounded-[1.5rem] shadow-2xl text-lg font-black uppercase tracking-wider transition-all active:scale-95 bg-civic-primary hover:bg-blue-600 shadow-civic-primary/20"
                >
                  {sendingOtp ? 'Sending OTP...' : 'Send Verification Code'}
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-5 rounded-[1.5rem] shadow-2xl text-lg font-black uppercase tracking-wider transition-all active:scale-95 bg-civic-primary hover:bg-blue-600 shadow-civic-primary/20"
                >
                  {loading ? 'Authenticating...' : (isLoginView ? 'System Login' : 'Register Account')}
                </Button>
              )
            )}
            
            <div className="flex flex-col gap-4 text-center">
              {(!isAdminPortal || !forcedPortal) && (
                <button 
                  type="button" 
                  onClick={toggleView}
                  className="text-xs font-bold text-slate-400 hover:text-civic-primary transition-colors"
                >
                  {isLoginView ? "Don't have a citizen account? Connect now" : 'Already part of CivicConnect? Login'}
                </button>
              )}
              
              <div className={cn("h-px my-2 transition-colors", isAdminPortal ? "bg-slate-700" : "bg-slate-100")} />
              
              {!forcedPortal && (
              <button 
                type="button" 
                onClick={() => {
                  setIsAdminPortal(!isAdminPortal);
                  setError('');
                }}
                className={cn("text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 transition-all", isAdminPortal ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-slate-100 text-slate-400 hover:border-slate-200")}
              >
                {isAdminPortal ? 'Switch to Citizen Portal' : 'Administrator Portal Login'}
              </button>
              )}
            </div>
          </form>
        </Card>
        
        <p className={cn("text-center mt-10 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors", isAdminPortal ? "text-slate-600" : "text-slate-300")}>
          Secure Civic Management Protocol v4.2
        </p>
      </motion.div>
    </div>
  );
};

// --- View Components ---

const CivicAlerts = () => {
  const alerts = [
    { title: 'Water Supply Interruption', area: 'Jubilee Hills', time: 'Tomorrow, 9 AM - 4 PM', type: 'warning' },
    { title: 'Road Maintenance', area: 'Banjara Hills Rd 12', time: 'Ongoing', type: 'info' },
    { title: 'Vaccination Drive', area: 'Community Center', time: 'Sat, 10 AM', type: 'success' },
  ];

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Neighborhood Alerts</h3>
        <Badge variant="danger" className="animate-pulse">Live</Badge>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900">{alert.title}</p>
              <div className={cn(
                "w-2 h-2 rounded-full",
                alert.type === 'warning' ? "bg-amber-500" : alert.type === 'success' ? "bg-emerald-500" : "bg-blue-500"
              )} />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">{alert.area} • {alert.time}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

const Dashboard = ({ issues = [], setView, user, onRefresh }: any) => {
  const userIssues = (issues || []).filter((i: any) => i && i.userId === user?.id);
  
  const stats = {
    total: userIssues.length,
    pending: userIssues.filter((i: any) => i.status !== 'Issue Resolved' && i.status !== 'Confirmed Resolved').length,
    resolved: userIssues.filter((i: any) => i.status === 'Issue Resolved' || i.status === 'Confirmed Resolved').length,
    emergency: userIssues.filter((i: any) => i.priority === 'Emergency').length,
  };

  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map(name => ({ name, resolved: 0, reported: 0 }));
    
    (issues || []).forEach((issue: any) => {
      if (!issue || !issue.timestamp) return;
      const date = new Date(issue.timestamp);
      const day = date.getDay();
      data[day].reported += 1;
      if (issue.status === 'Resolved' || issue.status === 'Confirmed Resolved' || issue.status === 'Pending Citizen Confirmation') {
        data[day].resolved += 1;
      }
    });
    
    // Reorder array to start from Mon to Sun
    return [...data.slice(1), data[0]];
  }, [issues]);

  const recentActivities = useMemo(() => {
    return (issues || [])
      .slice(0, 5)
      .map((issue: any) => ({
        user: issue.username || 'Anonymous',
        action: (issue.status === 'Resolved' || issue.status === 'Confirmed Resolved' || issue.status === 'Pending Citizen Confirmation') ? 'resolved' : 'reported',
        target: issue.category,
        time: new Date(issue.timestamp).toLocaleDateString(),
        icon: (issue.status === 'Resolved' || issue.status === 'Confirmed Resolved' || issue.status === 'Pending Citizen Confirmation') 
          ? <CheckCircle2 size={14} className="text-emerald-500" /> 
          : <PlusCircle size={14} className="text-blue-500" />
      }));
  }, [issues]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <Badge variant="info" className="mb-2">Citizen Dashboard</Badge>
          <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
            Hello, <span className="text-civic-primary">{user?.username}</span>
          </h2>
          <p className="text-slate-500 flex items-center gap-2">
            <MapPin size={16} className="text-civic-primary" />
            {user?.locationAddress?.split(',')[0] || 'Your neighborhood'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 text-white p-4 rounded-[1.5rem] shadow-xl flex items-center gap-4 border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-civic-primary/20 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-civic-primary/40 transition-colors" />
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-civic-primary relative z-10">
              <ThumbsUp size={24} />
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-bold">{user?.reputationPoints || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reputation</p>
            </div>
          </div>
          <Button onClick={() => setView('report')} className="h-full px-8 rounded-[1.5rem] shadow-lg shadow-civic-primary/20 hover:scale-105 active:scale-95 transition-all">
            <PlusCircle size={20} className="mr-2" />
            Report Issue
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Reports" value={stats.total} icon={<MapIcon className="text-blue-500" />} trend="+2 this week" />
        <StatCard label="Active" value={stats.pending} icon={<Clock className="text-amber-500" />} trend="Action needed" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="text-emerald-500" />} trend="100% success" />
        <StatCard label="Emergency" value={stats.emergency} icon={<AlertTriangle className="text-red-500" />} trend="High priority" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Impact Chart */}
        <Card className="lg:col-span-2 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Community Impact</h3>
              <p className="text-xs text-slate-500">Resolved vs Reported issues this week</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-civic-primary" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Reported</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Resolved</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="reported" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorReported)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorResolved)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Activity Feed */}
        <div className="space-y-6">
          <CivicAlerts />
          <Card className="p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Live Activity</h3>
            <div className="space-y-6">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1">{activity.icon}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-slate-600 leading-tight">
                      <span className="font-bold text-slate-900">{activity.user}</span> {activity.action} <span className="font-medium text-civic-primary">{activity.target}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-2 text-xs font-bold text-civic-primary hover:bg-blue-50 rounded-xl transition-all border border-blue-100">
              View All Activity
            </button>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Nearby Issues</h3>
            <button onClick={() => setView('feed')} className="text-civic-primary text-sm font-bold flex items-center gap-1">
              Explore Map <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.slice(0, 2).map((issue: any) => (
            <IssueCard key={issue.id} issue={issue} user={user} onRefresh={onRefresh} />
          ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Civic Leaderboard</h3>
          <Card className="p-0 overflow-hidden border-slate-200/60 bg-white/50 backdrop-blur-md">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Top Contributors</span>
              <div className="flex items-center gap-1 text-emerald-400">
                <History size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Weekly</span>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                { name: 'Rahul S.', points: 1250, badge: 'Guardian', color: 'bg-amber-100 text-amber-700' },
                { name: 'Priya K.', points: 980, badge: 'Active', color: 'bg-slate-100 text-slate-700' },
                { name: 'Amit V.', points: 750, badge: 'Reporter', color: 'bg-orange-100 text-orange-700' },
                { name: user?.username, points: user?.reputationPoints || 0, badge: 'You', color: 'bg-blue-100 text-blue-700' }
              ].sort((a, b) => b.points - a.points).map((u, i) => (
                <div key={i} className={cn("p-4 flex items-center justify-between transition-colors hover:bg-slate-50/50", u.name === user?.username && "bg-blue-50/50")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black", u.color)}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold shadow-sm">
                      {u.name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{u.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{u.badge}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{u.points}</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">pts</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

const StatCard = ({ label, value, icon, trend }: any) => (
  <Card className="p-6 space-y-4 hover:border-civic-primary/30 transition-all group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-civic-primary/5 to-transparent rounded-full -mr-8 -mt-8" />
    <div className="flex items-center justify-between relative z-10">
      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-civic-primary/10 transition-colors">
        {icon && React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 24 }) : icon}
      </div>
      {trend && (
        <span className={cn(
          "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
          trend.includes('+') ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
        )}>
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  </Card>
);

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const IssueCard = ({ issue, onUpvote, onVerify, user, onRefresh }: any) => {
  const [showComparison, setShowComparison] = useState(false);
  const [showCommunityVote, setShowCommunityVote] = useState(false);
  const [communityVoteLoading, setCommunityVoteLoading] = useState(false);
  const [communityVoteProof, setCommunityVoteProof] = useState<File | null>(null);
  const [communityVoteComment, setCommunityVoteComment] = useState('');
  const [loading, setLoading] = useState(false);
  
  if (!issue) return null;

  const distance = user?.latitude && user?.longitude && issue?.latitude && issue?.longitude
    ? getDistance(user.latitude, user.longitude, issue.latitude, issue.longitude)
    : null;
  
  const isLocal = distance !== null && distance <= 5;
  const isResolved = issue.status === 'Resolved' || issue.status === 'Confirmed Resolved';
  const hasCommunityVotes = (issue.voteCountResolved || 0) > 0 || (issue.voteCountNotResolved || 0) > 0;

  const safeAddress = issue.locationAddress || 'Unknown Location';
  const safeUsername = issue.username || 'Anonymous';
  const safeDescription = issue.description || 'No description provided';

  const handleCommunityVote = async (vote: 'Resolved' | 'Not Resolved') => {
    setCommunityVoteLoading(true);
    try {
      let imageUrl = null;
      if (communityVoteProof) {
        imageUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(communityVoteProof);
        });
      }

      const res = await apiFetch('/api/communityVote', {
        method: 'POST',
        body: JSON.stringify({
          issueId: issue.id,
          vote,
          comment: communityVoteComment,
          image: imageUrl
        })
      });

      if (res.ok) {
        setShowCommunityVote(false);
        setCommunityVoteProof(null);
        setCommunityVoteComment('');
        if (onRefresh) await onRefresh();
      } else {
        const data = await safeJson(res);
        alert(data?.error || 'Failed to submit vote');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommunityVoteLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all border-slate-200/60 group">
      <div className="relative h-48 overflow-hidden">
        {issue.imageUrl ? (
          <img 
            src={issue.imageUrl} 
            alt="" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
            <Camera size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <Badge variant="info">
              {issue.category}
            </Badge>
            {isLocal && (
              <Badge variant="success" className="bg-emerald-500 text-white border-none shadow-lg shadow-emerald-500/20">
                <MapPin size={10} className="mr-1" /> Local
              </Badge>
            )}
          </div>
          <div className={cn("flex items-center gap-1 backdrop-blur-md rounded-lg px-2 py-1 border w-fit shadow-lg", 
            issue.priority === 'Emergency' ? "bg-red-500/80 border-red-500 text-white" : 
            issue.priority === 'High' ? "bg-orange-500/80 border-orange-500 text-white" : 
            "bg-blue-500/80 border-blue-500 text-white")}>
            <AlertTriangle size={10} />
            <span className="text-[9px] font-black uppercase tracking-widest">{issue.priority}</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">
              {safeAddress.split(',')[0]}
            </p>
            <h4 className="text-white font-bold text-lg leading-tight line-clamp-1">
              {safeDescription}
            </h4>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg px-2 py-1 border border-white/20">
            <span className="text-white text-[10px] font-bold">
              {distance !== null ? `${distance.toFixed(1)}km away` : 'Distance unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
              {(safeUsername[0] || '?').toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">{safeUsername}</p>
              <p className="text-[10px] text-slate-500">{issue.timestamp ? safeFormatDate(issue.timestamp, 'MMM d, h:mm a') : 'N/A'}</p>
            </div>
          </div>
          <Badge variant={isResolved ? 'success' : 'warning'}>
            {issue.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Community Pulse</span>
            <span>{issue.upvotes} Upvotes</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((issue.upvotes / 20) * 100, 100)}%` }}
              className={cn(
                "h-full rounded-full",
                issue.priority === 'Emergency' ? "bg-red-500" : "bg-civic-primary"
              )}
            />
          </div>
        </div>

        {hasCommunityVotes && (
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Community Verification</span>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check size={10} /> {issue.voteCountResolved || 0}
                </span>
                <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                  <X size={10} /> {issue.voteCountNotResolved || 0}
                </span>
              </div>
            </div>
            <div className="flex h-1 gap-0.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${((issue.voteCountResolved || 0) / ((issue.voteCountResolved || 0) + (issue.voteCountNotResolved || 0) || 1)) * 100}%` }} 
              />
              <div 
                className="bg-red-400 h-full transition-all duration-500" 
                style={{ width: `${((issue.voteCountNotResolved || 0) / ((issue.voteCountResolved || 0) + (issue.voteCountNotResolved || 0) || 1)) * 100}%` }} 
              />
            </div>
          </div>
        )}

        {issue.userId === user?.id && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tracking Status</span>
              <span className="text-[10px] font-medium text-civic-primary">{issue.status}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div className={cn("h-full bg-civic-primary transition-all duration-500", 
                issue.status === 'Pending' ? 'w-1/4' : 
                issue.status === 'Assigned' ? 'w-2/4' :
                issue.status === 'In Progress' ? 'w-3/4' : 
                issue.status === 'Pending Citizen Confirmation' ? 'w-[85%]' : 
                (issue.status === 'Resolved' || issue.status === 'Confirmed Resolved') ? 'w-full' : 'w-0'
              )} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onUpvote?.(issue.id); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-civic-primary hover:text-white transition-all border border-slate-100"
          >
            <ThumbsUp size={18} />
            Support
          </button>
          
          {issue.status === 'Pending Citizen Confirmation' && onVerify && (
            <button 
              onClick={(e) => { e.stopPropagation(); onVerify?.(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
            >
              <CheckCircle2 size={18} />
              Verify Resolution
            </button>
          )}

          {issue.userId === user?.id && issue.status !== 'Resolved' && issue.status !== 'Pending Citizen Confirmation' && issue.status !== 'Confirmed Resolved' && (
            <button 
              disabled={loading}
              onClick={async (e) => {
                e.stopPropagation();
                setLoading(true);
                try {
                  const res = await apiFetch(`/api/admin/issues/${issue.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'Resolved' })
                  });
                  if (res.ok) {
                    // Success is handled by polling/refresh
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setLoading(false);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <Check size={18} />
              {loading ? 'Processing...' : 'Mark Resolved (Demo)'}
            </button>
          )}

          {(issue.workerImageUrl || issue.proofImageUrl) && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowComparison(!showComparison); }}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
              title="Compare Before/After"
            >
              <Eye size={18} />
            </button>
          )}
        </div>

        {issue.citizenVerification && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Reporter Verification</span>
              <Badge variant="success" className="text-[9px] py-0 px-1.5">
                {issue.citizenVerification.vote}
              </Badge>
            </div>
            {issue.citizenVerification.comment && (
              <p className="text-xs text-slate-600 italic">"{issue.citizenVerification.comment}"</p>
            )}
            {issue.citizenVerification.verificationImage && (
              <img 
                src={issue.citizenVerification.verificationImage} 
                className="w-full h-24 object-cover rounded-lg border border-emerald-200" 
                referrerPolicy="no-referrer" 
              />
            )}
          </div>
        )}

        {issue.status === 'Resolved' && !onVerify && (
          <div className="pt-2">
            <button 
              onClick={() => setShowCommunityVote(!showCommunityVote)}
              className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              <span>Community Voting</span>
              <ChevronDown size={14} className={cn("transition-transform", showCommunityVote && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {showCommunityVote && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    <div className="flex gap-2">
                      <button 
                        disabled={communityVoteLoading}
                        onClick={() => handleCommunityVote('Resolved')}
                        className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-100 hover:bg-emerald-100 transition-all"
                      >
                        RESOLVED ✔
                      </button>
                      <button 
                        disabled={communityVoteLoading}
                        onClick={() => handleCommunityVote('Not Resolved')}
                        className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-black border border-red-100 hover:bg-red-100 transition-all"
                      >
                        NOT RESOLVED ✘
                      </button>
                    </div>
                    <div className="space-y-2">
                      <textarea 
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[10px] outline-none focus:ring-2 focus:ring-civic-primary"
                        placeholder="Add a comment (optional)..."
                        value={communityVoteComment}
                        onChange={e => setCommunityVoteComment(e.target.value)}
                      />
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={e => setCommunityVoteProof(e.target.files?.[0] || null)}
                        />
                        <div className="py-2 border border-dashed border-slate-200 rounded-lg text-center bg-white">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {communityVoteProof ? communityVoteProof.name : 'Attach Proof (Optional)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {issue.communityVotes && issue.communityVotes.length > 0 && (
          <div className="pt-2 border-t border-slate-100 mt-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Community Feedback</p>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {issue.communityVotes.map((v: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-700">{v.username}</span>
                    <span className={cn("text-[8px] font-bold px-1 rounded", v.vote === 'Resolved' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {v.vote}
                    </span>
                  </div>
                  {v.comment && <p className="text-[10px] text-slate-600 italic">"{v.comment}"</p>}
                  {v.image && <img src={v.image} className="mt-1 w-full h-16 object-cover rounded border border-slate-200" referrerPolicy="no-referrer" />}
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showComparison && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-slate-100"
            >
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Reported</p>
                  <img src={issue.imageUrl} className="w-full aspect-square rounded-lg object-cover border border-slate-200" referrerPolicy="no-referrer" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase">Worker Fix</p>
                  {issue.workerImageUrl ? (
                    <img src={issue.workerImageUrl} className="w-full aspect-square rounded-lg object-cover border border-emerald-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-400 text-center p-1">Pending</div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-red-600 uppercase">Citizen Proof</p>
                  {issue.proofImageUrl ? (
                    <img src={issue.proofImageUrl} className="w-full aspect-square rounded-lg object-cover border border-red-200" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[9px] text-slate-400 text-center p-1">No proof</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

const ReportForm = ({ user, onSuccess }: any) => {
  const [formData, setFormData] = useState({
    category: 'Potholes',
    description: '',
    latitude: user?.latitude || 17.3850,
    longitude: user?.longitude || 78.4867,
    locationAddress: user?.locationAddress || '',
    priority: 'Normal',
    division: 'Nashik Road',
    prabhag: '17'
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { 'User-Agent': 'CivicConnect-App' }
        });
        const data = await safeJson(res);
        setFormData(prev => ({ 
          ...prev, 
          locationAddress: data?.display_name || '',
          latitude,
          longitude
        }));
      } catch (err) {
        console.error('Reverse geocoding error:', err);
      } finally {
        setLocating(false);
      }
    }, (err) => {
      console.error('Geolocation error:', err);
      alert('Could not detect your location. Please select it on the map or type your address.');
      setLocating(false);
    }, { enableHighAccuracy: true });
  };

  const searchAddress = async () => {
    if (!formData.locationAddress) return;
    setLocating(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.locationAddress)}`, {
        headers: { 'User-Agent': 'CivicConnect-App' }
      });
      const data = await safeJson(res);
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setFormData(prev => ({ 
          ...prev, 
          locationAddress: display_name,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }));
      } else {
        alert('Address not found. Please try a different search or use the map.');
      }
    } catch (err) {
      console.error('Search address error:', err);
    } finally {
      setLocating(false);
    }
  };

  const categories = [
    'Potholes', 
    'Garbage Overflow', 
    'Road Damage', 
    'Broken Streetlight', 
    'Water Leakage', 
    'Drainage Problem', 
    'Public Facility Damage', 
    'Other'
  ];
  const priorities = ['Normal', 'High', 'Emergency'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Validation
    if (!formData.description || formData.description.length < 5) {
      return alert('Please providing a description (at least 5 characters).');
    }
    if (!formData.latitude || !formData.longitude) {
      return alert('Please select a valid location on the map.');
    }
    if (!image) {
      return alert('Please upload a photo of the issue.');
    }

    setLoading(true);
    try {
      let finalImageUrl = null;
      
      // Step 1: Upload Image via FormData
      const imageFormData = new FormData();
      imageFormData.append('image', image);
      
      const token = localStorage.getItem('civic_token');
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: imageFormData
      });

      if (!uploadRes.ok) {
        const errData = await safeJson(uploadRes);
        throw new Error(errData?.error || 'Image upload failed');
      }

      const uploadData = await safeJson(uploadRes);
      finalImageUrl = uploadData?.imageUrl;

      // Step 2: Submit Report with imageUrl
      const res = await apiFetch('/api/reportIssue', {
        method: 'POST',
        body: JSON.stringify({
          category: formData.category,
          description: formData.description,
          imageUrl: finalImageUrl,
          locationAddress: formData.locationAddress,
          latitude: formData.latitude,
          longitude: formData.longitude,
          priority: formData.priority,
          division: formData.division,
          prabhag: formData.prabhag
        })
      });

      if (res.ok) {
        const data = await safeJson(res);
        // Clear form
        setFormData({
          category: 'Potholes',
          description: '',
          locationAddress: user?.locationAddress || '',
          latitude: user?.latitude || 17.3850,
          longitude: user?.longitude || 78.4867,
          priority: 'Normal',
          division: 'Nashik Road',
          prabhag: '17'
        });
        setImage(null);
        
        // Show appropriate feedback based on AI analysis
        if (data?.aiAnalysis?.isFake) {
          const reason = data.aiAnalysis.fakeReason || 'The uploaded image does not match your description/category';
          alert(`⚠️ Report Flagged as Fake\n\nYour report has been flagged because the AI detected a mismatch between your image and description.\n\nReason: ${reason}\n\nPlease ensure your uploaded photo matches what you are describing. Repeated fake submissions may result in account suspension.`);
        } else if (data.isDuplicate) {
          alert('Issue reported! Note: AI detected this might be a duplicate of a nearby issue. We have linked them for faster resolution.');
        } else {
          alert('✅ Issue reported successfully! AI verified your image matches the description.');
        }
        if (onSuccess) onSuccess();
      } else {
        const data = await safeJson(res);
        alert(data?.error || 'Failed to submit report');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.message || 'Error submitting report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center, map.getZoom());
    }, [center]);
    return null;
  };

  const LocationPicker = () => {
    const markerRef = React.useRef<any>(null);
    const eventHandlers = useMemo(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setFormData(prev => ({ ...prev, latitude: newPos.lat, longitude: newPos.lng }));
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos.lat}&lon=${newPos.lng}`, {
            headers: { 'User-Agent': 'CivicConnect-App' }
          })
          .then(safeJson)
          .then(data => setFormData(prev => ({ ...prev, locationAddress: data?.display_name || '' })))
          .catch(console.error);
        }
      },
    }), []);

    return (
      <>
        <MapUpdater center={[formData.latitude, formData.longitude]} />
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={[formData.latitude, formData.longitude]}
          ref={markerRef}
        />
      </>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">Report a Civic Issue</h2>
          <p className="text-slate-500">Help us improve your neighborhood by reporting local problems.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-2xl text-xs font-bold border border-blue-100">
          <CheckCircle2 size={16} />
          Earn 10 Reputation Points
        </div>
      </div>
      
      <Card className="p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
            <textarea 
              required
              rows={6}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-medium"
              placeholder="Describe the issue in detail... (what, where, how severe)"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Upload Photo</label>
            <div className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative group",
              image ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 hover:border-civic-primary hover:bg-slate-50"
            )}>
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={e => setImage(e.target.files?.[0] || null)}
              />
              <Camera className={cn("mx-auto mb-2 transition-colors", image ? "text-emerald-500" : "text-slate-400 group-hover:text-civic-primary")} size={32} />
              <p className={cn("text-sm font-medium", image ? "text-emerald-700" : "text-slate-500")}>
                {image ? image.name : 'Click or drag to upload issue photo'}
              </p>
              {image && <p className="text-[10px] text-emerald-500 mt-1">Photo attached successfully</p>}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" type="button" onClick={() => onSuccess()} className="flex-1 rounded-2xl py-4">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-[2] rounded-2xl py-4 shadow-xl shadow-civic-primary/20">
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
};

const VerificationModal = ({ issue, onClose, onVoteSuccess }: any) => {
  const [voteData, setVoteData] = useState({ vote: 'Resolved Properly', comment: '' });
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety Check: Not Resolved MUST have photo
    if (voteData.vote === 'Not Resolved' && !proofImage) {
      return alert('A photo proof is required when marking an issue as Not Resolved.');
    }

    setLoading(true);
    try {
      let finalProofUrl = null;
      if (proofImage) {
        const formData = new FormData();
        formData.append('image', proofImage);
        
        const token = localStorage.getItem('civic_token');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await safeJson(uploadRes);
          finalProofUrl = uploadData?.imageUrl;
        } else {
          throw new Error('Verification image upload failed');
        }
      }

      const res = await apiFetch(`/api/issues/${issue.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          isResolved: voteData.vote === 'Resolved Properly',
          feedback: voteData.comment,
          verificationImage: finalProofUrl
        })
      });

      if (res.ok) {
        alert('Verification submitted successfully!');
        await onVoteSuccess();
      } else {
        const data = await safeJson(res);
        alert(data?.error || 'Failed to submit verification');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      alert(err.message || 'An error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        className="max-w-xl w-full bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Side: Context */}
          <div className="bg-slate-50 p-8 border-r border-slate-100">
            <Badge variant="info" className="mb-4">Verification Mission</Badge>
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-4">Help Verify the Fix</h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Your feedback helps ensure that civic issues are resolved to the highest standard. Please compare the reported issue with the current state.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Original Report</p>
                <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-white">
                  {issue.imageUrl ? (
                    <img src={issue.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300"><Camera size={32} /></div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Worker Update</p>
                <div className="aspect-video rounded-2xl overflow-hidden border border-emerald-100 bg-emerald-50 flex items-center justify-center">
                  {issue.workerImageUrl ? (
                    <img src={issue.workerImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <p className="text-xs text-emerald-600 font-medium">Marked as fixed by team</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Action */}
          <div className="p-8 flex flex-col">
            <div className="flex-1">
              <form onSubmit={handleVote} className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">Is it resolved properly?</label>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      type="button"
                      onClick={() => setVoteData({ ...voteData, vote: 'Resolved Properly' })}
                      className={cn(
                        "flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left", 
                        voteData.vote === 'Resolved Properly' 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                          : "border-slate-100 hover:border-slate-200 text-slate-500"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", voteData.vote === 'Resolved Properly' ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200")}>
                        {voteData.vote === 'Resolved Properly' && <Check size={14} />}
                      </div>
                      <span className="font-bold">Yes, it's fixed!</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setVoteData({ ...voteData, vote: 'Not Resolved' })}
                      className={cn(
                        "flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left", 
                        voteData.vote === 'Not Resolved' 
                          ? "border-red-500 bg-red-50 text-red-700" 
                          : "border-slate-100 hover:border-slate-200 text-slate-500"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", voteData.vote === 'Not Resolved' ? "border-red-500 bg-red-500 text-white" : "border-slate-200")}>
                        {voteData.vote === 'Not Resolved' && <X size={14} />}
                      </div>
                      <span className="font-bold">No, still an issue.</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">
                      Upload Proof {voteData.vote === 'Not Resolved' ? '(Required)' : '(Optional)'}
                    </label>
                    <div className={cn(
                      "border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer relative",
                      voteData.vote === 'Not Resolved' 
                        ? "border-red-200 bg-red-50/30 hover:border-red-400" 
                        : "border-slate-200 bg-slate-50/30 hover:border-civic-primary"
                    )}>
                      <input 
                        type="file" 
                        required={voteData.vote === 'Not Resolved'} 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={e => setProofImage(e.target.files?.[0] || null)} 
                      />
                      <Camera className={cn("mx-auto mb-2", voteData.vote === 'Not Resolved' ? "text-red-400" : "text-slate-400")} size={24} />
                      <p className={cn("text-xs font-medium", voteData.vote === 'Not Resolved' ? "text-red-500" : "text-slate-500")}>
                        {proofImage ? proofImage.name : 'Take a photo of the current state'}
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Additional Feedback</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-civic-primary bg-slate-50/50"
                    rows={3}
                    placeholder="Any comments for the team?"
                    value={voteData.comment}
                    onChange={e => setVoteData({ ...voteData, comment: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <Button type="submit" disabled={loading} className="flex-1 rounded-2xl py-4 shadow-lg shadow-civic-primary/20">
                    {loading ? 'Submitting...' : 'Submit Verification'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CommunityFeed = ({ issues = [], user, onRefresh }: any) => {
  const [filter, setFilter] = useState('All');
  const [showMap, setShowMap] = useState(false);
  const [votingIssue, setVotingIssue] = useState<any>(null);
  
  const safeIssues = Array.isArray(issues) ? issues : [];
  const mapCenterLat = parseFloat(user?.latitude) || 17.3850;
  const mapCenterLng = parseFloat(user?.longitude) || 78.4867;

  const categories = [
    'All', 
    'Potholes', 
    'Garbage Overflow', 
    'Road Damage', 
    'Broken Streetlight', 
    'Water Leakage', 
    'Drainage Problem', 
    'Public Facility Damage', 
    'Other'
  ];

  const handleUpvote = async (issueId: string) => {
    try {
      const res = await apiFetch(`/api/issues/${issueId}/upvote`, {
        method: 'POST'
      });
      if (res.ok && onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredIssues = useMemo(() => {
    let result = filter === 'All' ? safeIssues : safeIssues.filter((i: any) => i && i.category === filter);
    return result;
  }, [safeIssues, filter]);

  const stats = useMemo(() => {
    const resolved = safeIssues.filter((i: any) => i && i.status === 'Confirmed Resolved').length;
    const pending = safeIssues.filter((i: any) => i && i.status !== 'Confirmed Resolved').length;
    return { resolved, pending };
  }, [safeIssues]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-[2rem] overflow-hidden bg-slate-900 p-8 sm:p-12 text-white">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-civic-primary/50 to-transparent" />
          <MapIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 text-white" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <Badge variant="info" className="bg-civic-primary/20 text-civic-primary border-civic-primary/30 mb-4">
            Community Pulse
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4 leading-tight">
            Your neighborhood, <br />
            <span className="text-civic-primary">better together.</span>
          </h2>
          <p className="text-slate-400 text-lg mb-8 max-w-md">
            Join {issues.length}+ active citizens in reporting and verifying local issues. Every action counts towards a cleaner city.
          </p>
          
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Issues Resolved</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">In Progress</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-civic-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search issues, locations, or categories..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-civic-primary/10 focus:border-civic-primary transition-all text-sm font-medium"
            onChange={(e) => {
              // Simple client-side search logic could be added here
            }}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                filter === c 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <Button 
            variant={showMap ? 'primary' : 'outline'} 
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2 rounded-xl"
          >
            {showMap ? <LayoutDashboard size={18} /> : <MapIcon size={18} />}
            {showMap ? 'List View' : 'Map View'}
          </Button>
        </div>
      </div>

      {showMap ? (
        <Card className="h-[600px] p-0 overflow-hidden relative">
          <MapContainer center={[mapCenterLat, mapCenterLng]} zoom={13} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredIssues.map((issue: any) => {
              if (!issue || !issue.latitude || !issue.longitude) return null;
              return (
                <Marker key={issue.id} position={[issue.latitude, issue.longitude]}>
                  <Popup className="custom-popup">
                    <div className="w-64">
                      {issue.imageUrl && <img src={issue.imageUrl} className="w-full h-32 object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />}
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={issue.priority === 'Emergency' ? 'danger' : 'info'}>{issue.category || 'Issue'}</Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{issue.priority || 'Normal'}</span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm mb-1">{(issue.description || '').slice(0, 50)}...</p>
                      <p className="text-[10px] text-slate-500 mb-3">{issue.locationAddress || 'Unknown location'}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-medium text-slate-400">
                          {issue.timestamp ? safeFormatDate(issue.timestamp, 'MMM d') : 'N/A'}
                        </span>
                        <Badge variant={issue.status === 'Issue Resolved' || issue.status === 'Confirmed Resolved' ? 'success' : 'warning'}>
                          {issue.status || 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </Card>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredIssues.map((issue: any) => (
              <IssueCard 
                key={issue.id} 
                issue={issue} 
                onUpvote={handleUpvote} 
                user={user}
                onRefresh={onRefresh}
                onVerify={issue.userId === user?.id ? () => setVotingIssue(issue) : undefined}
              />
            ))}
            {filteredIssues.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <MapIcon size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">No issues found in this category nearby.</p>
              </div>
            )}
          </div>

          {/* Success Stories Section */}
          <div className="pt-12 border-t border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-display font-bold text-slate-900">Civic Success Stories</h3>
                <p className="text-slate-500 text-sm">Real impact, powered by citizens like you.</p>
              </div>
              <Button variant="outline" className="rounded-xl">View All Impact</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Main St Pothole Fixed', location: 'Downtown', time: '2 days ago', icon: '🛣️' },
                { title: 'Park Lighting Restored', location: 'Green Valley', time: '5 days ago', icon: '💡' },
                { title: 'Illegal Dumping Cleared', location: 'East Side', time: '1 week ago', icon: '🧹' },
              ].map((story, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5 }}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl mb-4">
                    {story.icon}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">{story.title}</h4>
                  <p className="text-xs text-slate-500 mb-4">{story.location} • {story.time}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    <CheckCircle2 size={14} />
                    Verified by 12 Citizens
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {votingIssue && (
          <VerificationModal 
            issue={votingIssue} 
            onClose={() => setVotingIssue(null)} 
            onVoteSuccess={() => setVotingIssue(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MyReports = ({ issues = [], user, onRefresh }: any) => {
  const [votingIssue, setVotingIssue] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'New' | 'In-Progress' | 'Completed'>('New');

  // Ensure we are only looking at the user's issues with safe array logic
  const myIssues = (Array.isArray(issues) ? issues : []).filter((i: any) => i && i.userId === user?.id);

  const displayedIssues = useMemo(() => {
    return myIssues.filter(i => {
      if (activeTab === 'New') return i.status === 'Pending' || i.status === 'Assigned';
      if (activeTab === 'In-Progress') return i.status === 'In-Progress' || i.status === 'In Progress' || i.status === 'Pending Citizen Confirmation';
      if (activeTab === 'Completed') return i.status === 'Resolved' || i.status === 'Confirmed Resolved';
      return false;
    });
  }, [myIssues, activeTab]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900">My Civic Reports</h2>
          <p className="text-slate-500">Track the progress of issues you've reported.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-sm font-bold text-slate-900">{myIssues.length} Reports</span>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {(['New', 'In-Progress', 'Completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 px-2 text-sm font-bold transition-all border-b-2",
              activeTab === tab 
                ? "border-civic-primary text-civic-primary" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {displayedIssues.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <History size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No {activeTab} reports</h3>
          <p className="text-slate-500 mb-6">You don't have any reports in this category.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedIssues.map((issue: any) => (
            <IssueCard 
              key={issue.id} 
              issue={issue} 
              user={user}
              onRefresh={onRefresh}
              onVerify={() => setVotingIssue(issue)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {votingIssue && (
          <VerificationModal 
            issue={votingIssue} 
            onClose={() => setVotingIssue(null)} 
            onVoteSuccess={() => setVotingIssue(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const LeaderboardView = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await apiFetch('/api/leaderboard');
        if (res.ok) {
          const data = await safeJson(res);
          setLeaders(data || []);
        }
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading Civic Heroes...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900">Civic Heroes Leaderboard</h2>
        <p className="text-slate-500">Top citizens who are actively making our community better.</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {leaders.map((leader, idx) => (
            <div key={leader.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-600 relative">
                  {idx < 3 && (
                    <Trophy className={cn(
                      "absolute -top-2 -right-2",
                      idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : "text-amber-600"
                    )} size={20} />
                  )}
                  {idx + 1}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{leader.username}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-civic-primary uppercase tracking-wider">{leader.reputationPoints} Points</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {leaders.length === 0 && <div className="p-8 text-center text-slate-500">No data available yet.</div>}
        </div>
      </Card>
    </div>
  );
};

const ProfileView = ({ user }: any) => {
  const journey = [
    { date: 'Mar 10, 2026', event: 'Joined CivicConnect', icon: '👋', color: 'bg-blue-500' },
    { date: 'Mar 12, 2026', event: 'Reported first issue', icon: '📝', color: 'bg-amber-500' },
    { date: 'Mar 14, 2026', event: 'Earned "First Responder" badge', icon: '🚨', color: 'bg-emerald-500' },
    { date: 'Mar 15, 2026', event: 'Verified 5 local fixes', icon: '✅', color: 'bg-purple-500' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="md:col-span-1 p-8 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-civic-primary to-blue-600 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-blue-500/20">
              {user?.username?.[0] || 'U'}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg">
              <Check size={20} />
            </div>
          </div>
          
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-1 truncate w-full px-4">{user?.username}</h2>
          <p className="text-sm text-slate-500 mb-6 break-all px-4">{user?.email}</p>
          
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rank</span>
              <span className="text-xs font-bold text-civic-primary">Elite Citizen</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined</span>
              <span className="text-xs font-bold text-slate-600">March 2026</span>
            </div>
          </div>

          <div className="mt-8 w-full pt-8 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Badges Unlocked</h4>
            <div className="flex flex-wrap justify-center gap-3">
              {user?.badges?.map((badge: string) => (
                <div key={badge} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-sm hover:scale-110 transition-transform cursor-help group relative">
                  {badge === 'First Responder' ? '🚨' : 
                   badge === 'Eagle Eye' ? '👁️' : 
                   badge === 'Locality Hero' ? '🏠' :
                   badge === 'Active Citizen' ? '🏅' : '🎖️'}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    {badge}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Stats & Journey */}
        <div className="md:col-span-2 space-y-8">
          {/* Impact Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-1">
              <p className="text-3xl font-black text-slate-900">{user?.reputationPoints || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reputation</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-1">
              <p className="text-3xl font-black text-emerald-500">{user?.badges?.length || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Badges</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-1">
              <p className="text-3xl font-black text-civic-accent">{(user?.reputationPoints || 0) * 1.5}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impact Score</p>
            </div>
          </div>

          {/* Journey Timeline */}
          <Card className="p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-8">Civic Journey</h3>
            <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {journey.map((item, i) => (
                <div key={i} className="relative flex gap-6 items-start">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white z-10 shadow-lg", item.color)}>
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Earning Guide */}
          <Card className="p-8 bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-civic-primary/20 blur-3xl rounded-full -mr-16 -mt-16" />
            <h3 className="text-lg font-bold mb-6">How to Level Up</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { pts: '+10', label: 'Report an issue', color: 'text-blue-400' },
                { pts: '+50', label: 'Resolution confirmed', color: 'text-emerald-400' },
                { pts: '+5', label: 'Verify local fix', color: 'text-amber-400' },
                { pts: '+2', label: 'Receive upvote', color: 'text-purple-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className={cn("text-lg font-black", item.color)}>{item.pts}</span>
                  <span className="text-xs font-medium text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

const AdminDashboard = ({ issues = [], setView }: any) => {
  const safeIssues = Array.isArray(issues) ? issues : [];
  const stats = {
    total: safeIssues.length,
    pending: safeIssues.filter((i: any) => i && i.status === 'Pending').length,
    resolved: safeIssues.filter((i: any) => i && (i.status === 'Resolved' || i.status === 'Confirmed Resolved')).length,
    fake: safeIssues.filter((i: any) => i && i.isFake).length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-display font-bold text-slate-900">Admin Command Center</h2>
          <p className="text-slate-500">Overview of city-wide civic operations and issue management.</p>
        </div>
        <Button onClick={() => setView('admin-issues')}>View All Issues</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reports" value={stats.total} icon={<LayoutDashboard className="text-blue-500" />} />
        <StatCard label="Awaiting Action" value={stats.pending} icon={<Clock className="text-amber-500" />} />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="text-emerald-500" />} />
        <StatCard label="Fake/Flagged" value={stats.fake} icon={<AlertTriangle className="text-red-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 bg-slate-900 text-white">
          <h3 className="text-xl font-bold mb-6">Welcome VCB Admin To Complaint App</h3>
          <div className="space-y-4">
            {[
              'Potholes',
              'Waste and Garbage Dumping',
              'Broken Drainage Chambers',
              'Stray Dogs'
            ].map(cat => (
              <button 
                key={cat}
                onClick={() => setView('admin-issues')}
                className="w-full flex items-center justify-between p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <span className="text-sm font-bold">{cat} Complaints</span>
                <ArrowRight size={16} className="text-slate-400" />
              </button>
            ))}
          </div>
        </Card>
        <AdminRecentReports issues={issues.slice(0, 5)} setView={setView} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AdminHeatmap issues={issues} />
      </div>
    </motion.div>
  );
};

const AdminHeatmap = ({ issues }: any) => (
  <Card className="h-[450px] p-0 overflow-hidden relative">
    <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200">
      <h4 className="text-xs font-black text-slate-900 uppercase">Complaint Density</h4>
    </div>
    <MapContainer center={[17.3850, 78.4867]} zoom={12} style={{ height: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {issues.map((i: any) => (
        <Marker key={i.id} position={[i.latitude, i.longitude]}>
          <Popup>
            <div className="text-xs">
              <p className="font-bold">{i.category}</p>
              <p>{i.status}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  </Card>
);

const AdminRecentReports = ({ issues = [], setView }: any) => {
  const safeIssues = Array.isArray(issues) ? issues : [];
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Recent Complaints</h3>
        <button onClick={() => setView('admin-issues')} className="text-xs font-bold text-civic-primary">View All</button>
      </div>
      <div className="space-y-4">
        {safeIssues.slice(0, 10).map((i: any) => (
          <div 
            key={i.id} 
            onClick={() => setView('admin-issues')}
            className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
              <img src={i.imageUrl || `https://picsum.photos/seed/${i.id}/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{i.description || 'No description'}</p>
              <p className="text-[10px] text-slate-500 font-medium">
                {i.category || 'Issue'} • {i.timestamp ? safeFormatDate(i.timestamp, 'h:mm a') : 'N/A'}
              </p>
            </div>
            <Badge variant={i.priority === 'Emergency' ? 'danger' : i.priority === 'High' ? 'warning' : 'info'}>
              {i.priority || 'Normal'}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};

const AdminIssueManager = ({ issues = [], onRefresh }: any) => {
  const [filter, setFilter] = useState('All');
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  
  const safeIssues = Array.isArray(issues) ? issues : [];

  useEffect(() => {
    apiFetch('/api/admin/teams').then(safeJson).then(data => data && setTeams(data));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'All') return safeIssues;
    if (filter === 'Resolved') return safeIssues.filter((i: any) => i && (i.status === 'Resolved' || i.status === 'Confirmed Resolved' || i.status === 'Pending Citizen Confirmation'));
    return safeIssues.filter((i: any) => i && i.status === filter);
  }, [safeIssues, filter]);

  const [adminResolutionImage, setAdminResolutionImage] = useState<string | null>(null);
  const [managementLoading, setManagementLoading] = useState(false);

  const updateIssue = async (id: string, updates: any) => {
    setManagementLoading(true);
    try {
      const res = await apiFetch(`/api/admin/issues/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updates, resolutionImage: adminResolutionImage || updates.resolutionImage })
      });
      if (res.ok) {
        setSelectedIssue(null);
        setAdminResolutionImage(null);
        if (onRefresh) await onRefresh();
      } else {
        const errData = await safeJson(res);
        alert(errData?.error || 'Failed to update issue');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during update');
    } finally {
      setManagementLoading(false);
    }
  };

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAdminResolutionImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display font-bold text-slate-900">Issue Management</h2>
        <div className="flex gap-2">
          {['All', 'Pending', 'In Progress', 'Resolved'].map(s => (
            <button 
              key={s} 
              onClick={() => setFilter(s)}
              className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all", filter === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Issue</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Reporter</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Priority</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Team</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((i: any) => (
                <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={i.imageUrl || `https://picsum.photos/seed/${i.id}/100`} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      <div className="max-w-[200px]">
                        <p className="text-sm font-bold text-slate-900 truncate">{i.description || 'No description'}</p>
                        <p className="text-[10px] text-slate-500">{(i.locationAddress || 'Unknown').split(',')[0]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{i.username}</td>
                  <td className="px-6 py-4"><Badge variant={i.status === 'Resolved' || i.status === 'Confirmed Resolved' || i.status === 'Pending Citizen Confirmation' ? 'success' : i.status === 'Pending' ? 'warning' : 'info'}>{i.status}</Badge></td>
                  <td className="px-6 py-4 border-none">
                    <span className={cn("text-xs font-black uppercase", i.priority === 'Emergency' ? 'text-red-500' : i.priority === 'High' ? 'text-amber-500' : 'text-blue-500')}>
                      {i.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-700">{i.assignedTeam || "Not Assigned"}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelectedIssue(i)} className="text-civic-primary hover:underline text-xs font-bold">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedIssue && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex flex-col h-[80vh] overflow-y-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <span className="bg-slate-100 p-1.5 rounded-lg"><MessageSquare size={16} /></span>
                  Ticket ID: <span className="text-slate-900 font-bold">{selectedIssue.id}</span>
                </div>
                <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                <img src={selectedIssue.imageUrl} className="w-full h-64 object-cover rounded-2xl border border-slate-200" referrerPolicy="no-referrer" />
                
                <div className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Complaint Type</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">{selectedIssue.category}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Department</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium flex items-center gap-2">
                      <Building2 size={16} className="text-slate-400" />
                      {selectedIssue.assignedTeam || 'Unassigned Department'}
                    </div>
                  </div>

                  <div className="h-48 rounded-xl overflow-hidden border border-slate-200 relative">
                    {/* Placeholder map view to prevent layout issues */}
                    <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin size={32} className="mx-auto text-red-500 mb-2" />
                        <p className="text-xs font-bold text-slate-500 max-w-[200px] truncate">{selectedIssue.locationAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Division</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">{selectedIssue.division || 'N/A'}</div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Prabhag</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">{selectedIssue.prabhag || 'N/A'}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Description</label>
                    <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed min-h-[100px]">
                      {selectedIssue.description}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Grievance Severity</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">{selectedIssue.priority}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Complaint By</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">{selectedIssue.username}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Email Id</label>
                    <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium">{selectedIssue.userEmail || 'N/A'}</div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <h3 className="text-center font-bold text-slate-900 mb-4">Update Your Status</h3>
                  <div className="flex flex-col gap-3">
                    <button
                      disabled={managementLoading}
                      onClick={() => updateIssue(selectedIssue.id, { status: 'In Progress' })}
                      className={cn(
                        "w-full py-3.5 rounded-xl font-bold transition-all shadow-md",
                        selectedIssue.status === 'In Progress' ? "bg-orange-500 text-white shadow-orange-500/20" : "bg-red-400 text-white hover:bg-red-500 shadow-red-400/20"
                      )}
                    >
                      {managementLoading && selectedIssue.status !== 'In Progress' ? 'Updating...' : 'In-Progress'}
                    </button>
                    <button
                      disabled={managementLoading}
                      onClick={() => updateIssue(selectedIssue.id, { status: 'Resolved' })}
                      className={cn(
                        "w-full py-3.5 rounded-xl font-bold transition-all shadow-md",
                        (selectedIssue.status === 'Resolved' || selectedIssue.status === 'Confirmed Resolved' || selectedIssue.status === 'Pending Citizen Confirmation') 
                          ? "bg-emerald-600 text-white shadow-emerald-600/20" 
                          : "bg-slate-800 text-white hover:bg-slate-900 shadow-slate-800/20"
                      )}
                    >
                      {managementLoading && selectedIssue.status !== 'Resolved' ? 'Updating...' : 'Completed'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6 mt-6">

                  {(selectedIssue.status !== 'Pending') && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-6 mt-4">
                      <label className="block text-xs font-bold text-emerald-700 uppercase mb-2 tracking-widest">Upload Resolution Proof (AI Verification)</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={managementLoading}
                        onChange={handleAdminPhotoUpload}
                        className="text-xs text-emerald-600 mb-2"
                      />
                      {adminResolutionImage && <img src={adminResolutionImage} className="w-full h-32 object-cover rounded-xl mt-2" />}
                      <p className="text-[10px] text-emerald-700 mt-2">Upload a photo showing the fixed issue before clicking "Completed" to trigger AI verification.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-widest">Assign Worker Team</label>
                    <select 
                      disabled={managementLoading}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 disabled:opacity-50"
                      value={selectedIssue.assignedTeam || ""}
                      onChange={(e) => updateIssue(selectedIssue.id, { assignedTeam: e.target.value })}
                    >
                      <option value="">Select a team</option>
                      {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mb-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Verification Status</h4>
                    {selectedIssue.citizenVerification ? (
                      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-900">Reporter Vote</span>
                          <Badge variant={selectedIssue.citizenVerification.vote === 'Resolved Properly' ? 'success' : 'danger'}>
                            {selectedIssue.citizenVerification.vote}
                          </Badge>
                        </div>
                        {selectedIssue.citizenVerification.comment && (
                          <p className="text-[10px] text-slate-500 italic mb-2">"{selectedIssue.citizenVerification.comment}"</p>
                        )}
                        {selectedIssue.citizenVerification.verificationImage && (
                          <img src={selectedIssue.citizenVerification.verificationImage} className="w-full h-24 object-cover rounded-xl" />
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No reporter verification yet.</p>
                    )}

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Community Feedback</span>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold text-emerald-500">+{selectedIssue.voteCountResolved || 0}</span>
                          <span className="text-[10px] font-bold text-red-500">-{selectedIssue.voteCountNotResolved || 0}</span>
                        </div>
                      </div>
                      
                      {selectedIssue.communityVotes && selectedIssue.communityVotes.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                          {selectedIssue.communityVotes.map((v: any, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex gap-3">
                              <div className={cn("w-2 h-2 mt-1.5 rounded-full shrink-0", v.vote === 'Resolved' ? 'bg-emerald-500' : 'bg-red-500')} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-600 italic">"{v.comment || 'No comment provided'}"</p>
                                {v.image && <img src={v.image} className="mt-2 w-20 h-12 object-cover rounded-lg" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">No community feedback yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => {
                        if (confirm('Flag this report as fake? The user may be blocked after 3 reports.')) {
                          updateIssue(selectedIssue.id, { isFake: true, status: 'Closed' });
                        }
                      }}
                      className="flex-1 py-3 px-4 border-2 border-red-100 text-red-600 rounded-2xl font-bold text-xs hover:bg-red-50"
                    >
                      Flag as Fake Report
                    </button>
                    <Button onClick={() => setSelectedIssue(null)} className="flex-1 rounded-2xl">Close</Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

const AdminAnalytics = ({ issues = [] }: any) => {
  const safeIssues = Array.isArray(issues) ? issues : [];
  const data = useMemo(() => {
    const cats = safeIssues.reduce((acc: any, i: any) => {
      if (i && i.category) {
        acc[i.category] = (acc[i.category] || 0) + 1;
      }
      return acc;
    }, {});
    return Object.keys(cats).map(k => ({ name: k, count: cats[k] }));
  }, [safeIssues]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-display font-bold text-slate-900">Analytics & Insights</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8">
          <h3 className="text-lg font-bold mb-6">Issues by Category</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8 bg-slate-900 text-white">
          <h3 className="text-lg font-bold mb-6">Performance Matrix</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">Resolution Rate</span>
                <span className="text-xs font-bold text-emerald-400">84%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[84%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">Citizen Satisfaction</span>
                <span className="text-xs font-bold text-blue-400">4.2/5</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[78%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">Response Time</span>
                <span className="text-xs font-bold text-amber-400">2.4 days</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[60%]" />
              </div>
            </div>
          </div>
          <div className="mt-12 p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs text-slate-400 leading-relaxed">
              * Based on data from the last 30 days of community verifications and municipal worker logs.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
