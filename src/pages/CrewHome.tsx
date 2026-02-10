import React, { useState, useEffect, useMemo } from 'react';

// 분리된 컴포넌트 임포트
import ManualModal from '../components/Crew/ManualModal';
import ScheduleModal from '../components/Crew/ScheduleModal';
import MyInfoModal from '../components/Crew/MyInfoModal';
import PayStubModal from '../components/Crew/PayStubModal';

// 공통 스타일
import { 
  overlay, modal, modalHeader, closeBtn, 
  approveBtn, rejectBtn 
} from '../utils/crewStyles';

const DAILY_GREETINGS: Record<string, string> = {
  Monday: "주말 다음날, 점검 잘 부탁드려요 😊",
  Tuesday: "화이팅! 오늘도 힘내주세요 💪",
  Wednesday: "행운데이! 오늘도 화이팅 🙌",
  Thursday: "내일만 버티면 주말이에요! 😄",
  Friday: "해피데이! 기분 좋게 화이팅 🎉",
  Saturday: "화이팅! 오늘도 잘 부탁드려요 😊",
  Sunday: "왠지 좋은일이 가득할거 같아요! 😊",
};

const BRANCH_INFO: {[key: string]: {name: string, address: string, phone: string, link: string}} = {
  'GDXC': { name: '엑스케이프 건대1호점', address: '서울특별시 광진구 동일로 112', phone: '02-463-9366', link: 'https://naver.me/52Rwiewa' },
  'GDXR': { name: '엑스크라임 건대2호점', address: '서울 광진구 아차산로29길 38', phone: '02-464-8788', link: 'https://naver.me/xs3G1j9E' },
  'NWXC': { name: '뉴케이스 건대3호점', address: '서울 광진구 아차산로 191', phone: '02-498-1999', link: 'https://naver.me/5PVaHcw4' },
  'GNXC': { name: '강남점', address: '서울특별시 광진구 동일로 112', phone: '02-555-9366', link: 'https://naver.me/FMcgAHck' },
  'SWXC': { name: '수원점', address: '경기 수원시 팔달구 효원로265번길 40', phone: '031-234-3350', link: 'https://naver.me/FdCfMPnc' },
};

export default function CrewHome() {
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showBranchInfo, setShowBranchInfo] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState<any | null>(null);
  const [customAlert, setCustomAlert] = useState<{show: boolean, message: string, title?: string}>({ show: false, message: '' });

  const [manuals, setManuals] = useState<string[]>([]);
  const [allCrews, setAllCrews] = useState<any[]>([]); 
  const [coworkers, setCoworkers] = useState<any[]>([]);
  const [myLogs, setMyLogs] = useState<any[]>([]); 
  const [holidays, setHolidays] = useState<{[key: string]: number}>({});
  const [oneOffShifts, setOneOffShifts] = useState<any[]>([]); 
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [subTargetShift, setSubTargetShift] = useState<{date: string, startTime: string, endTime: string} | null>(null);
  const [unscheduledModalOpen, setUnscheduledModalOpen] = useState(false);
  const [isPendingUnscheduled, setIsPendingUnscheduled] = useState(false);
  const [overtimeModalOpen, setOvertimeModalOpen] = useState(false);
  const [overtimeReasons, setOvertimeReasons] = useState<string[]>([]);
  const [overtimeNote, setOvertimeNote] = useState("");
  const [pendingLogoutTime, setPendingLogoutTime] = useState<Date | null>(null);
  const [upcomingShift, setUpcomingShift] = useState<string>("");
  const [dayDetailModal, setDayDetailModal] = useState<{date: string, crews: any[]} | null>(null);

  const [statsMonth, setStatsMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editRequest, setEditRequest] = useState<any>({});

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const unreadNotis = useMemo(() => notifications.filter(n => !n.isRead), [notifications]);
  const readNotis = useMemo(() => notifications.filter(n => n.isRead), [notifications]);

  useEffect(() => {
    const stored = sessionStorage.getItem("current_user");
    if (stored) {
      const parsedUser = JSON.parse(stored);
      setUser(parsedUser);
      setCurrentUser(parsedUser); 
      const savedStatus = localStorage.getItem(`work_status_${parsedUser.phone}`);
      if (savedStatus) {
        const { start, working } = JSON.parse(savedStatus);
        if (working) { setIsWorking(true); setWorkStartTime(start); }
      }
    } else {
      window.location.hash = "login";
    }
  }, []);

  useEffect(() => {
      if (!user) return;
      const loadData = () => {
        const crewKey = `crew_pin_${user.branchCode}_${user.name}`;
        const latestUserData = JSON.parse(localStorage.getItem(crewKey) || '{}');
        setCurrentUser((prev: any) => ({ ...prev, ...user, ...latestUserData }));
        
        const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
        if (workingCrews[user.pin]) {
             setIsWorking(true);
             if (workingCrews[user.pin].timestamp) setWorkStartTime(workingCrews[user.pin].timestamp);
        } else {
             const savedStatus = localStorage.getItem(`work_status_${user.phone}`);
             if (savedStatus && JSON.parse(savedStatus).working) {
                const { start } = JSON.parse(savedStatus);
                setIsWorking(true); 
                setWorkStartTime(start); 
             } else { 
                setIsWorking(false); 
             }
        }

        setManuals(JSON.parse(localStorage.getItem('company_manuals') || '[]'));
        setHolidays(JSON.parse(localStorage.getItem('company_holidays_map') || '{}'));
        const currentOneOffs = JSON.parse(localStorage.getItem('company_one_offs') || '[]');
        setOneOffShifts(currentOneOffs);
        
        const allKeys = Object.keys(localStorage);
        const branchCrews = allKeys.filter(k => k.startsWith(`crew_pin_${user.branchCode}_`)).map(k => JSON.parse(localStorage.getItem(k) || '{}'));
        setAllCrews(branchCrews);
        setCoworkers(branchCrews.filter(c => c.pin !== user.pin && c.status === 'active'));
        
        const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
        const pendingReq = logReqs.find((r: any) => r.type === 'UNSCHEDULED_WORK' && r.reqName === user.name && r.status === 'pending');
        setIsPendingUnscheduled(!!pendingReq);
        
        const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
        const myHistory = allLogs.filter((l: any) => l.userPin === user.pin && (l.type === 'OUT' || l.type === 'ABSENT')).reverse();
        setMyLogs(myHistory);
        
        findUpcomingShift(latestUserData, currentOneOffs);

        const subReqs = JSON.parse(localStorage.getItem('sub_requests') || '[]');
        const receivedReqs = subReqs.filter((r: any) => r.toPin === user.pin && r.status === 'pending');
        const processedReceived = receivedReqs.map((r: any) => ({ ...r, isRead: false }));
        const mySentResults = subReqs.filter((r: any) => r.fromPin === user.pin && r.status !== 'pending').map((r: any) => ({ ...r, toName: branchCrews.find((c: any) => c.pin === r.toPin)?.name }));
        const editReqs = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
        const myEditNotis = editReqs.filter((r: any) => r.pin === user.pin && (r.status === 'approved' || r.status === 'rejected'));
        const myLogNotis = logReqs.filter((r: any) => r.reqPin === user.pin);
        const rawNotis = [...processedReceived, ...mySentResults, ...myEditNotis, ...myLogNotis];
        const uniqueNotisMap = new Map();
        rawNotis.forEach(item => uniqueNotisMap.set(item.id, item));
        setNotifications(Array.from(uniqueNotisMap.values()).sort((a:any, b:any) => b.id - a.id));
      };
      
      loadData();
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (isWorking && workStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = now - workStartTime;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        const fmt = (n: number) => n.toString().padStart(2, '0');
        setElapsedTime(`${fmt(h)}:${fmt(m)}:${fmt(s)}`);
      }, 1000);
    } else {
      setElapsedTime("00:00:00");
    }
    return () => clearInterval(interval);
  }, [isWorking, workStartTime]);

  const myStats = useMemo(() => { 
      const logsInMonth = myLogs.filter(log => log.date.startsWith(statsMonth)); 
      const lateCount = logsInMonth.filter(log => log.isLate).length; 
      const absentCount = logsInMonth.filter(log => log.type === 'ABSENT').length; 
      return { lateCount, absentCount }; 
  }, [myLogs, statsMonth]);

  const showAlert = (message: string, title: string = '🔔 알림') => { setCustomAlert({ show: true, message, title }); };

  const findUpcomingShift = (userData: any, oneOffs: any[]) => {
      const now = new Date(); let found = null;
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(); targetDate.setDate(now.getDate() + i);
        const dateStr = targetDate.toLocaleDateString('en-CA'); const dayOfWeek = targetDate.getDay();
        const myOneOffs = oneOffs.filter((s:any) => s.date === dateStr && s.crewName === userData.name && s.branchCode === userData.branchCode);
        const isOffToday = myOneOffs.some((s:any) => s.type === 'OFF');
        if (isOffToday) continue; 
        const specialShift = myOneOffs.find((s:any) => s.type !== 'OFF');
        if (specialShift) {
            const [h, m] = specialShift.startTime.split(':').map(Number);
            const shiftStart = new Date(targetDate); shiftStart.setHours(h, m, 0, 0);
            if (i > 0 || now < shiftStart) {
                found = { date: i === 0 ? "오늘" : (i === 1 ? "내일" : dateStr), time: `${specialShift.startTime}~${specialShift.endTime}`, type: specialShift.type };
                break;
            }
        }
        const fixed = userData.fixedSchedules?.[dayOfWeek];
        if (fixed) {
            const [h, m] = fixed.startTime.split(':').map(Number);
            const shiftStart = new Date(targetDate); shiftStart.setHours(h, m, 0, 0);
            if (i > 0 || now < shiftStart) {
                found = { date: i === 0 ? "오늘" : (i === 1 ? "내일" : dateStr), time: `${fixed.startTime}~${fixed.endTime}`, type: 'FIXED' };
                break;
            }
        }
      }
      if (found) setUpcomingShift(`${found.date} ${found.time} (${found.type === 'FIXED' ? '정규' : (found.type === 'SUB' ? '대타' : '교육')})`); 
      else setUpcomingShift("예정된 근무가 없습니다.");
  };

  const handleLogout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      sessionStorage.removeItem("current_user");
      window.location.hash = "login";
    }
  };

  const processLogout = (now: Date, overtimeInfo?: { reasons: string[], note: string }) => {
    const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false });
    setIsWorking(false); setWorkStartTime(null); setElapsedTime("00:00:00"); 
    setOvertimeModalOpen(false); setOvertimeReasons([]); setOvertimeNote(""); setPendingLogoutTime(null);
    const currentStatus = JSON.parse(localStorage.getItem('working_crews') || '{}')[user.pin];
    let isUnscheduled = currentStatus?.isUnscheduled || false;
    if (!isUnscheduled) {
        const requests = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
        const approvedReq = requests.find((r: any) => r.type === 'UNSCHEDULED_WORK' && r.reqPin === user.pin && r.status === 'approved' && r.startTime === currentStatus?.startTime );
        if (approvedReq) isUnscheduled = true;
    }
    let finalOvertimeReason = null;
    if (overtimeInfo && overtimeInfo.reasons.length > 0) {
      finalOvertimeReason = overtimeInfo.reasons.join(', '); if (overtimeInfo.note) finalOvertimeReason += ` (${overtimeInfo.note})`;
      const reports = JSON.parse(localStorage.getItem('log_edit_requests') || '[]'); 
      const report = { id: Date.now(), type: 'REPORT', reqName: user.name, branchCode: user.branchCode, reason: `[연장근로] ${finalOvertimeReason}`, requestDate: now.toLocaleString(), status: 'pending', isRead: false };
      localStorage.setItem('log_edit_requests', JSON.stringify([...reports, report]));
    }
    const logs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
    const newLog = { 
        id: Date.now(), userName: user.name, userPin: user.pin, branchCode: user.branchCode, type: 'OUT', 
        date: now.toLocaleDateString('en-CA'), time: now.getTime(), 
        startTime: currentStatus?.startTime || "00:00:00", endTime: timeStr, 
        totalWorkTime: elapsedTime, 
        isLate: currentStatus?.isLate || false, lateMinutes: currentStatus?.lateMinutes || 0, 
        overtimeReason: finalOvertimeReason,
        isUnscheduled: isUnscheduled, 
        isSub: currentStatus?.isSub || false
    };
    logs.push(newLog); 
    localStorage.setItem('attendance_logs', JSON.stringify(logs)); 
    setMyLogs([newLog, ...myLogs]);
    const workingStatus = JSON.parse(localStorage.getItem('working_crews') || '{}'); 
    delete workingStatus[user.pin]; 
    localStorage.setItem('working_crews', JSON.stringify(workingStatus));
    localStorage.removeItem(`work_status_${user.phone}`);
    showAlert("퇴근 처리가 완료되었습니다.", "🌙 퇴근 완료");
  };

  const handleAttendance = (type: 'IN' | 'OUT') => {
    const now = new Date(); 
    const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false });
    if (type === 'IN') {
       const dayOfWeek = now.getDay();
       const oneOffs = JSON.parse(localStorage.getItem('company_one_offs') || '[]');
       const todayDateStr = now.toLocaleDateString('en-CA');
       const isOffToday = oneOffs.some((s:any) => s.date === todayDateStr && s.crewName === user.name && s.type === 'OFF');
       if (isOffToday) {
           showAlert("오늘은 휴무(삭제) 처리된 날입니다.\n근무가 필요하다면 스케줄 외 근무 승인을 요청하세요.", "🔔 휴무 알림");
           return;
       }
       const todayOneOff = oneOffs.find((s:any) => s.date === todayDateStr && s.crewName === user.name && s.branchCode === user.branchCode && s.type !== 'OFF');
       const todayFixed = currentUser.fixedSchedules?.[dayOfWeek];
       const schedule = todayOneOff || todayFixed;
       if (!schedule) { setUnscheduledModalOpen(true); return; }
       if (schedule) {
           const [h, m] = schedule.startTime.split(':').map(Number);
           const scheduleDate = new Date();
           scheduleDate.setHours(h, m, 0, 0);
           if (now < scheduleDate) {
               const diffMs = scheduleDate.getTime() - now.getTime();
               const diffMins = Math.floor(diffMs / 60000); 
               if (diffMins > 10) { setUnscheduledModalOpen(true); return; }
           }
       }
       if (confirm("☀️ 출근 등록을 하시겠습니까?")) {
           let isLate = false; let lateMinutes = 0;
           if (schedule) { 
               const [h, m] = schedule.startTime.split(':').map(Number); 
               const scheduleDate = new Date(); scheduleDate.setHours(h, m, 0, 0);
               if (now > scheduleDate) { isLate = true; lateMinutes = Math.floor((now.getTime() - scheduleDate.getTime()) / 60000); }
           }
           setWorkStartTime(now.getTime()); 
           setIsWorking(true);
           localStorage.setItem(`work_status_${user.phone}`, JSON.stringify({ start: now.getTime(), working: true }));
           const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
           workingCrews[user.pin] = { 
               name: user.name, branchCode: user.branchCode, startTime: timeStr, timestamp: now.getTime(), 
               isLate, lateMinutes, isSub: schedule?.type === 'SUB' 
           };
           localStorage.setItem('working_crews', JSON.stringify(workingCrews));
           if (isLate) showAlert(`⚠️ 지각입니다! (${lateMinutes}분 지연)\n관리자에게 알림이 전송되었습니다.`, '⚠️ 지각 알림'); 
           else showAlert("출근 완료!", '✅ 출근 완료');
       }
    } else {
       const now = new Date();
       const dayOfWeek = now.getDay(); const oneOffs = JSON.parse(localStorage.getItem('company_one_offs') || '[]');
       const todayDateStr = now.toLocaleDateString('en-CA');
       const todayOneOff = oneOffs.find((s:any) => s.date === todayDateStr && s.crewName === user.name && s.branchCode === user.branchCode && s.type !== 'OFF');
       const todayFixed = currentUser.fixedSchedules?.[dayOfWeek];
       const schedule = todayOneOff || todayFixed;
       if (schedule) {
         const [endH, endM] = schedule.endTime.split(':').map(Number); 
         const scheduledEnd = new Date(); scheduledEnd.setHours(endH, endM, 0, 0);
         if (now.getTime() > scheduledEnd.getTime() + (5 * 60 * 1000)) { 
             setPendingLogoutTime(now); setOvertimeModalOpen(true); return; 
         }
       }
       if (confirm("🌙 퇴근 처리를 하시겠습니까?")) { processLogout(now); }
    }
  };

  const handleUnscheduledRequest = () => {
    const now = new Date();
    const reports = JSON.parse(localStorage.getItem('log_edit_requests') || '[]'); 
    const report = { id: Date.now(), type: 'UNSCHEDULED_WORK', reqName: user.name, reqPin: user.pin, branchCode: user.branchCode, targetDate: now.toLocaleDateString('en-CA'), reason: "스케줄 외 근무 신청이 요청되었습니다.", requestDate: now.toLocaleString(), startTime: now.toLocaleTimeString('ko-KR', { hour12: false }), status: 'pending', isRead: false };
    localStorage.setItem('log_edit_requests', JSON.stringify([...reports, report]));
    setUnscheduledModalOpen(false); setIsPendingUnscheduled(true); showAlert("관리자에게 승인 요청을 보냈습니다.", "📤 요청 완료");
  };

  const requestSubstitute = (targetCrew: any) => { 
      if (!subTargetShift) return; 
      if (!confirm(`${targetCrew.name}님에게 대타를 요청하시겠습니까?`)) return; 
      const newReq = { 
          id: Date.now(), type: 'SUB_REQUEST', fromPin: user.pin, fromName: user.name, toPin: targetCrew.pin, 
          targetDate: subTargetShift.date, targetStartTime: subTargetShift.startTime, targetEndTime: subTargetShift.endTime, 
          status: 'pending', branchCode: user.branchCode 
      }; 
      const subReqs = JSON.parse(localStorage.getItem('sub_requests') || '[]'); 
      localStorage.setItem('sub_requests', JSON.stringify([...subReqs, newReq])); 
      showAlert("요청이 전송되었습니다.", "📤 요청 전송"); setSubTargetShift(null); 
  };
   
  const handleSubResponse = (req: any, isAccepted: boolean) => { 
      const subReqs = JSON.parse(localStorage.getItem('sub_requests') || '[]'); 
      const updated = subReqs.map((r: any) => r.id === req.id ? { ...r, status: isAccepted ? 'accepted' : 'rejected' } : r); 
      localStorage.setItem('sub_requests', JSON.stringify(updated)); 
      if (isAccepted) { 
          const newShift = { 
              id: Date.now(), date: req.targetDate, crewName: user.name, branchCode: user.branchCode, 
              startTime: req.targetStartTime || "13:00", endTime: req.targetEndTime || "18:00", type: 'SUB', replaceTarget: req.fromName 
          }; 
          const shifts = JSON.parse(localStorage.getItem('company_one_offs') || '[]'); 
          localStorage.setItem('company_one_offs', JSON.stringify([...shifts, newShift])); 
          showAlert("대타 요청을 승낙했습니다.\n스케줄이 업데이트 되었습니다.", "✅ 수락 완료"); 
      } else {
          showAlert("대타 요청을 거절했습니다.", "❌ 거절 완료");
      }
      setSelectedNoti(null); 
  };
   
  const markAsRead = (notiId: number) => {
    const targetNoti = notifications.find(n => n.id === notiId);
    if (targetNoti && targetNoti.type === 'SUB_REQUEST' && targetNoti.fromPin === user.pin) {
        const subReqs = JSON.parse(localStorage.getItem('sub_requests') || '[]');
        const updated = subReqs.map((r: any) => r.id === notiId ? { ...r, isRead: true } : r);
        localStorage.setItem('sub_requests', JSON.stringify(updated));
        setNotifications(prev => prev.filter(n => n.id !== notiId));
        setSelectedNoti(null);
        return;
    }
    if (targetNoti && targetNoti.type === 'LOG' && targetNoti.status === 'approved') {
        const logs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
        const updatedLogs = logs.map((log: any) => {
            const isMatch = targetNoti.logId ? log.id === targetNoti.logId : (log.date === targetNoti.targetDate && log.userPin === targetNoti.reqPin);
            if (isMatch) {
                const [startH, startM] = targetNoti.newStartTime.split(':').map(Number);
                const [endH, endM] = targetNoti.newEndTime.split(':').map(Number);
                const startMin = startH * 60 + startM;
                const endMin = endH * 60 + endM;
                let diffMin = endMin - startMin;
                if (diffMin < 0) diffMin += 24 * 60; 
                const h = Math.floor(diffMin / 60); const m = diffMin % 60;
                const newTotalTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`; 
                return { ...log, startTime: targetNoti.newStartTime, endTime: targetNoti.newEndTime, totalWorkTime: newTotalTime };
            }
            return log;
        });
        localStorage.setItem('attendance_logs', JSON.stringify(updatedLogs));
        setMyLogs(updatedLogs.filter((l: any) => l.userPin === user.pin && (l.type === 'OUT' || l.type === 'ABSENT')).reverse());
    }
    const editReqs = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
    const updatedEdit = editReqs.map((r:any) => r.id === notiId ? {...r, isRead: true} : r);
    localStorage.setItem('crew_edit_requests', JSON.stringify(updatedEdit));
    const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
    const updatedLog = logReqs.map((r:any) => r.id === notiId ? {...r, isRead: true} : r);
    localStorage.setItem('log_edit_requests', JSON.stringify(updatedLog));
    setNotifications(prev => prev.map(n => n.id === notiId ? {...n, isRead: true} : n));
    setSelectedNoti(null);
  };

  const currentArchiveItems = readNotis.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalArchivePages = Math.ceil(readNotis.length / ITEMS_PER_PAGE);

  if (!user || !currentUser) return null;

  return (
    <div style={appContainer}>
      <div style={headerSection}>
        <h1 style={dateTitle}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</h1>
        <button onClick={handleLogout} style={ghostBtn}>로그아웃</button>
      </div>

      <div style={mainCard}>
        <div style={cardHeader}>
            <span onClick={() => setShowBranchInfo(true)} style={{...branchTag, cursor:'pointer'}}>🏪 {user.branchCode}</span>
            <span style={statusTag(isWorking)}>{isWorking ? '근무 중' : '휴식 중'}</span>
        </div>
        <div style={cardBody}>
          {isWorking ? (
            <>
                <p style={{fontSize:'15px', fontWeight:'600', color:'#333', marginBottom:'8px'}}>{user.name}님, {DAILY_GREETINGS[new Date().toLocaleDateString('en-US', { weekday: 'long' })]}</p>
                <div style={timerStyle}>{elapsedTime}</div>
                <button onClick={() => handleAttendance('OUT')} style={clockOutBtn}>퇴근하기</button>
            </>
          ) : (
            <>
                <h2 style={greeting}>{user.name}님, 안녕하세요!</h2>
                <p style={subText}>{upcomingShift ? `📅 다음 근무: ${upcomingShift}` : "오늘도 좋은 하루 되세요 :)"}</p>
                <button onClick={() => !isPendingUnscheduled && handleAttendance('IN')} style={{...clockInBtn, background: isPendingUnscheduled ? '#ccc' : '#ff5c35', cursor: isPendingUnscheduled ? 'not-allowed' : 'pointer'}} disabled={isPendingUnscheduled}>
                    {isPendingUnscheduled ? "승인 대기 중..." : "출근하기"}
                </button>
            </>
          )}
        </div>
      </div>
      
      <div style={{width: '100%', maxWidth: '480px', marginBottom: '15px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
          <h3 style={{fontSize: '15px', fontWeight: 'bold', margin: 0}}>📢 최근 알림 <span style={{background:'#ef4444', color:'#fff', fontSize:'10px', padding:'2px 6px', borderRadius:'10px'}}>{unreadNotis.length}</span></h3>
          <button onClick={() => { setCurrentPage(1); setShowArchiveModal(true); }} style={{fontSize: '12px', color: '#666', background: 'none', border: 'none', cursor: 'pointer'}}>전체 기록 ›</button>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {unreadNotis.length === 0 ? (
            <div style={{padding: '20px', textAlign: 'center', color: '#999', background: '#fff', borderRadius: '12px', fontSize: '13px'}}>새로운 알림이 없습니다.</div>
          ) : (
            unreadNotis.slice(0, 3).map((noti, idx) => (
              <div key={idx} onClick={() => setSelectedNoti(noti)} style={previewItem}>
                <div style={{flex: 1}}>
                  <div style={{fontSize: '13px', fontWeight: 'bold', color: '#111'}}>
                    {noti.type === 'SUB_REQUEST' ? '🤝 대타 요청' : (noti.status === 'approved' || noti.status === 'accepted' ? '✅ 승인됨' : '🔔 알림')}
                  </div>
                  <div style={{fontSize: '12px', color: '#666'}}>
                    {noti.type === 'SUB_REQUEST' ? (noti.toPin === user.pin ? `${noti.fromName}님이 나에게 대타 요청` : `내가 ${noti.toName || '동료'}님에게 대타 요청`) : (noti.reason || (noti.fromName ? `${noti.fromName}님의 요청` : '내용 없음'))}
                  </div>
                </div>
                <div style={{fontSize: '18px', color: '#ccc'}}>›</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={menuGrid}>
        <MenuBtn icon="📘" label="매뉴얼" onClick={() => setActiveMenu('manual')} />
        <MenuBtn icon="📅" label="스케줄" onClick={() => setActiveMenu('schedule')} />
        <MenuBtn icon="👤" label="내 정보" onClick={() => { setEditRequest({...user, reason: ''}); setActiveMenu('myinfo'); }} />
        <MenuBtn icon="🧾" label="기록/정산" onClick={() => setActiveMenu('records')} />
      </div>

      {activeMenu === 'manual' && (
        <ManualModal manuals={manuals} onClose={() => setActiveMenu(null)} />
      )}

      {activeMenu === 'schedule' && (
        <ScheduleModal 
            user={currentUser} 
            allCrews={allCrews} 
            holidays={holidays} 
            oneOffShifts={oneOffShifts} 
            onClose={() => setActiveMenu(null)} 
            onDayClick={(date, crews) => setDayDetailModal({ date, crews })} 
        />
      )}

      {activeMenu === 'myinfo' && (
        <MyInfoModal 
            user={user} 
            currentUser={currentUser} 
            statsMonth={statsMonth} 
            setStatsMonth={setStatsMonth} 
            myStats={myStats} 
            editRequest={editRequest} 
            setEditRequest={setEditRequest} 
            onClose={() => setActiveMenu(null)} 
            onSendRequest={() => { 
                if(!editRequest.reason) return;
                const reports = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
                const report = { id: Date.now(), type: 'PROFILE', reqName: user.name, branchCode: user.branchCode, pin: user.pin, reason: editRequest.reason, requestDate: new Date().toLocaleString(), status: 'pending', isRead: false };
                localStorage.setItem('crew_edit_requests', JSON.stringify([...reports, report]));
                showAlert("요청이 완료 되었습니다.", "📤 요청 완료");
                setActiveMenu(null); 
            }} 
        />
      )}

      {activeMenu === 'records' && (
        <PayStubModal 
            user={currentUser} 
            initialMonth={new Date().toISOString().slice(0, 7)} 
            onBack={() => setActiveMenu(null)} 
        />
      )}

      {selectedNoti && (<div style={overlay} onClick={() => setSelectedNoti(null)}><div style={{...modal, maxWidth:'350px'}} onClick={e => e.stopPropagation()}><div style={modalHeader}><h3>🔔 알림 확인</h3><button onClick={() => setSelectedNoti(null)} style={closeBtn}>×</button></div><div style={{paddingBottom:'20px'}}><div style={reqCard}>{selectedNoti.type==='SUB_REQUEST'?(selectedNoti.toPin===user.pin?(<><div style={{fontWeight:'bold', marginBottom:'5px'}}>🤝 대타 요청</div><div style={{fontSize:'13px', marginBottom:'8px', lineHeight:'1.5'}}><b>{selectedNoti.fromName}</b>님이 <b>나</b>에게 대타를 요청했습니다.</div><div style={{fontSize:'12px', color:'#666', marginBottom:'15px'}}>대상일: {selectedNoti.targetDate} · {selectedNoti.targetStartTime || '13:00'} ~ {selectedNoti.targetEndTime || '18:00'}</div><div style={{display:'flex', gap:'8px'}}><button onClick={()=>handleSubResponse(selectedNoti, true)} style={acceptBtn}>수락</button><button onClick={()=>handleSubResponse(selectedNoti, false)} style={rejectBtn}>거절</button></div></>):(<><div style={{fontWeight:'bold', marginBottom:'5px'}}>🤝 대타 요청 결과</div><div style={{fontSize:'13px', marginBottom:'8px', lineHeight:'1.5'}}><b>내가</b> <b>{selectedNoti.toName || '동료'}</b>님에게 {selectedNoti.targetDate} 근무 대타를 요청했습니다.</div><div style={{fontSize:'12px', color:'#666', marginBottom:'15px'}}>{selectedNoti.status==='accepted'?'✅ 수락됨':'❌ 거절됨'}</div><button onClick={()=>markAsRead(selectedNoti.id)} style={confirmRedBtn}>확인</button></>)):(<><div style={{fontWeight:'bold', marginBottom:'5px'}}>{selectedNoti.status==='approved'?'✅ 승인됨':(selectedNoti.status==='rejected'?'❌ 거절됨':'📤 요청됨')}</div><div style={{fontSize:'13px', marginBottom:'20px', color:'#444'}}>{selectedNoti.reason}</div>{selectedNoti.status!=='pending' && <button onClick={()=>markAsRead(selectedNoti.id)} style={confirmRedBtn}>확인</button>}</>)}</div></div></div></div>)}
      
    {/* --- [최종 업그레이드: 알림 보관함 모달] --- */}
    {showArchiveModal && (
        <div style={overlay} onClick={() => setShowArchiveModal(false)}>
          <div style={{...modal, maxWidth:'460px', maxHeight:'85vh', display:'flex', flexDirection:'column', borderRadius: '28px', border: '1px solid #E5E5EA'}} onClick={e => e.stopPropagation()}>
            <div style={{...modalHeader, borderBottom: '1px solid #F2F2F7', padding: '20px 24px'}}>
              <h3 style={{margin:0, fontSize: '19px', fontWeight: '800', letterSpacing: '-0.5px'}}>🗂️ 알림 보관함</h3>
              <button onClick={() => setShowArchiveModal(false)} style={closeBtn}>×</button>
            </div>

            <div style={{flex:1, overflowY:'auto', padding:'16px', background: '#F8F9FA'}}>
              {currentArchiveItems.length === 0 ? (
                <div style={{textAlign:'center', padding:'60px 20px', color:'#AEAEB2'}}>
                  <div style={{fontSize: '40px', marginBottom: '10px'}}>Empty</div>
                  <div style={{fontSize: '14px'}}>보관된 알림이 없습니다.</div>
                  <div style={{fontSize: '12px', marginTop: '4px'}}>(20일이 지난 기록은 자동 삭제됩니다)</div>
                </div>
              ) : (
                currentArchiveItems.map((n, i) => {
                  // 뱃지 텍스트 및 타입 판별 로직 ✅
                  const isLogType = n.type === 'LOG' || n.type === 'UNSCHEDULED_WORK' || n.type === 'REPORT';
                  const badgeText = n.type === 'SUB_REQUEST' ? '🤝 대타' : isLogType ? '🕒 기록' : '👤 정보';
                  
                  return (
                    <div key={i} onClick={() => { setSelectedNoti(n); setShowArchiveModal(false); }} 
                         style={{...previewItem, marginBottom: '12px', background: '#fff', border: '1px solid #E5E5EA', padding: '16px'}}>
                      <div style={{flex: 1}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                          <span style={{
                            fontSize: '10px', 
                            fontWeight: 'bold', 
                            padding: '3px 8px', 
                            borderRadius: '8px',
                            background: n.status === 'approved' || n.status === 'accepted' ? '#E6FCF5' : n.status === 'rejected' ? '#FFF5F5' : '#F2F2F7',
                            color: n.status === 'approved' || n.status === 'accepted' ? '#20C997' : n.status === 'rejected' ? '#FF6B6B' : '#8E8E93'
                          }}>
                            {badgeText}
                          </span>
                          <span style={{fontSize: '14px', fontWeight: '700', color: '#1C1C1E'}}>
                            {n.status === 'approved' || n.status === 'accepted' ? '요청 승인' : 
                             n.status === 'rejected' ? '요청 거절' : '승인 대기'}
                          </span>
                        </div>
                        
                        {/* 요청 사항 및 사유 상세 표시 ✅ */}
                        <div style={{fontSize: '13px', color: '#3A3A3C', lineHeight: '1.5', fontWeight: '500'}}>
                          {n.type === 'UNSCHEDULED_WORK' && `스케줄 외 근무 신청이 요청되었습니다. · 요청 시간: ${n.startTime || '확인불가'}`}
                          {n.type === 'SUB_REQUEST' && (n.toPin === user.pin ? `[대타 요청] ${n.fromName}님이 나에게 · ${n.targetDate} ${n.targetStartTime || ''}~${n.targetEndTime || ''}` : `[대타 요청] 내가 ${n.toName || '동료'}님에게 · ${n.targetDate}`)}
                          {n.type === 'LOG' && `[기록 수정] ${n.newStartTime}~${n.newEndTime}`}
                          {n.type === 'PROFILE' && `[내 정보 수정]`}
                        </div>
                        
                        <div style={{fontSize: '12px', color: '#8E8E93', marginTop: '4px', fontStyle: 'italic'}}>
                          " {n.reason || (n.fromName ? `${n.fromName}님의 요청` : '상세 사유 없음')} "
                        </div>

                        {n.processedDate && (
                          <div style={{fontSize: '10px', color: '#C7C7CC', marginTop: '8px'}}>
                            처리 일시: {new Date(n.processedDate).toLocaleString('ko-KR')}
                          </div>
                        )}
                      </div>
                      <div style={{fontSize: '18px', color: '#D1D1D6', marginLeft: '10px'}}>›</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* --- 페이지네이션 --- */}
            {totalArchivePages > 1 && (
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', padding: '16px', borderTop: '1px solid #F2F2F7'}}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  style={{background: 'none', border: 'none', color: currentPage === 1 ? '#D1D1D6' : '#007AFF', cursor: 'pointer', fontSize: '14px', fontWeight: '600'}}
                >
                  이전
                </button>
                <span style={{fontSize: '13px', fontWeight: '700', color: '#1C1C1E', background: '#F2F2F7', padding: '4px 12px', borderRadius: '10px'}}>
                  {currentPage} / {totalArchivePages}
                </span>
                <button 
                  disabled={currentPage === totalArchivePages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{background: 'none', border: 'none', color: currentPage === totalArchivePages ? '#D1D1D6' : '#007AFF', cursor: 'pointer', fontSize: '14px', fontWeight: '600'}}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {dayDetailModal && (<div style={{...overlay, zIndex: 1200}} onClick={() => setDayDetailModal(null)}><div style={{...modal, maxWidth:'320px'}} onClick={e => e.stopPropagation()}><div style={modalHeader}><h3>📅 {dayDetailModal.date} 상세</h3><button onClick={() => setDayDetailModal(null)} style={closeBtn}>×</button></div><div style={{padding:'20px', maxHeight:'400px', overflowY:'auto'}}>{dayDetailModal.crews.length === 0 ? <p style={{textAlign:'center', color:'#999'}}>근무자 없음</p> : dayDetailModal.crews.map((c, i) => (<div key={i} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px', background:'#f8f9fa', marginBottom:'8px', borderRadius:'10px', border: c.name === user.name ? '2px solid #3b82f6' : '1px solid #eee'}}><div style={{display:'flex', alignItems:'center'}}><div style={{width:'12px', height:'12px', borderRadius:'50%', background: '#3b82f6', marginRight:'10px', border:'1px solid #fff'}}></div><div><div style={{fontWeight:'bold', color:'#333', fontSize:'14px'}}>{c.name} {c.type === 'SUB' && '(대타)'}</div><div style={{fontSize:'12px', color:'#666'}}>{c.startTime} ~ {c.endTime}</div></div></div>{c.name === user.name && c.type === 'FIXED' && (<button onClick={() => { setDayDetailModal(null); setSubTargetShift({ date: dayDetailModal.date, startTime: c.startTime, endTime: c.endTime }); }} style={{background:'#f3e8ff', color:'#7e22ce', border:'none', padding:'6px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:'bold', cursor:'pointer'}}>✋ 대타요청</button>)}</div>))}</div></div></div>)}
      
      {subTargetShift && (<div style={{...overlay, zIndex: 1300}} onClick={() => setSubTargetShift(null)}><div style={{...modal, height:'auto', margin:'auto', borderRadius:'24px'}} onClick={e => e.stopPropagation()}><h3>🤝 대타 요청 ({subTargetShift.date})</h3><p style={{fontSize:'13px', color:'#666', marginBottom:'15px'}}>누구에게 요청하시겠습니까?</p><div style={{maxHeight:'300px', overflowY:'auto'}}>{coworkers.length === 0 ? <p style={{textAlign:'center', color:'#999', padding:'20px'}}>요청 가능한 동료가 없습니다.</p> : coworkers.map((cw, i) => (<div key={i} onClick={() => requestSubstitute(cw)} style={coworkerItem}><span>👤 {cw.name}</span><button style={reqBtn}>요청</button></div>))}</div></div></div>)}
      
      {unscheduledModalOpen && (<div style={{...overlay, zIndex: 2000}} onClick={() => setUnscheduledModalOpen(false)}><div style={{...modal, maxWidth:'300px'}} onClick={e => e.stopPropagation()}><div style={modalHeader}><h3>🔔 스케줄 외 근무</h3></div><div style={{padding:'20px', textAlign:'center'}}><p style={{marginBottom:'20px', fontSize:'14px', lineHeight:'1.5', color:'#333'}}>현재 시간은 스케줄된 근무 시간이 아닙니다.<br/>관리자에게 <b>근무 승인 요청</b>을 보내시겠습니까?</p><div style={{display:'flex', gap:'10px'}}><button onClick={() => setUnscheduledModalOpen(false)} style={rejectBtn}>취소</button><button onClick={handleUnscheduledRequest} style={approveBtn}>승인 요청</button></div></div></div></div>)}
      
      {overtimeModalOpen && (<div style={{...overlay, zIndex: 2000}}><div style={{...modal, height:'auto'}} onClick={e => e.stopPropagation()}><div style={modalHeader}><h3>🕒 연장 근로 사유</h3></div><div style={{padding:'20px'}}><p style={{fontSize:'13px', color:'#666', marginBottom:'15px'}}>예정된 시간보다 늦게 퇴근하셨습니다.<br/>사유를 선택해주세요. (중복 가능)</p><div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'15px'}}>{['운영 혼잡 도움', '관리자 요청', '기타'].map(reason => (<label key={reason} style={{display:'flex', alignItems:'center', gap:'10px', padding:'10px', border:'1px solid #eee', borderRadius:'8px', cursor:'pointer', background: overtimeReasons.includes(reason)?'#eef2ff':'#fff'}}><input type="checkbox" checked={overtimeReasons.includes(reason)} onChange={(e) => { if (e.target.checked) setOvertimeReasons([...overtimeReasons, reason]); else setOvertimeReasons(overtimeReasons.filter(r => r !== reason)); }} />{reason}</label>))}</div>{overtimeReasons.includes('기타') && <textarea placeholder="기타 사유를 입력해주세요" style={{...textArea, height:'60px', marginBottom:'15px'}} value={overtimeNote} onChange={e => setOvertimeNote(e.target.value)} />}<button onClick={() => { if(pendingLogoutTime) processLogout(pendingLogoutTime, { reasons: overtimeReasons, note: overtimeNote }); }} style={{...submitBtn, background: (overtimeReasons.length > 0 && (!overtimeReasons.includes('기타') || overtimeNote)) ? '#111' : '#ccc', cursor: (overtimeReasons.length > 0 && (!overtimeReasons.includes('기타') || overtimeNote)) ? 'pointer' : 'not-allowed'}} disabled={!(overtimeReasons.length > 0 && (!overtimeReasons.includes('기타') || overtimeNote))}>제출 및 퇴근하기</button></div></div></div>)}
      
      {customAlert.show && (<div style={{...overlay, zIndex: 9999}} onClick={() => setCustomAlert({show:false, message:''})}><div style={{...modal, maxWidth:'320px', height:'auto'}} onClick={e => e.stopPropagation()}><div style={modalHeader}><h3>{customAlert.title || '🔔 알림'}</h3></div><div style={{padding:'20px', textAlign:'center'}}><p style={{marginBottom:'20px', fontSize:'14px', lineHeight:'1.5', whiteSpace:'pre-line', color:'#333'}}>{customAlert.message}</p><button onClick={() => setCustomAlert({show:false, message:''})} style={approveBtn}>확인</button></div></div></div>)}
      {showBranchInfo && BRANCH_INFO[user.branchCode] && (
        <div style={overlay} onClick={() => setShowBranchInfo(false)}>
          <div style={{...modal, maxWidth:'300px'}} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}><h3>🏪 지점 정보</h3><button onClick={() => setShowBranchInfo(false)} style={closeBtn}>×</button></div>
            <div style={{padding:'20px'}}>
              <p style={{marginBottom:'5px'}}><b>{BRANCH_INFO[user.branchCode].name}</b></p>
              <p style={{marginBottom:'5px', fontSize:'13px', color:'#666'}}>{BRANCH_INFO[user.branchCode].address}</p>
              <p style={{marginBottom:'10px'}}><a href={`tel:${BRANCH_INFO[user.branchCode].phone}`} style={{textDecoration:'none', color:'#3b82f6'}}>📞 {BRANCH_INFO[user.branchCode].phone}</a></p>
              <a href={BRANCH_INFO[user.branchCode].link} target="_blank" rel="noreferrer" style={{display:'block', textAlign:'center', background:'#f3f4f6', padding:'10px', borderRadius:'8px', textDecoration:'none', color:'#333', fontSize:'13px'}}>🗺️ 지도 보기</a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ======================================================================
// Styles (Main Page Local Styles)
// ======================================================================

const appContainer: React.CSSProperties = { background: '#F2F2F7', minHeight: '100vh', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1C1C1E', display:'flex', flexDirection:'column', alignItems:'center' };
const headerSection: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width:'100%', maxWidth:'480px' };
const dateTitle: React.CSSProperties = { fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' };
const ghostBtn: React.CSSProperties = { background: 'rgba(118, 118, 128, 0.12)', border: 'none', color: '#007AFF', padding: '6px 12px', borderRadius: '14px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' };

const mainCard: React.CSSProperties = { background: '#FFFFFF', borderRadius: '22px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px', width:'100%', maxWidth:'480px', boxSizing: 'border-box' };
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' };
const branchTag: React.CSSProperties = { background: '#F2F2F7', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#8E8E93' };
const statusTag = (active: boolean) => ({ background: active ? '#e6fcf5' : '#fff5f5', color: active ? '#0ca678' : '#ff6b6b', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' });
const cardBody: React.CSSProperties = { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const greeting: React.CSSProperties = { fontSize: '22px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.5px' };
const subText: React.CSSProperties = { color: '#868e96', fontSize: '13px' };
const timerStyle: React.CSSProperties = { fontSize: '32px', fontWeight: '600', color: '#007AFF', margin: '12px 0', fontVariantNumeric: 'tabular-nums' };
const clockInBtn: React.CSSProperties = { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px', boxShadow: '0 40px 12px rgba(0,0,0,0.1)' };
const clockOutBtn: React.CSSProperties = { width: '100%', padding: '14px', background: '#212529', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };

const menuGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', width:'100%', maxWidth:'480px', marginBottom: '24px' };
const menuItem: React.CSSProperties = { background: '#FFFFFF', padding: '16px 4px', borderRadius: '18px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'transform 0.1s' };
const MenuBtn = ({ icon, label, onClick }: any) => (<div onClick={onClick} style={menuItem}><div style={{ fontSize: '26px', marginBottom: '6px' }}>{icon}</div><div style={{ fontSize: '12px', fontWeight: '500', color: '#1C1C1E' }}>{label}</div></div>);

const previewItem: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: '12px', border: '1px solid #eee', cursor: 'pointer', transition: '0.2s' };
const reqCard: React.CSSProperties = { background: '#f8f9fa', borderRadius: '12px', padding: '15px', marginBottom: '10px', border: '1px solid #eee' };
const acceptBtn: React.CSSProperties = { flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight:'bold' };
const confirmRedBtn: React.CSSProperties = { width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center' };
const coworkerItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #eee', borderRadius: '10px', cursor: 'pointer', marginBottom: '8px' };
const reqBtn: React.CSSProperties = { background: '#ff5c35', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' };
const textArea: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee', boxSizing: 'border-box', outline: 'none' };
const submitBtn: React.CSSProperties = { width: '100%', padding: '14px', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 'bold' };