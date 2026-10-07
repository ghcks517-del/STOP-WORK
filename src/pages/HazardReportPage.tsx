import React from "react";
import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSearchParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, Send, ArrowLeft, X } from 'lucide-react';
import { isRunningAsPWA } from '../lib/utils';

export default function HazardReportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  if (isRunningAsPWA()) {
    return <Navigate to="/admin" replace />;
  }
  
  const defaultLocation = searchParams.get('location') || '';
  const isNfcLocation = !!searchParams.get('location');

  const [location, setLocation] = useState(defaultLocation);
  const [coordinates, setCoordinates] = useState<{x: number, y: number} | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem('workerPhoneNumber') || '');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const KNOWN_BUILDINGS = ['본관 A동', '본관 B동', '별관'];
  const isKnownBuilding = KNOWN_BUILDINGS.includes(location);

  useEffect(() => {
    // Remove manifest if it somehow got added (safeguard)
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) manifest.remove();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !workerName || !phoneNumber || !reason) return;
    
    if (isKnownBuilding && !coordinates) {
      alert('도면에서 정확한 위치를 클릭하여 선택해주세요.');
      return;
    }

    // Save phone number to local storage for convenience
    localStorage.setItem('workerPhoneNumber', phoneNumber);

    const finalLocation = (isKnownBuilding && coordinates)
      ? `${location} (X:${Math.round(coordinates.x)}%, Y:${Math.round(coordinates.y)}%)`
      : location;

    setIsSubmitting(true);
    try {
      // 1. Save to Firestore directly
      const requestRef = await addDoc(collection(db, 'stopRequests'), {
        type: 'hazard',
        location: finalLocation,
        workerName,
        phoneNumber,
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
            type: 'hazard',
            location,
            workerName,
            phoneNumber,
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
          <p className="text-slate-600 mb-6">위험상황이 안전하게 접수되었습니다. 감사합니다.</p>
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
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <Link to="/admin" className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors shadow-sm tracking-widest">
          관리자
        </Link>
      </div>
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col mt-4 md:mt-0">
        <div className="mb-6 mt-4">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 text-orange-600 rounded-xl mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">위험상황 신고</h1>
          <p className="text-xs text-slate-500 leading-relaxed">위험 요인이 발견되었거나 사고 발생 위험이 있을 경우 즉시 작업을 중지하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500">
                  상세 위치
                </label>
                {location && !isNfcLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocation('');
                      setCoordinates(null);
                    }}
                    className="text-[11px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    선택 초기화
                  </button>
                )}
              </div>

              {!isNfcLocation && (
                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  {KNOWN_BUILDINGS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setLocation(b);
                        setCoordinates(null);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        location === b
                          ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-200 scale-[1.02]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  list={isNfcLocation ? undefined : "building-list"}
                  required
                  readOnly={isNfcLocation}
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setCoordinates(null);
                  }}
                  className={`w-full px-4 py-3 ${location && !isNfcLocation ? 'pr-10' : ''} border border-slate-200 rounded-xl outline-none transition-all text-sm font-medium ${isNfcLocation ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'}`}
                  placeholder="건물 버튼을 선택하거나 직접 입력하세요"
                />
                {location && !isNfcLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocation('');
                      setCoordinates(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                    title="선택 지우기"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <datalist id="building-list">
                <option value="본관 A동" />
                <option value="본관 B동" />
                <option value="별관" />
              </datalist>
            </div>

            {isKnownBuilding && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500">
                    도면에서 정확한 위치 선택 <span className="text-orange-600 font-bold">({location})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setLocation('');
                      setCoordinates(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-orange-600 underline cursor-pointer"
                  >
                    다른 장소로 변경
                  </button>
                </div>
                <div className="relative w-full border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <img 
                    src={`/admin/${encodeURIComponent(location)}.png?v=3`} 
                    alt="Floor plan" 
                    className="w-full h-auto cursor-crosshair"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = 'true';
                        target.src = `/${encodeURIComponent(location)}.png?v=3`;
                      }
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setCoordinates({ x, y });
                    }}
                  />
                  {coordinates && (
                    <div 
                      className="absolute w-4 h-4 bg-orange-600 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2"
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

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">작업자명</label>
              <input
                type="text"
                required
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm font-medium"
                placeholder="이름"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">휴대폰 번호</label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm font-medium"
                placeholder="010-0000-0000"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">신고 내용 (상황)</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none text-sm font-medium leading-relaxed"
                placeholder="어떤 위험이 있는지 상세히 적어주세요."
              ></textarea>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-8 py-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 tracking-wide uppercase"
          >
            {isSubmitting ? '접수 중...' : '신고 접수하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
