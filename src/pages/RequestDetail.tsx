import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, ArrowLeft, X } from 'lucide-react';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionDetails, setActionDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchReq() {
      if (!id) return;
      const docRef = doc(db, 'stopRequests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    }
    fetchReq();
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    await updateDoc(doc(db, 'stopRequests', id), { status });
    setRequest({ ...request, status });
  };

  const handleComplete = async () => {
    if (!id || !actionDetails.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'stopRequests', id), { 
        status: 'completed',
        actionDetails: actionDetails.trim()
      });
      setRequest({ ...request, status: 'completed', actionDetails: actionDetails.trim() });
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-center">불러오는 중...</div>;
  if (!request) return <div className="p-4 text-center text-slate-500">요청을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로 돌아가기
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
              request.status === 'pending' ? 'bg-orange-100 text-orange-600' :
              request.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">{request.project}</h2>
              <p className="text-xs text-slate-500">{request.location}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
            request.status === 'pending' ? 'bg-orange-100 text-orange-700' :
            request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {request.status === 'pending' ? '긴급 / 접수' : request.status === 'in_progress' ? '조치중' : '완료'}
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">작업자</span>
              <span className="font-bold text-sm text-slate-900">{request.workerName}</span>
              {request.company && <span className="text-xs text-slate-600 ml-2">({request.company})</span>}
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">접수 시간</span>
              <span className="font-bold text-sm text-slate-900">
                {request.createdAt ? format(request.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : '-'}
              </span>
            </div>
          </div>

          {(() => {
            const locationMatch = request.location?.match(/^(.*?) \(X:(\d+)%, Y:(\d+)%\)$/);
            if (!locationMatch) return null;
            const buildingName = locationMatch[1];
            const markerX = parseInt(locationMatch[2], 10);
            const markerY = parseInt(locationMatch[3], 10);

            return (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">도면 위치 ({buildingName})</h3>
                <div className="relative w-full max-w-2xl border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <img 
                    src={`/${buildingName}.png`} 
                    alt={`${buildingName} 도면`} 
                    className="w-full h-auto"
                  />
                  <div 
                    className="absolute w-4 h-4 md:w-6 md:h-6 bg-red-600 rounded-full border-2 border-white shadow-[0_0_0_4px_rgba(220,38,38,0.2)] transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                    style={{ left: `${markerX}%`, top: `${markerY}%` }}
                  />
                </div>
              </div>
            );
          })()}

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">작업중지 사유</h3>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {request.reason}
              </p>
            </div>
          </div>

          {request.actionDetails && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">조치 내역</h3>
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                  {request.actionDetails}
                </p>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">상태 변경</h3>
            <div className="flex gap-3">
              <button 
                onClick={() => updateStatus('pending')}
                disabled={request.status === 'pending'}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                접수 (대기)
              </button>
              <button 
                onClick={() => updateStatus('in_progress')}
                disabled={request.status === 'in_progress'}
                className="flex-1 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm"
              >
                조치중
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={request.status === 'completed'}
                className="flex-1 py-3 bg-slate-800 text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-slate-900 transition-colors shadow-sm"
              >
                조치 완료
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-sm text-slate-900">조치 내용 입력</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">
                  조치 내역 및 결과
                </label>
                <textarea
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder="위험 요인에 대해 어떤 조치를 취했는지 상세히 적어주세요."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm font-medium leading-relaxed"
                ></textarea>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleComplete}
                disabled={!actionDetails.trim() || isSubmitting}
                className="flex-1 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm"
              >
                {isSubmitting ? '저장 중...' : '저장 및 완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
