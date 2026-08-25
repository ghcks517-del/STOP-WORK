import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'stopRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-4 text-center">불러오는 중...</div>;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-sm">최근 작업중지권 접수 내역</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-blue-600 font-bold px-2 py-1 bg-blue-50 rounded-md">총 {requests.length}건</span>
            <span className="text-[10px] text-orange-600 font-bold px-2 py-1 bg-orange-50 rounded-md">LIVE UPDATE</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map(req => (
            <Link key={req.id} to={`/admin/requests/${req.id}`} className="block">
              <div className="p-4 border border-slate-100 rounded-xl bg-white hover:border-orange-200 hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    req.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {req.status === 'pending' ? '긴급 / 접수' : 
                     req.status === 'in_progress' ? '일반 / 조치중' : '완료'}
                  </span>
                  {req.createdAt && (
                    <span className="text-[10px] text-slate-400">
                      {format(req.createdAt.toDate(), 'HH:mm:ss')}
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-sm mb-1 line-clamp-1">{req.project} / {req.location}</h3>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{req.workerName} / {req.reason}</p>

                <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400">{req.company || '소속 미기재'}</span>
                  <button className="text-[10px] font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg">상세보기</button>
                </div>
              </div>
            </Link>
          ))}

          {requests.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 rounded-xl border border-slate-100 border-dashed">
              접수된 작업중지권이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
