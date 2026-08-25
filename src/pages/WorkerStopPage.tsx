import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, Send } from 'lucide-react';

export default function WorkerStopPage() {
  const [searchParams] = useSearchParams();
  const defaultProject = searchParams.get('project') || '';
  const defaultLocation = searchParams.get('location') || '';

  const [project, setProject] = useState(defaultProject);
  const [location, setLocation] = useState(defaultLocation);
  const [coordinates, setCoordinates] = useState<{x: number, y: number} | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [company, setCompany] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Remove manifest if it somehow got added (safeguard)
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) manifest.remove();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !location || !workerName || !reason) return;
    
    if (!coordinates) {
      alert('도면에서 정확한 위치를 클릭하여 선택해주세요.');
      return;
    }

    const finalLocation = `${location} (X:${Math.round(coordinates.x)}%, Y:${Math.round(coordinates.y)}%)`;

    setIsSubmitting(true);
    try {
      // 1. Save to Firestore directly
      const requestRef = await addDoc(collection(db, 'stopRequests'), {
        project,
        location: finalLocation,
        workerName,
        company,
        reason,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 2. Trigger push notification via backend API
      try {
        await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: requestRef.id,
            project,
            location,
            workerName,
            reason
          })
        });
      } catch (apiError) {
        console.error('Failed to trigger push:', apiError);
        // We still consider it submitted even if push fails
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert('접수 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">접수 완료</h1>
          <p className="text-slate-600 mb-6">작업중지권이 안전하게 관리자에게 전달되었습니다. 안전한 곳으로 대피해주세요.</p>
          <button 
            onClick={() => {
              setSubmitted(false);
              setReason('');
            }}
            className="w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
          >
            추가 접수하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col p-4 md:p-8 font-sans relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <Link to="/admin" className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors shadow-sm tracking-widest">
          관리자
        </Link>
      </div>
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col mt-4 md:mt-0">
        <div className="mb-6 mt-4">
          <div className="inline-flex items-center justify-center p-3 bg-red-100 text-red-600 rounded-xl mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">작업중지권 행사</h1>
          <p className="text-xs text-slate-500 leading-relaxed">위험 요인이 발견되었거나 사고 발생 위험이 있을 경우 즉시 작업을 중지하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">PJT 명</label>
              <input
                type="text"
                required
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm font-medium"
                placeholder="예: 평택 A현장"
              />
            </div>
            
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">상세 위치</label>
              <select
                required
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setCoordinates(null);
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm font-medium appearance-none"
              >
                <option value="" disabled>건물을 선택해주세요</option>
                <option value="본관 A동">본관 A동</option>
                <option value="본관 B동">본관 B동</option>
                <option value="별관">별관</option>
              </select>
            </div>

            {location && (
              <div className="mt-4">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">도면에서 정확한 위치 선택</label>
                <div className="relative w-full border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <img 
                    src={`/${location}.png`} 
                    alt="Floor plan" 
                    className="w-full h-auto cursor-crosshair"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setCoordinates({ x, y });
                    }}
                  />
                  {coordinates && (
                    <div 
                      className="absolute w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${coordinates.x}%`, top: `${coordinates.y}%` }}
                    />
                  )}
                </div>
                {coordinates && (
                  <p className="text-[10px] text-slate-500 mt-2 text-right">
                    위치가 선택되었습니다. (X: {Math.round(coordinates.x)}%, Y: {Math.round(coordinates.y)}%)
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">소속 업체</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm font-medium"
                  placeholder="업체명"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">작업자명</label>
                <input
                  type="text"
                  required
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-sm font-medium"
                  placeholder="이름"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">작업중지 사유</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none text-sm font-medium leading-relaxed"
                placeholder="어떤 위험이 있는지 상세히 적어주세요."
              ></textarea>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 py-4 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 tracking-wide uppercase"
          >
            {isSubmitting ? '접수 중...' : '즉시 작업중지권 접수'}
          </button>
        </form>
      </div>
    </div>
  );
}
