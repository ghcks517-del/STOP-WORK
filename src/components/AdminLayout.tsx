import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ShieldAlert, LogOut, Settings, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const storedAuth = localStorage.getItem('adminAuth');
      if (storedAuth === '2026') {
        setIsAdmin(true);
        // Ensure a local admin UID exists for push notification registration
        if (!localStorage.getItem('adminUid')) {
          localStorage.setItem('adminUid', 'admin_' + Math.random().toString(36).substring(2, 11));
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Listen to pending requests to update badge
  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'stopRequests'), where('status', '==', 'pending'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const count = snapshot.size;
        setPendingCount(count);
        
        // Update App Badge if supported
        if ('setAppBadge' in navigator) {
          if (count > 0) {
            (navigator as any).setAppBadge(count).catch(console.error);
          } else {
            (navigator as any).clearAppBadge().catch(console.error);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '2026') {
      setLoginError('');
      localStorage.setItem('adminAuth', '2026');
      if (!localStorage.getItem('adminUid')) {
        localStorage.setItem('adminUid', 'admin_' + Math.random().toString(36).substring(2, 11));
      }
      setIsAdmin(true);
    } else {
      setLoginError('비밀번호가 일치하지 않습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    setIsAdmin(false);
    navigate('/admin');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩중...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-slate-200">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">관리자 로그인</h1>
          <p className="text-xs text-slate-500 mb-6">시스템 접근을 위해 관리자 코드를 입력해주세요.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="관리자 코드 (PIN)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-center font-bold tracking-widest text-lg"
              />
            </div>
            {loginError && <p className="text-xs text-red-500 font-medium">{loginError}</p>}
            <button 
              type="submit"
              className="w-full py-3 px-4 bg-[#0f172a] text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors"
            >
              접속하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans overflow-hidden text-slate-900">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-[#0f172a] text-white shadow-lg sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500 flex items-center justify-center rounded-lg font-bold text-xl text-white shrink-0">!</div>
          <div>
            <Link to="/admin">
              <h1 className="text-base md:text-lg font-bold leading-tight text-white hover:text-orange-200 transition-colors">작업중지권 관리 시스템</h1>
            </Link>
            <p className="text-[10px] md:text-xs text-slate-400">Safety First Monitoring Console</p>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium">실시간 대시보드 활성</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">관리자</p>
              <p className="text-[10px] text-slate-400">마스터 권한</p>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <Link to="/admin" className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                <LayoutDashboard className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0f172a]">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </Link>
              <Link to="/admin/settings" className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
              </Link>
              <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
      <footer className="px-4 md:px-8 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-tighter shrink-0">
        <div>© 2026 SAFETY SYSTEM CORP. ALL RIGHTS RESERVED.</div>
        <div className="hidden sm:flex gap-4 uppercase">
          <span className="text-slate-300">Status: OK</span>
          <span className="text-slate-300">Server: SEOUL-01</span>
          <span className="text-slate-900">Admin PWA v2.4.0</span>
        </div>
      </footer>
    </div>
  );
}
