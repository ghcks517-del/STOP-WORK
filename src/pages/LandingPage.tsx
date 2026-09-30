import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col p-4 md:p-8 font-sans relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <Link to="/admin" className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors shadow-sm tracking-widest">
          관리자
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center gap-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">작업중지권/위험상황 신고</h1>
          <p className="text-sm text-slate-500">원하시는 항목을 선택해주세요.</p>
        </div>

        <Link 
          to="/stop"
          className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-red-500 transition-all flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">작업중지권 행사</h2>
          <p className="text-xs text-slate-500 leading-relaxed">위험 요인이 발견되었거나 사고 발생 위험이 있을 경우 즉시 작업을 중지하세요.</p>
        </Link>

        <Link 
          to="/hazard"
          className="bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-orange-500 transition-all flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">위험상황 신고</h2>
          <p className="text-xs text-slate-500 leading-relaxed">작업장 내 위험상황이나 아차사고를 발견한 경우 신속하게 신고해주세요.</p>
        </Link>
      </div>
    </div>
  );
}
