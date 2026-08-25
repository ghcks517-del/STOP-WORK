import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Download, Trash2 } from 'lucide-react';

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

  const handleExportExcel = () => {
    if (requests.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const exportData = requests.map((req, index) => ({
      'No': index + 1,
      '상태': req.status === 'pending' ? '접수' : req.status === 'in_progress' ? '조치중' : '완료',
      '접수일시': req.createdAt ? format(req.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : '-',
      'PJT 명': req.project,
      '상세 위치': req.location,
      '소속 업체': req.company,
      '작업자 명': req.workerName,
      '작업중지 사유': req.reason,
      '조치 내역': req.actionDetails || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '작업중지권_접수내역');
    XLSX.writeFile(workbook, `작업중지권_접수내역_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (window.confirm('정말로 이 접수 내역을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) {
      try {
        await deleteDoc(doc(db, 'stopRequests', id));
      } catch (error) {
        console.error(error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  if (loading) return <div className="p-4 text-center">불러오는 중...</div>;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
          <h2 className="font-bold text-sm">최근 작업중지권 접수 내역</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 text-[10px] text-green-700 font-bold px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              엑셀 다운로드
            </button>
            <span className="text-[10px] text-blue-600 font-bold px-2 py-1 bg-blue-50 rounded-md">총 {requests.length}건</span>
            <span className="text-[10px] text-orange-600 font-bold px-2 py-1 bg-orange-50 rounded-md">LIVE UPDATE</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map(req => (
            <Link key={req.id} to={`/admin/requests/${req.id}`} className="block relative group">
              <div className="p-4 border border-slate-100 rounded-xl bg-white hover:border-orange-200 hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex justify-between items-start mb-2 pr-8">
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
                
                <button 
                  onClick={(e) => handleDelete(e, req.id)}
                  className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                  title="삭제하기"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <h3 className="font-bold text-sm mb-1 line-clamp-1 pr-6">{req.project} / {req.location?.split(' (X')[0]}</h3>
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{req.workerName} / {req.reason}</p>

                <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400">{req.company || '소속 미기재'}</span>
                  <div className="text-[10px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">상세보기</div>
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
