import React, { useState, useEffect, useMemo } from 'react';

// 분리된 컴포넌트 임포트
import ManualModal from '../components/Crew/ManualModal';
import ScheduleModal from '../components/Crew/ScheduleModal';
import MyInfoModal from '../components/Crew/MyInfoModal';
import PayStubModal from '../components/Crew/PayStubModal';
import { overlay, modal, modalHeader, closeBtn } from '../utils/crewStyles';

// --- 2D 라인 아이콘 컴포넌트 (다크모드 최적화) ---
const Icons = {
  Book: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        <polyline points="10 11 12 13 16 9" strokeWidth="2" stroke="#0A84FF"></polyline>
    </svg>
  ),
  Calendar: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
        <rect x="7" y="13" width="3" height="3" fill="#0A84FF" stroke="none"></rect>
    </svg>
  ),
  FileText: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  ),
  User: () => (
    <svg
      width="50"
      height="50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  )
};

const BRANCH_INFO: {[key: string]: {name: string}} = {
  'GDXC': { name: '엑스케이프 건대1호점' },
  'GDXR': { name: '엑스크라임 건대2호점' },
  'NWXC': { name: '뉴케이스 건대3호점' },
  'GNXC': { name: '강남점' },
  'SWXC': { name: '수원점' },
};

// 요일별 데일리 한마디
const DAILY_GREETINGS: Record<string, string> = {
  Monday: "주말 다음날엔 청소 관리 부탁해요 😊",
  Tuesday: "화이팅! 당신의 미소를 응원해요 💪",
  Wednesday: "오늘은 매장내 비품 점검/주문 주세요 🙌",
  Thursday: "왠지 기분 좋은 날, 행운만 가득 😄",
  Friday: "주말 대비 시설 점검 꼭 부탁드려요 😊",
  Saturday: "오늘도 해피데이, 화이팅 🎉",
  Sunday: "평온한 일요일, 기분 좋은 하루 되세요! 😊",
};

export default function CrewHome() {
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const [manuals, setManuals] = useState<string[]>([]);
  const [allCrews, setAllCrews] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<{[key: string]: number}>({});
  const [oneOffShifts, setOneOffShifts] = useState<any[]>([]);
  
  const [isPendingUnscheduled, setIsPendingUnscheduled] = useState(false);
  const [isPendingNoShowLate, setIsPendingNoShowLate] = useState(false);
  const [statsMonth, setStatsMonth] = useState(new Date().toISOString().slice(0, 7));
  const [myStats, setMyStats] = useState<{ lateCount: number; absentCount: number }>({ lateCount: 0, absentCount: 0 });
  const [editRequest, setEditRequest] = useState<any>({ reason: '' });
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // 요일에 맞는 데일리 인사 문구
  const todayGreetingKey = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayGreeting = DAILY_GREETINGS[todayGreetingKey] || "힘찬 하루 되세요!";

  useEffect(() => {
    const stored = sessionStorage.getItem("current_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      const savedStatus = localStorage.getItem(`work_status_${parsed.phone}`);
      if (savedStatus) {
        const parsedStatus = JSON.parse(savedStatus);
        if (parsedStatus.working) {
          setIsWorking(true);
          setWorkStartTime(parsedStatus.start);
        }
      }
    } else { window.location.hash = "login"; }
  }, []);

  // ✅ 관리자 승인 등으로 localStorage의 work_status_*가 바뀐 것을 주기적으로 반영
  useEffect(() => {
    if (!user) return;
    const syncWorkStatus = () => {
      const savedStatus = localStorage.getItem(`work_status_${user.phone}`);
      if (savedStatus) {
        const parsedStatus = JSON.parse(savedStatus);
        if (parsedStatus.working) {
          setIsWorking(true);
          setWorkStartTime(parsedStatus.start);
          return;
        }
      }
      // 저장된 상태가 없거나 working이 false인 경우 → 비근무 상태로 리셋
      setIsWorking(false);
      setWorkStartTime(null);
      setElapsedTime("00:00:00");
    };
    syncWorkStatus();
    const interval = setInterval(syncWorkStatus, 2000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadData = () => {
      const crewKey = `crew_pin_${user.branchCode}_${user.name}`;
      const latest = JSON.parse(localStorage.getItem(crewKey) || '{}');
      setCurrentUser({ ...user, ...latest });
      
      setManuals(JSON.parse(localStorage.getItem('company_manuals') || '[]'));
      
      // 1. 일회성 일정(대타/교육) 데이터 로드 (실제 저장 키와 맞춤)
      const shifts = JSON.parse(localStorage.getItem('company_one_offs') || '[]');
      setOneOffShifts(shifts);
      
      const allKeys = Object.keys(localStorage);
      setAllCrews(allKeys.filter(k => k.startsWith(`crew_pin_${user.branchCode}_`)).map(k => JSON.parse(localStorage.getItem(k) || '{}')));
      
      // 2. 기존 수정/보고/스케줄 외 근무 알림 로드
      const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
      setIsPendingUnscheduled(logReqs.some((r: any) => r.type === 'UNSCHEDULED_WORK' && r.reqPin === user.pin && r.status === 'pending'));
      setIsPendingNoShowLate(
        logReqs.some(
          (r: any) =>
            r.type === 'REPORT' &&
            r.reportType === 'NO_SHOW_LATE_REQUEST' &&
            r.reqPin === user.pin &&
            r.status === 'pending'
        )
      );

      // 나에게 관련된 요청/알림들
      const subReqs = JSON.parse(localStorage.getItem('sub_requests') || '[]');
      const receivedSubs = subReqs
        .filter((r: any) => r.toPin === user.pin && r.status === 'pending')
        .map((r: any) => ({ ...r, type: 'SUB_REQUEST', isRead: false }));
      const sentSubResults = subReqs
        .filter((r: any) => r.fromPin === user.pin && r.status !== 'pending')
        .map((r: any) => ({ ...r, type: 'SUB_REQUEST' }));

      const editReqs = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
      const myEditNotis = editReqs.filter((r: any) => r.pin === user.pin && (r.status === 'approved' || r.status === 'rejected'));
      const myLogNotis = logReqs.filter((r: any) => r.reqPin === user.pin);

      const requestNotisRaw = [...receivedSubs, ...sentSubResults, ...myEditNotis, ...myLogNotis];
      const uniqueMap = new Map();
      requestNotisRaw.forEach(item => uniqueMap.set(item.id, item));
      const requestNotis = Array.from(uniqueMap.values()).sort((a: any, b: any) => Number(b.id) - Number(a.id));

      // 3. 새로운 일정 알림 생성 (대타/교육)
      const newScheduleNotis = shifts
        .filter((s: any) => s.crewName === user.name && (s.type === 'SUB' || s.type === 'EDU'))
        .map((s: any) => ({
          id: `shift_${s.date}_${s.type}`,
          title: `📌 [${s.type === 'SUB' ? '대타' : '교육'}] 일정이 배정되었습니다.`,
          content: `${s.date} | ${s.startTime} ~ ${s.endTime}`,
          isRead: false,
          type: 'SCHEDULE'
        }));

      // 4. 모든 알림 통합 (요청 + 일정)
      setNotifications([...requestNotis, ...newScheduleNotis]);

      // 간단한 통계 (현재 statsMonth 기준 지각/결근)
      const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
      const monthLogs = allLogs.filter((l: any) => l.userPin === user.pin && (l.date || '').startsWith(statsMonth));
      const lateCount = monthLogs.filter((l: any) => l.isLate).length;
      const absentCount = monthLogs.filter((l: any) => l.type === 'ABSENT').length;
      setMyStats({ lateCount, absentCount });

      // 관리자 달력(BranchScheduleModal)에서 등록한 휴일 데이터를 그대로 반영
      setHolidays(JSON.parse(localStorage.getItem('company_holidays_map') || '{}'));
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (isWorking && workStartTime) {
      interval = setInterval(() => {
        const diff = Date.now() - workStartTime;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const fmt = (n: number) => n.toString().padStart(2, '0');
        setElapsedTime(`${fmt(h)}:${fmt(m)}:${fmt(s)}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorking, workStartTime]);

  // MainDashboard getTodayPlannedShift와 동일: 휴무(OFF) 있으면 null, 일일/대타/교육 있으면 해당 시간, 없으면 고정 스케줄
  const getTodaySchedule = () => {
    if (!currentUser) return null;
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const dayOfWeek = now.getDay();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const sameDayOneOffs = oneOffShifts
      .filter(
        (s: any) =>
          s?.date === todayStr &&
          s?.crewName === currentUser?.name &&
          s?.branchCode === currentUser?.branchCode
      )
      .sort((a: any, b: any) => (Number(b.id) || 0) - (Number(a.id) || 0));

    const hasOff = sameDayOneOffs.some((s: any) => s?.type === 'OFF');
    if (hasOff) return null;

    const oneOff = sameDayOneOffs.find((s: any) => s?.type !== 'OFF');
    if (oneOff?.startTime && oneOff?.endTime) {
      return { startTime: oneOff.startTime, endTime: oneOff.endTime };
    }

    const fixedByMonth = currentUser.fixedSchedules?.[monthKey]?.[dayOfWeek];
    const fixedLegacy = currentUser.fixedSchedules?.[dayOfWeek];
    const fixed = fixedByMonth || fixedLegacy;
    if (fixed?.startTime && fixed?.endTime) {
      return { startTime: fixed.startTime, endTime: fixed.endTime };
    }

    return null;
  };

  const createUnscheduledRequest = () => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
    const report = {
      id: Date.now(),
      type: 'UNSCHEDULED_WORK',
      reqName: user.name,
      reqPin: user.pin,
      branchCode: user.branchCode,
      targetDate: todayStr,
      reason: '스케줄 외 근무 신청이 요청되었습니다.',
      requestDate: now.toLocaleString(),
      startTime: now.toLocaleTimeString('ko-KR', { hour12: false }),
      status: 'pending',
      isRead: false
    };
    localStorage.setItem('log_edit_requests', JSON.stringify([...logReqs, report]));
    setIsPendingUnscheduled(true);
    alert('스케줄 외 근무 승인 요청을 보냈습니다. 관리자 승인 후 근무가 시작됩니다.');
  };

  const createNoShowLateRequest = () => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
    const alreadyPending = logReqs.some(
      (r: any) =>
        r.type === 'REPORT' &&
        r.reportType === 'NO_SHOW_LATE_REQUEST' &&
        r.reqPin === user.pin &&
        r.targetDate === todayStr &&
        r.status === 'pending'
    );
    if (alreadyPending) {
      alert('이미 관리자 승인 대기 중입니다.');
      return;
    }
    const report = {
      id: Date.now(),
      type: 'REPORT',
      reportType: 'NO_SHOW_LATE_REQUEST',
      reqName: user.name,
      reqPin: user.pin,
      branchCode: user.branchCode,
      targetDate: todayStr,
      reason: '무단 결근 잠금 상태 해제 및 지각 출근 승인 요청',
      requestDate: now.toLocaleString(),
      startTime: now.toLocaleTimeString('ko-KR', { hour12: false }),
      status: 'pending',
      isRead: false
    };
    localStorage.setItem('log_edit_requests', JSON.stringify([...logReqs, report]));
    setIsPendingNoShowLate(true);
    alert('관리자에게 지각 출근 승인 요청을 보냈습니다. 승인되면 근무가 시작됩니다.');
  };

  const handleNoShowLateCancel = () => {
    const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
    const updated = logReqs.filter(
      (r: any) => !(r.type === 'REPORT' && r.reportType === 'NO_SHOW_LATE_REQUEST' && r.reqPin === user.pin && r.status === 'pending')
    );
    localStorage.setItem('log_edit_requests', JSON.stringify(updated));
    setIsPendingNoShowLate(false);
    alert('지각 출근 승인 요청이 취소되었습니다.');
  };

  const handleUnscheduledCancel = () => {
    const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
    const updated = logReqs.filter(
      (r: any) => !(r.type === 'UNSCHEDULED_WORK' && r.reqPin === user.pin && r.status === 'pending')
    );
    localStorage.setItem('log_edit_requests', JSON.stringify(updated));
    setIsPendingUnscheduled(false);
    alert('스케줄 외 근무 승인 요청이 취소되었습니다.');
  };

  const handleAttendance = (type: 'IN' | 'OUT') => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const lockKey = `no_show_lock_${user.pin}_${todayStr}`;
    const disciplineKey = `discipline_status_${user.pin}`;

    if (type === 'IN') {
      const discipline = JSON.parse(localStorage.getItem(disciplineKey) || 'null');
      if (discipline?.suspended) {
        alert('현재 징계(근무 정지) 상태입니다. 관리자에게 문의하세요.');
        return;
      }

      if (localStorage.getItem(lockKey) === 'locked') {
        if (isPendingNoShowLate) {
          handleNoShowLateCancel();
          return;
        }
        if (!confirm('무단 결근으로 처리된 상태입니다.\n관리자에게 지각 출근 승인을 요청할까요?')) return;
        createNoShowLateRequest();
        return;
      }

      const schedule = getTodaySchedule();
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // 스케줄이 없는 경우 → 스케줄 외 근무 승인 요청 플로우
      if (!schedule) {
        if (isPendingUnscheduled) {
          handleUnscheduledCancel();
          return;
        }
        if (!confirm('오늘은 스케줄에 없는 근무입니다.\n관리자에게 스케줄 외 근무 승인을 요청할까요?')) return;
        createUnscheduledRequest();
        return;
      }

      // 스케줄 있음: 예정 근무 15분 전 이전에 누르면 스케줄 외 근무 승인 요청
      const [sh, sm] = String(schedule.startTime || '00:00').split(':').map((n: string) => Number(n) || 0);
      const startMinutes = sh * 60 + sm;

      if (nowMinutes < startMinutes - 15) {
        if (isPendingUnscheduled) {
          handleUnscheduledCancel();
          return;
        }
        if (!confirm('예정 근무시간 15분 전 이전에는 스케줄 외 근무로 분류됩니다.\n관리자에게 승인 요청할까요?')) return;
        createUnscheduledRequest();
        return;
      }

      // 예정 근무 15분 전 ~ 이후: 정상 출근 처리. 정시 이후 1분 이상이면 지각, 15분 초과 시 무단 결근
      if (nowMinutes > startMinutes + 15) {
        alert('예정 출근 시간보다 15분 이상 지났습니다.\n해당 근무는 무단 결근으로 처리됩니다.');

        const logs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
        logs.push({
          id: Date.now(),
          userName: user.name,
          userPin: user.pin,
          branchCode: user.branchCode,
          type: 'ABSENT',
          date: todayStr,
          reason: '무단 결근'
        });
        localStorage.setItem('attendance_logs', JSON.stringify(logs));
        localStorage.setItem(lockKey, 'locked');

        const myAbsents = logs.filter((l: any) => l.userPin === user.pin && l.type === 'ABSENT');
        if (myAbsents.length >= 2 && !discipline?.suspended) {
          const now = new Date();
          const todayStr = now.toLocaleDateString('en-CA');
          const newDiscipline = {
            suspended: true,
            count: myAbsents.length,
            lastDate: todayStr
          };
          localStorage.setItem(disciplineKey, JSON.stringify(newDiscipline));
          const reports = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
          const report = {
            id: Date.now(),
            type: 'REPORT',
            reqName: user.name,
            reqPin: user.pin,
            branchCode: user.branchCode,
            targetDate: todayStr,
            reason: `무단 결근 ${myAbsents.length}회로 징계(근무 정지) 처리됨`,
            requestDate: now.toLocaleString(),
            status: 'pending',
            isRead: false
          };
          localStorage.setItem('log_edit_requests', JSON.stringify([...reports, report]));
          alert('무단 결근이 2회 이상 누적되어 징계(근무 정지) 상태가 되었습니다.\n관리자에게 알림이 전송되었습니다.');
        }
        return;
      }

      const isLate = nowMinutes >= startMinutes + 1;

      if (!confirm(isLate ? '지각으로 출근 등록하시겠습니까?' : '☀️ 출근 등록을 하시겠습니까?')) return;

      const nowTs = Date.now();
      setWorkStartTime(nowTs);
      setIsWorking(true);
      localStorage.setItem(
        `work_status_${user.phone}`,
        JSON.stringify({ start: nowTs, working: true, isLate, isNoShowLate: false })
      );
      setIsPendingNoShowLate(false);
    } else {
      // 퇴근 처리
      if (!confirm("🌙 퇴근 처리를 하시겠습니까?")) return;

      const statusRaw = localStorage.getItem(`work_status_${user.phone}`);
      const status = statusRaw ? JSON.parse(statusRaw) : null;

      // 근무 시작 정보가 있을 때만 근무 기록 저장
      if (status?.start) {
        const startTs = status.start as number;
        const startDate = new Date(startTs);
        const endDate = new Date();

        // 날짜는 근무 종료 기준으로 저장 (YYYY-MM-DD)
        const dateStr = endDate.toLocaleDateString('en-CA');
        const startTimeStr = startDate.toLocaleTimeString('ko-KR', { hour12: false });
        const endTimeStr = endDate.toLocaleTimeString('ko-KR', { hour12: false });

        const diffMs = endDate.getTime() - startDate.getTime();
        const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const totalWorkTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

        const logs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
        logs.push({
          id: Date.now(),
          userName: user.name,
          userPin: user.pin,
          branchCode: user.branchCode,
          type: 'OUT',
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          totalWorkTime,
          isLate: !!status.isLate,
          isNoShowLate: !!status.isNoShowLate,
          isUnscheduled: !!status.isUnscheduled,
          isSub: !!status.isSub
        });
        localStorage.setItem('attendance_logs', JSON.stringify(logs));
      }

      setIsWorking(false);
      setWorkStartTime(null);
      setElapsedTime("00:00:00");
      localStorage.removeItem(`work_status_${user.phone}`);
      const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
      if (workingCrews[user.pin]) {
        delete workingCrews[user.pin];
        localStorage.setItem('working_crews', JSON.stringify(workingCrews));
      }
    }
  };

  const unreadNotis = useMemo(() => notifications.filter(n => !n.isRead), [notifications]);

  const getDetailedNotiTitle = (noti: any) => {
    if (noti.title) return noti.title;
    if (noti.type === 'LOG') {
      const statusLabel = noti.status === 'approved' ? '승인' : noti.status === 'rejected' ? '거절' : '대기';
      return `🕒 근무 기록 수정 요청 ${statusLabel} · ${noti.targetDate || '-'}`;
    }
    if (noti.type === 'EXPENSE') {
      const statusLabel = noti.status === 'approved' ? '승인' : noti.status === 'rejected' ? '거절' : '대기';
      const amount = Number(noti.amount || 0).toLocaleString();
      return `💰 지원금 청구 ${statusLabel} · ${amount}원`;
    }
    if (noti.type === 'PROFILE') {
      const statusLabel = noti.status === 'approved' ? '승인' : noti.status === 'rejected' ? '거절' : '대기';
      return `🧾 내 정보 수정 요청 ${statusLabel}`;
    }
    if (noti.type === 'UNSCHEDULED_WORK') {
      return `⏰ 스케줄 외 근무 요청 · ${noti.status === 'pending' ? '승인 대기' : noti.status === 'approved' ? '승인 완료' : '거절'}`;
    }
    if (noti.type === 'REPORT' && noti.reportType === 'NO_SHOW_LATE_REQUEST') {
      return `🚨 무단 결근 잠금 해제 요청 · ${noti.status === 'pending' ? '승인 대기' : noti.status === 'approved' ? '승인 완료' : '거절'}`;
    }
    if (noti.type === 'SUB_REQUEST') {
      if (noti.toPin === user.pin) {
        return `🤝 대타 요청 도착 · ${noti.fromName || '동료'} → 나`;
      }
      return `🤝 대타 요청 결과 · ${noti.toName || '동료'} ${noti.status === 'accepted' ? '수락' : noti.status === 'rejected' ? '거절' : '대기'}`;
    }
    return '알림';
  };

  const archiveItems = useMemo(() => {
    const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return notifications
      .filter((n: any) => {
        const tStr = n.requestDate || n.date || '';
        const t = tStr ? new Date(tStr).getTime() : (typeof n.id === 'number' ? n.id : 0);
        if (!t) return true;
        return now - t <= TWENTY_DAYS_MS;
      })
      .sort((a: any, b: any) => {
        const ta = new Date(a.requestDate || a.date || '').getTime() || Number(a.id) || 0;
        const tb = new Date(b.requestDate || b.date || '').getTime() || Number(b.id) || 0;
        return tb - ta;
      });
  }, [notifications]);

  const handleSendProfileRequest = () => {
    if (!editRequest.reason) return;
    const reports = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
    const report = {
      id: Date.now(),
      type: 'PROFILE',
      reqName: user.name,
      branchCode: user.branchCode,
      pin: user.pin,
      reason: editRequest.reason,
      requestDate: new Date().toLocaleString(),
      status: 'pending',
      isRead: false
    };
    localStorage.setItem('crew_edit_requests', JSON.stringify([...reports, report]));
    alert('요청이 완료되었습니다.');
    setEditRequest({ reason: '' });
    setActiveMenu(null);
  };

  if (!user || !currentUser) return null;

  const todaySchedule = getTodaySchedule();

  return (
    <div style={appContainer}>
      <div style={headerSection}>
        <div>
          <span style={dateSmall}>{new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}</span>
          <h1 style={dateTitle}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</h1>
        </div>
        <button onClick={() => setActiveMenu('myinfo')} style={myPageIconBtn}>
          <div style={{ transform: 'scale(0.5)' }}>
            <Icons.User />
          </div>
        </button>
      </div>

      <div style={mainCard}>
        <div style={cardHeader}>
          <span style={branchTag}>{(BRANCH_INFO[user.branchCode]?.name.split(' ')[0] || '') + ' ' + user.branchCode}</span>
          <div style={statusDot(isWorking)}>{isWorking ? '근무 중' : '휴식 중'}</div>
        </div>
        <div style={cardBody}>
          {isWorking ? (
            <>
              <h2 style={greetingTitle}>{user.name}님</h2>
              <p style={greetingDesc}>{todayGreeting}</p>
              <div style={timerStyle}>{elapsedTime}</div>
              <button onClick={() => handleAttendance('OUT')} style={clockOutBtn}>퇴근 하기</button>
            </>
          ) : (
            <>
              <h2 style={greetingTitle}>{user.name}님, 안녕하세요!</h2>
              {todaySchedule ? (
                <div style={shiftInfoBox}>
                  오늘의 예정 근무: {String(todaySchedule.startTime || '').substring(0, 5)} ~ {String(todaySchedule.endTime || '').substring(0, 5)}
                </div>
              ) : (
                <div style={shiftInfoBox}>오늘의 예정 근무 없음</div>
              )}
              {(isPendingUnscheduled || isPendingNoShowLate) && (
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0 0' }}>
                  승인 대기 중입니다. <b>다시 선택하면 요청이 취소됩니다.</b>
                </p>
              )}
              <button
                onClick={() => handleAttendance('IN')}
                style={(isPendingUnscheduled || isPendingNoShowLate) ? clockInBtnPending : clockInBtn}
              >
                {(isPendingUnscheduled || isPendingNoShowLate) ? "승인 대기 중" : "출근 하기"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={menuGrid}>
        <MenuBtn icon={<Icons.Book />} label="매뉴얼" onClick={() => setActiveMenu('manual')} />
        <MenuBtn icon={<Icons.Calendar />} label="스케줄" onClick={() => setActiveMenu('schedule')} />
        <MenuBtn icon={<Icons.FileText />} label="기록/정산" onClick={() => setActiveMenu('records')} />
      </div>

      {/* --- 알림 섹션: 메뉴 하단으로 이동 --- */}
      <div style={sectionWrapper}>
        <div style={sectionHeader}>
          <h3 style={sectionTitle}><Icons.Bell /> 최근 알림 <span style={badgeCount}>{unreadNotis.length}</span></h3>
          <button style={moreBtn} onClick={() => setShowArchiveModal(true)}>전체 기록 ›</button>
        </div>
        <div style={notificationList}>
          {notifications.length > 0 ? (
            notifications.slice(0, 3).map((noti, idx) => (
              <div key={noti.id || idx} style={notiItem}>
                <div style={notiTitle}>{getDetailedNotiTitle(noti)}</div>
                <div style={notiContent}>{noti.content || (noti.status === 'pending' ? '승인 대기 중입니다.' : '처리가 완료되었습니다.')}</div>
              </div>
            ))
          ) : (
            <div style={emptyState}>새로운 알림이 없습니다.</div>
          )}
        </div>
      </div>

      <button onClick={() => { if(confirm("로그아웃 하시겠습니까?")) { sessionStorage.clear(); window.location.hash="login"; } }} style={footerLogoutBtn}>로그아웃</button>
      <div style={footerCopyright}>Copyright © XYNAPS 2026 All rights reserved.</div>

      {/* 알림 보관함 모달 (최근 20일 내 기록) */}
      {showArchiveModal && (
        <div style={overlay} onClick={() => setShowArchiveModal(false)}>
          <div style={{...modal, maxWidth:'460px', maxHeight:'85vh', display:'flex', flexDirection:'column'}} onClick={e => e.stopPropagation()}>
            <div style={{...modalHeader, borderBottom:'1px solid #F2F2F7', padding:'14px 18px'}}>
              <h3 style={{margin:0, fontSize:16, fontWeight:700}}>🗂️ 알림 보관함</h3>
              <button onClick={() => setShowArchiveModal(false)} style={closeBtn}>×</button>
            </div>
            <div style={{flex:1, overflowY:'auto', padding:'14px 16px', background:'#F8F9FA'}}>
              {archiveItems.length === 0 ? (
                <div style={{textAlign:'center', padding:'40px 10px', fontSize:13, color:'#9CA3AF'}}>
                  최근 20일 이내 알림이 없습니다.
                </div>
              ) : (
                archiveItems.map((n: any, idx: number) => {
                  const typeLabel =
                    n.type === 'UNSCHEDULED_WORK' ? '스케줄 외 근무' :
                    n.type === 'LOG' ? '근무 기록 수정' :
                    n.type === 'EXPENSE' ? '지원금' :
                    n.type === 'PROFILE' ? '내 정보 수정' :
                    n.type === 'SUB_REQUEST' ? '대타 요청' :
                    n.type === 'SCHEDULE' ? '일정' : '알림';
                  const statusLabel =
                    n.status === 'approved' || n.status === 'accepted' ? '승인' :
                    n.status === 'rejected' ? '거절' :
                    '요청';
                  const statusColor =
                    statusLabel === '승인' ? '#16A34A' :
                    statusLabel === '거절' ? '#DC2626' :
                    '#6B7280';
                  const createdAt = n.requestDate || n.date || '';
                  const reasonText = n.reason || n.content || '';
                  return (
                    <div key={n.id || idx} style={archiveItem}>
                      <div style={archiveHeaderRow}>
                        <span style={archiveTypeBadge}>{typeLabel}</span>
                        <span style={{...archiveStatusBadge, color: statusColor, borderColor: statusColor}}>
                          {statusLabel}
                        </span>
                      </div>
                      {createdAt && (
                        <div style={archiveMeta}>{createdAt}</div>
                      )}
                      {reasonText && (
                        <div style={archiveReason}>" {reasonText} "</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div style={{padding:'8px 14px', fontSize:11, color:'#9CA3AF', borderTop:'1px solid #E5E7EB', textAlign:'center'}}>
              20일이 지난 알림은 자동으로 영구 삭제됩니다.
            </div>
          </div>
        </div>
      )}

      {/* 모달 생략 (기존과 동일) */}
      {activeMenu === 'manual' && <ManualModal manuals={manuals} onClose={() => setActiveMenu(null)} />}
      {activeMenu === 'schedule' && <ScheduleModal user={currentUser} allCrews={allCrews} holidays={holidays} oneOffShifts={oneOffShifts} onClose={() => setActiveMenu(null)} onDayClick={(date) => console.log(date)} />}
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
          onSendRequest={handleSendProfileRequest}
        />
      )}
      {activeMenu === 'records' && <PayStubModal user={currentUser} initialMonth={statsMonth} onBack={() => setActiveMenu(null)} />}
    </div>
  );
}

// --- 추가 및 변경된 스타일 ---
const notificationList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
const notiItem: React.CSSProperties = { background: '#2C2C2E', padding: '16px 18px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.06)' };
const notiTitle: React.CSSProperties = { fontSize: '14px', fontWeight: '700', color: '#FFFFFF', marginBottom: '6px', lineHeight: 1.3 };
const notiContent: React.CSSProperties = { fontSize: '13px', color: '#8E8E93', lineHeight: 1.45 };

// (나머지 스타일은 기존과 동일)
const appContainer: React.CSSProperties = { background: '#1C1C1E', minHeight: '100vh', padding: '24px 20px 32px', display:'flex', flexDirection:'column', alignItems:'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#FFFFFF', gap: '0' };
const headerSection: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', width:'100%', maxWidth:'480px' };
const dateSmall: React.CSSProperties = { fontSize: '13px', color: '#8E8E93', fontWeight: '600', letterSpacing: '0.02em' };
const dateTitle: React.CSSProperties = { fontSize: '28px', fontWeight: '800', margin: '4px 0 0 0', color: '#FFFFFF', letterSpacing: '-0.02em' };
const myPageIconBtn: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 26,
  background: '#2C2C2E',
  border: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  color: '#0A84FF',
  cursor: 'pointer'
};
const mainCard: React.CSSProperties = { background: '#2C2C2E', borderRadius: '28px', padding: '28px 26px', boxShadow: '0 12px 36px rgba(0,0,0,0.22)', marginBottom: '28px', width:'100%', maxWidth:'480px', boxSizing:'border-box', border: '1px solid rgba(255,255,255,0.04)' };
const cardHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom: '28px', alignItems: 'center' };
const branchTag: React.CSSProperties = { background: '#3A3A3C', color: '#E5E5EA', padding: '10px 16px', borderRadius: '14px', fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em' };
const statusDot = (active: boolean) => ({ padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' as '800', background: active ? 'rgba(48, 209, 88, 0.2)' : '#3A3A3C', color: active ? '#30D158' : '#8E8E93' });
const cardBody: React.CSSProperties = { textAlign: 'center' };
const greetingDesc: React.CSSProperties = { color: '#AEAEB2', marginBottom: '8px', fontSize: '13px', lineHeight: 1.4 };
const greetingTitle: React.CSSProperties = { fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.3 };
const timerStyle: React.CSSProperties = { fontSize: '34px', fontWeight: '700', margin: '14px 0 18px', letterSpacing: '-0.5px', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' as const };
const shiftInfoBox: React.CSSProperties = { background: '#3A3A3C', padding: '14px 18px', borderRadius: '18px', fontSize: '14px', fontWeight: '600', marginBottom: '20px', color: '#E5E5EA', marginTop: '4px' };
const clockInBtn: React.CSSProperties = { width: '100%', padding: '16px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 18px rgba(10,132,255,0.35)' };
const clockInBtnPending: React.CSSProperties = { ...clockInBtn, background: '#4B5563', boxShadow: '0 4px 12px rgba(75,85,99,0.3)', color: '#E5E7EB' };
const clockOutBtn: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  background: '#FEE2E2',
  color: '#B91C1C',
  border: '1px solid #FCA5A5',
  borderRadius: '16px',
  fontSize: '15px',
  fontWeight: '700',
  cursor: 'pointer'
};
const sectionWrapper: React.CSSProperties = { width: '100%', maxWidth: '480px', marginBottom: '16px' };
const sectionHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '0 2px' };
const sectionTitle: React.CSSProperties = { fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#E5E5EA' };
const badgeCount: React.CSSProperties = { background: '#FF453A', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' };
const moreBtn: React.CSSProperties = { fontSize: '13px', color: '#0A84FF', background: 'none', border: 'none', cursor: 'pointer' };
const emptyState: React.CSSProperties = { padding: '24px', textAlign: 'center', color: '#636366', background: '#2C2C2E', borderRadius: '22px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.04)' };
const menuGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', maxWidth: '480px', minWidth: 0, marginBottom: '28px', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' };
const menuItem: React.CSSProperties = { background: '#2C2C2E', padding: '16px 6px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'transform 0.2s', border: '1px solid rgba(255,255,255,0.04)', aspectRatio: '1', minWidth: 0, overflow: 'visible', boxSizing: 'border-box' };
const MenuBtn = ({ icon, label, onClick }: any) => (
    <div onClick={onClick} style={menuItem} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
        <div style={{ color: '#0A84FF', flexShrink: 0 }}>{icon}</div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF', lineHeight: 1.25, wordBreak: 'keep-all', overflow: 'visible' }}>{label}</div>
    </div>
);
const footerLogoutBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#636366', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginBottom: '12px', marginTop: '32px' };
const footerCopyright: React.CSSProperties = { fontSize: '10px', color: '#555', marginBottom: '24px', textAlign: 'center' };

const archiveItem: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 14,
  padding: '12px 12px',
  marginBottom: 10,
  border: '1px solid #E5E7EB'
};

const archiveHeaderRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6
};

const archiveTypeBadge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#4B5563',
  background: '#E5E7EB',
  padding: '2px 8px',
  borderRadius: 999
};

const archiveStatusBadge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 999,
  border: '1px solid transparent'
};

const archiveMeta: React.CSSProperties = {
  fontSize: 11,
  color: '#6B7280',
  marginBottom: 4
};

const archiveReason: React.CSSProperties = {
  fontSize: 12,
  color: '#374151',
  fontStyle: 'italic'
};