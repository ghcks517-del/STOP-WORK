import { useState, useEffect } from 'react';
import { db, getFirebaseMessaging } from '../lib/firebase';
import { doc, getDoc, collection, setDoc, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { isMobileDevice, isRunningAsPWA } from '../lib/utils';
import { Smartphone, Bell, BellOff, Info, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminSettings() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isMobile = isMobileDevice();
  const isStandalone = isRunningAsPWA();
  
  // Current device state
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default'>('default');
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    const adminUid = localStorage.getItem('adminUid');
    if (!adminUid) return;
    const q = query(collection(db, 'adminDevices'), where('adminUid', '==', adminUid));
    const snapshot = await getDocs(q);
    setDevices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const enablePush = async () => {
    try {
      if (!isMobile) {
        alert('모바일 기기에서만 지원됩니다.');
        return;
      }
      if (!isStandalone) {
        alert('PWA(홈 화면 추가) 모드에서만 실행 가능합니다.');
        return;
      }
      const adminUid = localStorage.getItem('adminUid');
      if (!adminUid) {
        alert('관리자 로그인 정보가 없습니다.');
        return;
      }
      
      if (!('Notification' in window)) {
        alert('이 기기/브라우저는 Push 알림을 지원하지 않습니다. (iOS 16.4+ 필요)');
        return;
      }
      
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
        setPushStatus(permission);
      }
      
      if (permission === 'denied') {
        alert('알림 권한이 거부되었습니다. 기기 설정에서 알림을 직접 허용해주세요.');
        return;
      }

      if (permission === 'granted') {
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          alert('현재 환경에서는 Push 알림 기능이 지원되지 않습니다.');
          return;
        }
        
        // Ensure Service Worker is registered
        const registration = await navigator.serviceWorker.register('/admin/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
        
        const token = await getToken(messaging, {
          serviceWorkerRegistration: registration,
        });

        if (token) {
          setCurrentToken(token);
          const deviceId = `device_${adminUid}_${Date.now()}`;
          localStorage.setItem('currentDeviceId', deviceId);
          
          await setDoc(doc(db, 'adminDevices', deviceId), {
            adminUid: adminUid,
            adminName: '관리자',
            pushRegistrationId: token,
            pushProvider: 'FCM',
            deviceName: navigator.userAgent.split(' ')[0] || 'Unknown Device',
            platform: /Android/i.test(navigator.userAgent) ? 'Android' : 'iOS',
            browser: 'App',
            mobileDevice: true,
            pwaInstalled: true,
            standaloneVerified: true,
            pushEnabled: true,
            notificationPermission: 'granted',
            registeredAt: serverTimestamp(),
            lastStandaloneSeenAt: serverTimestamp(),
            active: true
          });
          
          fetchDevices();
          alert('Push 알림이 활성화되었습니다.');
        } else {
          alert('Push 토큰을 발급받지 못했습니다.');
        }
      }
    } catch (error: any) {
      console.error('Error enabling push:', error);
      alert(`Push 설정 오류: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (confirm('이 기기의 Push 알림을 해제하시겠습니까?')) {
      await deleteDoc(doc(db, 'adminDevices', deviceId));
      fetchDevices();
    }
  };

  const sendTestPush = async (token: string) => {
    try {
      // In a real app, this would hit the backend. For demo purposes if we don't have a backend endpoint for test,
      // We'd rely on the backend. Since I created /api/requests, it expects a request body.
      // I'll just alert for now or try to trigger it.
      alert('설치된 앱의 백그라운드 환경에서만 테스트가 필요합니다.');
    } catch (e) {}
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6 h-full overflow-y-auto pb-10">
        <div className="w-full md:w-1/3 flex flex-col gap-6">
          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-sm text-orange-900">기기 알림 설정</h2>
            </div>
            
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-xl border border-orange-200">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-500">실행 방식</span>
                  <span className={`font-bold ${isStandalone ? 'text-green-500' : 'text-red-500'}`}>
                    {isStandalone ? '설치된 앱 (PWA)' : '일반 웹브라우저'}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Push 권한</span>
                  <span className={`font-bold ${pushStatus === 'granted' ? 'text-green-500' : 'text-slate-400'}`}>
                    {pushStatus === 'granted' ? '허용됨' : pushStatus === 'denied' ? '거부됨' : '사용 불가'}
                  </span>
                </div>
              </div>

              {!isMobile ? (
                <div className="p-3 bg-white/50 rounded-xl border border-dashed border-orange-300">
                  <p className="text-[11px] text-orange-800 leading-tight">PC 환경에서는 실시간 Dashboard를 사용합니다. 휴대폰 Push 알림을 받으려면 휴대폰으로 접속해주세요.</p>
                </div>
              ) : !isStandalone ? (
                <>
                  <div className="p-3 bg-white/50 rounded-xl border border-dashed border-orange-300">
                    <p className="text-[11px] text-orange-800 leading-tight">Push 알림을 받으려면 관리자 앱을 <b>홈 화면에 설치</b>한 후 실행해야 합니다.</p>
                  </div>
                  <button className="w-full bg-orange-500 text-white py-2 rounded-xl text-xs font-bold shadow-md shadow-orange-200 transition-transform active:scale-95">
                    관리자 앱 설치 가이드
                  </button>
                </>
              ) : (
                <div className="mt-4 pt-4 border-t border-orange-200/50">
                  {devices.some(d => d.id === localStorage.getItem('currentDeviceId')) ? (
                    <button
                      onClick={async () => {
                        const deviceId = localStorage.getItem('currentDeviceId');
                        if (deviceId) {
                          await removeDevice(deviceId);
                          localStorage.removeItem('currentDeviceId');
                        }
                      }}
                      className="w-full bg-red-50 text-red-600 py-3 rounded-xl text-xs font-bold shadow-sm hover:bg-red-100 border border-red-200 transition-all flex items-center justify-center gap-2"
                    >
                      <BellOff className="w-4 h-4" />
                      Push 알림 해제하기
                    </button>
                  ) : (
                    <button
                      onClick={enablePush}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Push 알림 활성화
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-2/3 flex flex-col">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">내 알림 기기 관리</h2>
            
            <div className="space-y-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">불러오는 중...</div>
              ) : devices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">등록된 기기가 없습니다.</div>
              ) : (
                devices.map(device => (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${device.pushEnabled ? 'bg-green-500' : 'bg-slate-400'}`}>
                      {device.pushEnabled ? <CheckCircle2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{device.deviceName}</p>
                      <p className={`text-[10px] font-medium ${device.pushEnabled ? 'text-green-700' : 'text-slate-500'}`}>
                        {device.platform} / {device.pushEnabled ? 'Push 활성' : '비활성'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeDevice(device.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Push 해제"
                    >
                      <BellOff className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {devices.length > 0 && (
              <button 
                className="mt-6 w-full py-2 border border-slate-200 hover:bg-slate-50 transition-colors rounded-xl text-[10px] font-bold text-slate-500"
              >
                전체 기기 로그아웃
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
