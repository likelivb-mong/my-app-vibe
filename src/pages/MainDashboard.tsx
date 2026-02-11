import React, { useEffect, useState } from 'react';
import { BRANCHES } from '../utils/branches';
import BranchScheduleModal from '../components/Admin/BranchScheduleModal';
import NotificationCenter from '../components/Admin/NotificationCenter';

interface MainDashboardProps {
  onLogout: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewportWidth, setViewportWidth] = useState<number>(window.innerWidth);
  const [workingCrews, setWorkingCrews] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [allCrews, setAllCrews] = useState<any[]>([]); 
  const [selectedBranchCal, setSelectedBranchCal] = useState<string | null>(null);
  const [selectedCrewDetail, setSelectedCrewDetail] = useState<any | null>(null);
  const [detailTargetMonth, setDetailTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [holidays, setHolidays] = useState<{[key: string]: number}>({});
  const [oneOffShifts, setOneOffShifts] = useState<any[]>([]); 
  const [requests, setRequests] = useState<any[]>([]);
  const [requestArchive, setRequestArchive] = useState<any[]>([]);
  const [isManagerMenuOpen, setIsManagerMenuOpen] = useState(false);
  const [tempEdits, setTempEdits] = useState<{[reqId: number]: { start: string, end: string }}>({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const syncData = () => {
      const allKeys = Object.keys(localStorage);
      const loadedCrews = allKeys
        .filter(k => k.startsWith('crew_pin_'))
        .map(k => JSON.parse(localStorage.getItem(k) || '{}'));
      setAllCrews(loadedCrews);

      const workData = JSON.parse(localStorage.getItem('working_crews') || '{}');
      const activeRows = loadedCrews
        .map((crew: any) => {
          const phone = crew?.phone;
          if (!phone) return null;
          const statusRaw = localStorage.getItem(`work_status_${phone}`);
          if (!statusRaw) return null;
          try {
            const status = JSON.parse(statusRaw);
            if (!status?.working) return null;
            const work = workData[crew.pin] || {};
            const ts = Number(status.start) || Number(work.timestamp) || Date.now();
            return {
              name: crew.name,
              pin: crew.pin,
              branchCode: crew.branchCode,
              startTime: work.startTime || new Date(ts).toLocaleTimeString('ko-KR', { hour12: false }),
              timestamp: ts,
              isUnscheduled: !!(status.isUnscheduled ?? work.isUnscheduled),
              isLate: !!(status.isLate ?? work.isLate),
              isNoShowLate: !!(status.isNoShowLate ?? work.isNoShowLate),
              isSub: !!work.isSub,
              isActive: true
            };
          } catch (_) {
            return null;
          }
        })
        .filter(Boolean);
      setWorkingCrews(activeRows as any[]);
      setAttendanceLogs(JSON.parse(localStorage.getItem('attendance_logs') || '[]'));

      const profileReqs = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
      const logReqs = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
      const subReqs = JSON.parse(localStorage.getItem('sub_requests') || '[]');
      const pendingProfile = profileReqs.filter((r:any) => r.status === 'pending').map((r:any)=>({...r, type:'PROFILE'}));
      const pendingLogs = logReqs.filter((r:any) => r.status === 'pending').map((r:any)=>({ ...r, type: r.type || 'LOG' }));
      const activeSubs = subReqs
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({ ...r, type: 'SUB_NOTI', toName: loadedCrews.find((c: any) => c.pin === r.toPin)?.name || '?' }));
      setRequests([...pendingProfile, ...pendingLogs, ...activeSubs].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)));
      
      setHolidays(JSON.parse(localStorage.getItem('company_holidays_map') || '{}'));
      setOneOffShifts(JSON.parse(localStorage.getItem('company_one_offs') || '[]'));
      setRequestArchive(JSON.parse(localStorage.getItem('request_archive') || '[]'));
    };
    syncData();
    const interval = setInterval(syncData, 3000);
    return () => { clearInterval(timer); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getWorkerStatusBadges = (worker: any) => {
    const badges = [];
    if (worker.isSub) badges.push({ text: '대타', color: '#a855f7' }); 
    if (worker.isUnscheduled) badges.push({ text: '스케줄외', color: '#3b82f6' }); 
    if (worker.isNoShowLate) badges.push({ text: '무단지각', color: '#f97316' });
    if (worker.isLate) badges.push({ text: '지각', color: '#ef4444' }); 
    return badges;
  };

  const getMobilePriorityNameColor = (worker: any, fallback: string) => {
    // 모바일 폭에서는 뱃지 대신 이름 색으로 상태 우선순위를 빠르게 인지
    if (worker.isLate) return '#ef4444';
    if (worker.isUnscheduled) return '#3b82f6';
    return fallback;
  };

  const getElapsedTime = (timestamp: number) => {
    const diff = currentTime.getTime() - timestamp;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };

  const formatHM = (value?: string) => {
    if (!value) return '--:--';
    const nums = String(value).match(/\d+/g);
    if (!nums || nums.length < 2) return '--:--';
    return `${String(nums[0]).padStart(2, '0')}:${String(nums[1]).padStart(2, '0')}`;
  };

  const getTodayPlannedShift = (crew: any) => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const dayOfWeek = now.getDay();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const sameDayOneOffs = oneOffShifts
      .filter(
        (s: any) =>
          s?.date === todayStr &&
          s?.crewName === crew?.name &&
          s?.branchCode === crew?.branchCode
      )
      .sort((a: any, b: any) => (Number(b.id) || 0) - (Number(a.id) || 0));

    const hasOff = sameDayOneOffs.some((s: any) => s?.type === 'OFF');
    if (hasOff) return null;

    const oneOff = sameDayOneOffs.find((s: any) => s?.type !== 'OFF');
    if (oneOff?.startTime && oneOff?.endTime) {
      return { startTime: oneOff.startTime, endTime: oneOff.endTime };
    }

    const fixedByMonth = crew?.fixedSchedules?.[monthKey]?.[dayOfWeek];
    const fixedLegacy = crew?.fixedSchedules?.[dayOfWeek];
    const fixed = fixedByMonth || fixedLegacy;
    if (fixed?.startTime && fixed?.endTime) {
      return { startTime: fixed.startTime, endTime: fixed.endTime };
    }

    return null;
  };

  const getBranchDailyRows = (branchCode: string) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const active = workingCrews
      .filter((c: any) => c.branchCode === branchCode)
      .map((c: any) => ({ ...c, isActive: true, statusType: 'active', sortTs: Number(c.timestamp) || 0 }));

    const finished = attendanceLogs
      .filter((l: any) => l.branchCode === branchCode && l.type === 'OUT' && l.date === todayStr)
      .map((l: any) => {
        const ts = new Date(`${l.date}T${String(l.startTime || '00:00:00')}`).getTime();
        return {
          name: l.userName,
          pin: l.userPin,
          branchCode: l.branchCode,
          startTime: l.startTime,
          endTime: l.endTime,
          totalWorkTime: l.totalWorkTime,
          isLate: !!l.isLate,
          isUnscheduled: !!l.isUnscheduled,
          isSub: !!l.isSub,
          isActive: false,
          statusType: 'finished',
          sortTs: Number(l.id) || ts || 0
        };
      });

    const planned = allCrews
      .filter((crew: any) => crew?.branchCode === branchCode)
      .map((crew: any) => {
        const schedule = getTodayPlannedShift(crew);
        if (!schedule) return null;
        const ts = new Date(`${todayStr}T${String(schedule.startTime || '00:00:00')}`).getTime();
        return {
          name: crew.name,
          pin: crew.pin,
          branchCode: crew.branchCode,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isActive: false,
          statusType: 'scheduled',
          sortTs: ts || 0
        };
      })
      .filter(Boolean);

    // 같은 근무자 중 active가 있으면 active를 우선 표시
    const mergedByPin = new Map<string, any>();
    const statusPriority: Record<string, number> = { scheduled: 1, finished: 2, active: 3 };
    [...planned, ...finished, ...active].forEach((row: any) => {
      const key = String(row.pin || row.name);
      const prev = mergedByPin.get(key);
      if (!prev) {
        mergedByPin.set(key, row);
        return;
      }
      const prevPriority = statusPriority[prev.statusType] || 0;
      const nextPriority = statusPriority[row.statusType] || 0;
      if (nextPriority > prevPriority || (nextPriority === prevPriority && row.sortTs > prev.sortTs)) {
        mergedByPin.set(key, row);
      }
    });

    const toStartMinutes = (time: string) => {
      const [h, m] = String(time || "99:99").split(":").map(Number);
      return (Number.isFinite(h) ? h : 99) * 60 + (Number.isFinite(m) ? m : 99);
    };

    // 일일 스케줄 기록 내, 출근·예정·퇴근 이름칸 모두 출근 시간(시작 시간) 기준 내림차순 정렬 유지 (늦은 출근 먼저)
    return Array.from(mergedByPin.values()).sort((a: any, b: any) => {
      const diff = toStartMinutes(b.startTime) - toStartMinutes(a.startTime);
      if (diff !== 0) return diff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  };


  const handleCrewClick = (name: string, code: string) => {
    const crew = allCrews.find((c: any) => c.name === name && c.branchCode === code);
    if (crew?.pin) {
      setSelectedCrewDetail(crew);
      setDetailTargetMonth(new Date().toISOString().slice(0, 7));
    }
  };

  const crewDetailLogs = selectedCrewDetail ? (() => {
    const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]') as any[];
    let list = allLogs.filter((l: any) => l.userPin === selectedCrewDetail.pin && (l.type === 'OUT' || l.type === 'ABSENT'));
    const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
    const activeShift = workingCrews[selectedCrewDetail.pin];
    const todayStr = new Date().toLocaleDateString('en-CA');
    const isActuallyWorkingNow = (() => {
      try {
        const phone = selectedCrewDetail?.phone;
        if (!phone) return false;
        const raw = localStorage.getItem(`work_status_${phone}`);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return !!parsed?.working;
      } catch (_) {
        return false;
      }
    })();
    if (activeShift && isActuallyWorkingNow) {
      const activeDate = new Date(activeShift.timestamp).toLocaleDateString('en-CA');
      // 과거에 남은 stale 근무중 데이터가 상세 기록을 덮어쓰지 않도록 오늘 데이터만 근무중으로 표시
      if (activeDate === todayStr && activeDate.startsWith(detailTargetMonth)) {
        list = list.filter((l: any) => l.date !== activeDate);
        list.push({
          id: 'active_now', userPin: selectedCrewDetail.pin, userName: selectedCrewDetail.name, type: 'IN',
          date: activeDate, startTime: activeShift.startTime, endTime: '', totalWorkTime: '00:00:00',
          timestamp: Number(activeShift.timestamp) || Date.now(),
          isLate: activeShift.isLate, isNoShowLate: activeShift.isNoShowLate, isUnscheduled: activeShift.isUnscheduled, isSub: activeShift.isSub
        });
      }
    }
    list = list.filter((l: any) => (l.date || '').startsWith(detailTargetMonth));
    list.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    return list;
  })() : [];

  const crewDetailPaySummary = selectedCrewDetail && crewDetailLogs.length > 0 ? (() => {
    const holidaysMap = JSON.parse(localStorage.getItem('company_holidays_map') || '{}');
    const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
    const myExpenses = allApproved.filter((ex: any) => ex.userPin === selectedCrewDetail.pin && (ex.date || '').startsWith(detailTargetMonth));
    let tBase = 0, tHoliday = 0, tMinutes = 0;
    crewDetailLogs.forEach((log: any) => {
      if (log.type !== 'OUT' || !log.totalWorkTime) return;
      const [h, m] = String(log.totalWorkTime).split(':').map(Number);
      const totalMinutes = (h || 0) * 60 + (m || 0);
      const holidayExtraRate = holidaysMap[log.date] || 0;
      const baseRate = selectedCrewDetail.totalHourly || 0;
      tBase += Math.floor(totalMinutes * (baseRate / 60));
      if (holidayExtraRate > 0) tHoliday += Math.floor(totalMinutes * (holidayExtraRate / 60));
      tMinutes += totalMinutes;
    });
    const totalExp = myExpenses.reduce((acc: number, ex: any) => acc + (Number(ex.amount) || 0), 0);
    const supportPay = Number(selectedCrewDetail.supportPay || 0);
    const gross = tBase + tHoliday + totalExp + supportPay;
    const tax = Math.floor(gross * 0.033);
    const net = gross - tax;
    const hours = Math.floor(tMinutes / 60);
    const mins = tMinutes % 60;
    return { net, timeStr: `${hours}시간 ${mins}분`, gross, tax };
  })() : null;

  const openPayStubForCrew = () => {
    if (!selectedCrewDetail) return;
    try {
      sessionStorage.setItem('paystub_view_crew', JSON.stringify(selectedCrewDetail));
    } catch (_) {}
    window.location.hash = 'pay-stub';
  };

  const handleManagerMenu = () => {
    const input = prompt('관리자 비밀번호를 입력하세요:');
    if (input === '0107') setIsManagerMenuOpen(true);
    else if (input !== null) alert('비밀번호가 일치하지 않습니다.');
  };

  // ✅ [수정 핵심] 고정 스케줄 및 일회성 스케줄 저장 로직 완전체
  const handleSaveSchedule = (targetCrewId: string, dayIdx: number, start: string, end: string, isFixed: boolean, dateOrMonth?: string, type?: string) => {
    const target = allCrews.find((c: any) => c.pin === targetCrewId);
    if (!target) return;

    const key = `crew_pin_${target.branchCode}_${target.name}`;
    const crewData = JSON.parse(localStorage.getItem(key) || '{}');

    if (isFixed && dateOrMonth) {
      // 1. 고정 스케줄 업데이트 (월별 키 구조 적용)
      const currentFixedSchedules = crewData.fixedSchedules || {};
      const monthData = currentFixedSchedules[dateOrMonth] || {};
      
      const updatedMonthData = { 
        ...monthData, 
        [dayIdx]: { startTime: start, endTime: end } 
      };

      const updatedFixedSchedules = {
        ...currentFixedSchedules,
        [dateOrMonth]: updatedMonthData
      };

      localStorage.setItem(key, JSON.stringify({ ...crewData, fixedSchedules: updatedFixedSchedules }));
    } else if (!isFixed && dateOrMonth) {
      // 2. 일회성 스케줄(일일 근무, 대타, 교육) 저장
      const oneOffs = JSON.parse(localStorage.getItem('company_one_offs') || '[]');
      oneOffs.push({
        id: Date.now(),
        date: dateOrMonth, // YYYY-MM-DD
        crewName: target.name,
        branchCode: target.branchCode,
        startTime: start,
        endTime: end,
        type: type || 'WORK',
      });
      localStorage.setItem('company_one_offs', JSON.stringify(oneOffs));
    }

    // ✅ 데이터 동기화 (즉시 반영)
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('crew_pin_'));
    setAllCrews(allKeys.map(k => JSON.parse(localStorage.getItem(k) || '{}')));
    setOneOffShifts(JSON.parse(localStorage.getItem('company_one_offs') || '[]'));
  };

  const handleDeleteSchedule = (dateStr: string, worker: any, deleteFixed: boolean) => {
    const target = allCrews.find((c: any) => c.name === worker.name && c.branchCode === (worker.branchCode || targetBranchCodeFromWorker(worker)));
    if (!target) return;

    const key = `crew_pin_${target.branchCode}_${target.name}`;
    const crewData = JSON.parse(localStorage.getItem(key) || '{}');

    if (deleteFixed) {
      // 고정 스케줄 삭제 (현재 달력의 월 기준)
      const monthKey = dateStr.substring(0, 7); // YYYY-MM
      const dayIdx = new Date(dateStr).getDay();
      
      if (crewData.fixedSchedules && crewData.fixedSchedules[monthKey]) {
        delete crewData.fixedSchedules[monthKey][dayIdx];
        localStorage.setItem(key, JSON.stringify(crewData));
      }
    } else {
      // 해당 날짜의 등록된 내용만 삭제 (OFF 추가 없음). 일회성·대타·교육 등만 제거 → 고정 스케줄이 있으면 다시 그대로 표시됨
      const updated = oneOffShifts.filter((s: any) => !(s.date === dateStr && s.crewName === worker.name));
      localStorage.setItem('company_one_offs', JSON.stringify(updated));
      setOneOffShifts(updated);
    }

    // 데이터 동기화
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('crew_pin_'));
    setAllCrews(allKeys.map(k => JSON.parse(localStorage.getItem(k) || '{}')));
  };

  // 보조 함수: 이름으로 지점 코드를 찾기 위함
  const targetBranchCodeFromWorker = (worker: any) => {
    const c = allCrews.find(ac => ac.name === worker.name);
    return c ? c.branchCode : '';
  };

  const openHolidaySettings = (dateStr: string, extraPay?: number) => {
    const next = { ...holidays };
    if (next[dateStr]) delete next[dateStr];
    else next[dateStr] = Number(extraPay) > 0 ? Number(extraPay) : 1000;
    setHolidays(next);
    localStorage.setItem('company_holidays_map', JSON.stringify(next));
  };

  const formatDateSafe = (d: any) => {
    if (!d) return '-';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
  };

  const matchId = (a: any, b: any) => a != null && b != null && String(a) === String(b);

  const pushToRequestArchive = (req: any, status: 'approved' | 'rejected' | 'cancelled') => {
    const archive = JSON.parse(localStorage.getItem('request_archive') || '[]');
    archive.unshift({ ...req, archiveStatus: status, processedAt: new Date().toISOString() });
    localStorage.setItem('request_archive', JSON.stringify(archive.slice(0, 500)));
  };

  const handleProcessRequest = (req: any, isApproved: boolean) => {
    const status = isApproved ? 'approved' : 'rejected';
    if (req.type === 'PROFILE') {
      const all = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
      const updated = all.map((r: any) => matchId(r.id, req.id) ? { ...r, status } : r);
      localStorage.setItem('crew_edit_requests', JSON.stringify(updated));
      pushToRequestArchive(req, status);
    } else if (req.type === 'UNSCHEDULED_WORK') {
      const all = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
      const updated = all.map((r: any) => matchId(r.id, req.id) ? { ...r, status } : r);
      localStorage.setItem('log_edit_requests', JSON.stringify(updated));
      pushToRequestArchive(req, status);
      if (isApproved) {
        const now = Date.now();
        const startTimeStr = new Date(now).toLocaleTimeString('ko-KR', { hour12: false });
        const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
        workingCrews[req.reqPin] = {
          name: req.reqName,
          branchCode: req.branchCode,
          startTime: startTimeStr,
          timestamp: now,
          isUnscheduled: true,
          isLate: false,
          isSub: false
        };
        localStorage.setItem('working_crews', JSON.stringify(workingCrews));

        // ✅ CrewHome에서 바로 근무 시작 상태로 보이도록 work_status도 함께 세팅
        const crew = allCrews.find((c: any) => c.pin === req.reqPin);
        if (crew?.phone) {
          localStorage.setItem(
            `work_status_${crew.phone}`,
            JSON.stringify({ start: now, working: true, isLate: false, isUnscheduled: true })
          );
        }
      }
    } else if (req.type === 'REPORT') {
      // ✅ 무단 결근/징계 관련 리포트 승인 처리
      const all = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
      const updated = all.map((r: any) => matchId(r.id, req.id) ? { ...r, status } : r);
      localStorage.setItem('log_edit_requests', JSON.stringify(updated));
      pushToRequestArchive(req, status);

      if (isApproved) {
        const isNoShowLateRequest = req.reportType === 'NO_SHOW_LATE_REQUEST';
        const crew = allCrews.find((c: any) => c.name === req.reqName && c.branchCode === req.branchCode);
        if (crew) {
          const pin = crew.pin;
          const phone = crew.phone;

          // 무단 결근 락 해제 (날짜 정보가 있을 경우 해당 날짜 기준)
          if (req.targetDate && pin) {
            const lockKey = `no_show_lock_${pin}_${req.targetDate}`;
            localStorage.removeItem(lockKey);
          }

          // 징계 상태도 해제 (관리자 승인을 통해 복귀하는 의미)
          if (pin) {
            const disciplineKey = `discipline_status_${pin}`;
            const currentDiscipline = JSON.parse(localStorage.getItem(disciplineKey) || 'null');
            if (currentDiscipline) {
              const cleared = { ...currentDiscipline, suspended: false };
              localStorage.setItem(disciplineKey, JSON.stringify(cleared));
            }
          }

          // 승인 시: 지각 뱃지로 근무 시작 처리
          const now = Date.now();
          const startTimeStr = new Date(now).toLocaleTimeString('ko-KR', { hour12: false });
          const wc = JSON.parse(localStorage.getItem('working_crews') || '{}');
          if (pin) {
            wc[pin] = {
              name: crew.name,
              branchCode: crew.branchCode,
              startTime: startTimeStr,
              timestamp: now,
              isUnscheduled: false,
              isLate: true,
              isNoShowLate: isNoShowLateRequest,
              isSub: false
            };
            localStorage.setItem('working_crews', JSON.stringify(wc));
          }

          if (phone) {
            localStorage.setItem(
              `work_status_${phone}`,
              JSON.stringify({ start: now, working: true, isLate: true, isNoShowLate: isNoShowLateRequest, isUnscheduled: false })
            );
          }
        }
      }
    } else if (req.type === 'LOG' || req.type === 'EXPENSE') {
      const all = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
      const updated = all.map((r: any) => matchId(r.id, req.id) ? { ...r, status } : r);
      localStorage.setItem('log_edit_requests', JSON.stringify(updated));
      pushToRequestArchive(req, status);
      if (req.type === 'LOG' && isApproved) {
        const te = tempEdits[req.id];
        const newStart = te?.start ?? req.newStartTime;
        const newEnd = te?.end ?? req.newEndTime ?? '(중)';
        if (newStart && newEnd !== '(중)') {
          const logs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
          const updatedLogs = logs.map((log: any) => {
            const isMatch = req.logId ? log.id === req.logId : (log.date === req.targetDate && log.userPin === req.reqPin);
            if (isMatch) {
              const [startH, startM] = String(newStart).split(':').map(Number);
              const [endH, endM] = String(newEnd).split(':').map(Number);
              const startMin = startH * 60 + startM;
              const endMin = endH * 60 + endM;
              let diffMin = endMin - startMin;
              if (diffMin < 0) diffMin += 24 * 60;
              const h = Math.floor(diffMin / 60);
              const m = diffMin % 60;
              const newTotalTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
              return {
                ...log,
                date: req.targetDate || log.date,
                startTime: newStart,
                endTime: newEnd,
                totalWorkTime: newTotalTime
              };
            }
            return log;
          });
          localStorage.setItem('attendance_logs', JSON.stringify(updatedLogs));
        }
      }
      if (req.type === 'EXPENSE' && isApproved) {
        const approved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
        const alreadyExists = approved.some((ex: any) => String(ex.requestId) === String(req.id));
        if (!alreadyExists) {
          approved.push({
            requestId: req.id,
            userPin: req.reqPin,
            userName: req.reqName,
            branchCode: req.branchCode,
            date: req.targetDate,
            amount: Number(req.amount) || 0,
            category: req.category || '기타',
            reason: req.reason || '',
            receiptImage: req.receiptImage || '',
            approvedAt: new Date().toISOString()
          });
          localStorage.setItem('approved_expenses', JSON.stringify(approved));
        }
      }
    } else if (req.type === 'SUB_NOTI') {
      const all = JSON.parse(localStorage.getItem('sub_requests') || '[]');
      const status = isApproved ? 'accepted' : 'rejected';
      const updated = all.map((r: any) => matchId(r.id, req.id) ? { ...r, status } : r);
      localStorage.setItem('sub_requests', JSON.stringify(updated));
      pushToRequestArchive({ ...req, status }, isApproved ? 'approved' : 'rejected');
      if (isApproved) {
        const toCrew = allCrews.find((c: any) => c.pin === req.toPin);
        const newShift = {
          id: Date.now(),
          date: req.targetDate,
          crewName: toCrew?.name ?? req.toName ?? '크루',
          branchCode: req.branchCode,
          startTime: req.targetStartTime || '13:00',
          endTime: req.targetEndTime || '18:00',
          type: 'SUB',
          replaceTarget: req.fromName
        };
        const shifts = JSON.parse(localStorage.getItem('company_one_offs') || '[]');
        localStorage.setItem('company_one_offs', JSON.stringify([...shifts, newShift]));
      }
    }
    setRequests(prev => prev.filter(r => !matchId(r.id, req.id)));
    setTempEdits(prev => { const next = { ...prev }; delete next[req.id]; return next; });
  };

  const handleClearAllRequests = () => {
    if (!confirm('승인 요청 내역을 전부 삭제할까요?')) return;
    localStorage.setItem('crew_edit_requests', '[]');
    localStorage.setItem('log_edit_requests', '[]');
    localStorage.setItem('sub_requests', '[]');
    setRequests([]);
    setTempEdits({});
  };

  const handleRestoreRequest = (archived: any) => {
    const newId = Date.now();
    const payload = { ...archived, id: newId, status: 'pending', isRead: false };
    delete payload.archiveStatus;
    delete payload.processedAt;
    if (archived.type === 'PROFILE') {
      const all = JSON.parse(localStorage.getItem('crew_edit_requests') || '[]');
      localStorage.setItem('crew_edit_requests', JSON.stringify([...all, payload]));
    } else if (archived.type === 'LOG' || archived.type === 'EXPENSE' || archived.type === 'UNSCHEDULED_WORK') {
      const all = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
      localStorage.setItem('log_edit_requests', JSON.stringify([...all, payload]));
    } else if (archived.type === 'SUB_NOTI' || archived.type === 'SUB_REQUEST') {
      const all = JSON.parse(localStorage.getItem('sub_requests') || '[]');
      const restored = { ...payload, type: 'SUB_REQUEST', status: 'pending' };
      localStorage.setItem('sub_requests', JSON.stringify([...all, restored]));
    }
    const archive = JSON.parse(localStorage.getItem('request_archive') || '[]').filter((a: any) => !(String(a.id) === String(archived.id) && a.processedAt === archived.processedAt));
    localStorage.setItem('request_archive', JSON.stringify(archive));
    setRequestArchive(archive);
    const added = archived.type === 'PROFILE' ? { ...payload, type: 'PROFILE' } : archived.type === 'SUB_NOTI' || archived.type === 'SUB_REQUEST' ? { ...payload, type: 'SUB_NOTI' } : { ...payload, type: archived.type || 'LOG' };
    setRequests(prev => [added, ...prev].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)));
  };

  const isMobileMgmt = viewportWidth <= 560;
  const managementGridStyle: React.CSSProperties = {
    ...managementGrid,
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: isMobileMgmt ? '8px' : managementGrid.gap
  };
  const mgmtCardStyle: React.CSSProperties = {
    ...mgmtCard,
    minHeight: isMobileMgmt ? '96px' : '76px',
    padding: isMobileMgmt ? '10px 6px' : mgmtCard.padding,
    gap: isMobileMgmt ? '8px' : mgmtCard.gap,
    flexDirection: isMobileMgmt ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  };
  const mgmtIconBadgeStyle: React.CSSProperties = {
    ...mgmtIconBadge,
    width: isMobileMgmt ? '28px' : mgmtIconBadge.width,
    height: isMobileMgmt ? '28px' : mgmtIconBadge.height
  };
  const mgmtTextGroupStyle: React.CSSProperties = {
    ...mgmtTextGroup,
    alignItems: 'center',
    width: '100%'
  };
  const mgmtMainTextStyle: React.CSSProperties = {
    ...mgmtMainText,
    fontSize: isMobileMgmt ? '12px' : mgmtMainText.fontSize,
    lineHeight: 1.1,
    whiteSpace: 'nowrap'
  };
  const mgmtSubTextStyle: React.CSSProperties = {
    ...mgmtSubText,
    fontSize: isMobileMgmt ? '9px' : mgmtSubText.fontSize,
    textAlign: 'center',
    lineHeight: 1.15,
    whiteSpace: 'nowrap'
  };

  return (
    <div style={pageWrapper}>
      <div style={topHeader}>
        <div style={titleGroup}>
          <h1 style={logoText}>지점별 실시간 현황</h1>
          <span style={logoSubText}>Live Store Dashboard</span>
        </div>
        <div style={headerRight}>
          <NotificationCenter 
          requests={requests} 
          requestArchive={requestArchive}
          tempEdits={tempEdits} 
          setTempEdits={setTempEdits} 
          handleProcessRequest={handleProcessRequest} 
          handleClearAllRequests={handleClearAllRequests}
          handleRestoreRequest={handleRestoreRequest}
          formatDateSafe={formatDateSafe} 
          setRequests={setRequests}
        />
        </div>
      </div>

      <div style={managementGridStyle}>
        <button onClick={() => window.location.hash = '#pay-stub'} style={mgmtCardStyle}>
          <span style={mgmtIconBadgeStyle}><span style={mgmtIconGlyph}>₩</span></span>
          <div style={mgmtTextGroupStyle}>
            <span style={mgmtMainTextStyle}>Pay</span>
            <span style={mgmtSubTextStyle}>월급여 정산</span>
          </div>
        </button>
        <button onClick={() => window.location.hash = '#manual-admin'} style={mgmtCardStyle}>
          <span style={mgmtIconBadgeStyle}><span style={mgmtIconGlyph}>✎</span></span>
          <div style={mgmtTextGroupStyle}>
            <span style={mgmtMainTextStyle}>Manual</span>
            <span style={mgmtSubTextStyle}>업무 가이드</span>
          </div>
        </button>
        <button onClick={() => window.location.hash = '#crew-manager'} style={mgmtCardStyle}>
          <span style={mgmtIconBadgeStyle}>
            <span style={mgmtPersonIcon}>
              <span style={mgmtPersonHead} />
              <span style={mgmtPersonBody} />
            </span>
          </span>
          <div style={mgmtTextGroupStyle}>
            <span style={mgmtMainTextStyle}>Crew</span>
            <span style={mgmtSubTextStyle}>인사 관리</span>
          </div>
        </button>
      </div>

      <div style={divider} />

      <div style={branchSectionWrap}>
        <div style={{ ...timeDisplay, marginBottom: '12px' }}>{currentTime.toLocaleString('ko-KR')}</div>
        <div style={gridContainer}>
        {BRANCHES.map(branch => (
          <div key={branch.code} style={branchCard}>
            <div style={branchCardHeader}>
              <h3 style={branchTitle}>{branch.label}</h3>
                <button onClick={() => setSelectedBranchCal(branch.label)} style={calBtn}>📅 월간 스케줄</button>
            </div>
            <div style={crewList}>
              {(() => {
                const branchRows = getBranchDailyRows(branch.code);
                return (
                  <>
                    {branchRows.map((crew: any, idx: number) => {
                      const isMobileCompact = viewportWidth <= 560;
                      const isActive = crew.statusType === 'active';
                      const isFinished = crew.statusType === 'finished';
                      const isScheduled = crew.statusType === 'scheduled';
                      const rowOpacity = isActive ? 1 : isFinished ? 0.92 : 0.62;
                      const rowBg = isActive ? 'rgba(255,255,255,0.03)' : isFinished ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)';
                      const baseNameColor = isActive ? '#ffffff' : isFinished ? '#e5e7eb' : '#9ca3af';
                      const nameColor = isMobileCompact ? getMobilePriorityNameColor(crew, baseNameColor) : baseNameColor;
                      const timeColor = isActive ? '#cbd5e1' : isFinished ? '#e5e7eb' : '#9ca3af';
                      const dotColor = isActive ? '#32d74b' : isFinished ? '#d1d5db' : '#6b7280';
                      const dotShadow = isActive ? '0 0 8px #32d74b' : 'none';
                      const statusLabel = isActive ? '출근' : isScheduled ? '예정' : '퇴근';
                      const timeRangeText = isActive
                        ? `${formatHM(crew.startTime)} ~ 근무중`
                        : `${formatHM(crew.startTime)} ~ ${formatHM(crew.endTime)}`;
                      const workedHHMM = isActive
                        ? getElapsedTime(crew.timestamp)
                        : (String(crew.totalWorkTime || '').match(/\d+/g)?.slice(0, 2).map((n: string) => String(Number(n)).padStart(2, '0')).join(':') || '--:--');
                      const timerColor = isActive ? '#facc15' : isFinished ? '#e5e7eb' : '#6b7280';

                      return (
                        <div
                          key={idx}
                          style={{ ...crewItem, opacity: rowOpacity, background: rowBg }}
                          onClick={() => handleCrewClick(crew.name, branch.code)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 auto' }}>
                            <span style={{ ...crewName, color: nameColor, minWidth: '80px', flexShrink: 0 }}>{crew.name}</span>
                          </div>
                          <div style={{ ...workTimeWrap }}>
                            <span style={{ ...workTime, color: timeColor }}>{timeRangeText}</span>
                            <span style={{ ...workTimer, color: timerColor }}>{workedHHMM}</span>
                          </div>
                        </div>
                      );
                    })}
                    {branchRows.length === 0 && (
                      <div style={emptyContainer}>
                        <p style={emptyText}>오늘 근무 기록이 없습니다.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            </div>
          ))}
        </div>
      </div>

      <div style={footerArea}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={handleManagerMenu} style={footerBtn}>⚙️ 관리자 설정</button>
          <button onClick={() => { onLogout(); window.location.hash = "signup"; }} style={logoutBtn}>로그아웃</button>
        </div>
        {isManagerMenuOpen && (
          <div style={bottomDropdownStyle}>
            <button onClick={() => setIsManagerMenuOpen(false)} style={dropdownCloseItem}>❌ 닫기</button>
          </div>
        )}
      </div>

      {selectedBranchCal && (
        <BranchScheduleModal 
          selectedBranch={selectedBranchCal} 
          allCrews={allCrews} 
          holidays={holidays} 
          oneOffShifts={oneOffShifts} 
          onClose={() => setSelectedBranchCal(null)} 
          onSaveSchedule={handleSaveSchedule} 
          onDeleteSchedule={handleDeleteSchedule} 
          onHolidaySetting={openHolidaySettings} 
        />
      )}

      {selectedCrewDetail && (
        <div style={overlay} onClick={() => setSelectedCrewDetail(null)}>
          <div style={detailModal} onClick={e => e.stopPropagation()}>
            <div style={detailModalHeader}>
              <h3 style={detailModalTitle}>{selectedCrewDetail.name} · 근무 상세 기록</h3>
              <button type="button" onClick={() => setSelectedCrewDetail(null)} style={detailCloseBtn}>×</button>
            </div>
            <div style={detailModalBody}>
              <p style={detailHint}>월급여 명세서·근무 기록과 동일한 내역입니다.</p>
              <div style={detailMonthRow}>
                <label style={detailMonthLabel}>조회 월</label>
                <input type="month" value={detailTargetMonth} onChange={e => setDetailTargetMonth(e.target.value)} style={detailMonthInput} />
              </div>
              {crewDetailPaySummary && (
                <div style={detailSummaryCard}>
                  <div style={detailSummaryRow}>
                    <span style={detailSummaryLabel}>{detailTargetMonth.slice(5, 7)}월 예상 수령액</span>
                    <span style={detailSummaryValue}>₩{crewDetailPaySummary.net.toLocaleString()}</span>
                  </div>
                  <div style={detailSummaryRow}>
                    <span style={detailSummaryLabel}>총 근무</span>
                    <span style={detailSummaryValue}>{crewDetailPaySummary.timeStr}</span>
                  </div>
                </div>
              )}
              <div style={detailSectionTitle}>근무 기록 내역</div>
              {crewDetailLogs.length === 0 ? (
                <p style={emptyText}>해당 월 근무 기록이 없습니다.</p>
              ) : (
                <ul style={detailList}>
                  {crewDetailLogs.map((log: any, i: number) => {
                    const day = String(log.date || '').split('-')[2] || '';
                    const timeText =
                      log.type === 'IN'
                        ? `${formatHM(log.startTime)} ~ (근무중)`
                        : log.type === 'ABSENT'
                          ? '-'
                          : `${formatHM(log.startTime)} ~ ${log.endTime ? formatHM(log.endTime) : '-'}`;
                    const totalHHMM =
                      log.type === 'IN' && Number(log.timestamp) > 0
                        ? getElapsedTime(Number(log.timestamp))
                        : (String(log.totalWorkTime || '-').match(/\d+/g)?.slice(0, 2).map((n: string) => String(Number(n)).padStart(2, '0')).join(':') || '-');
                    const badges = [];
                    if (log.type === 'ABSENT') badges.push({ text: '무단 결근', style: { ...detailBadge, background: 'rgba(127,29,29,0.25)', color: '#f87171' } });
                    if (log.isNoShowLate) badges.push({ text: '무단 지각', style: { ...detailBadge, background: 'rgba(249,115,22,0.2)', color: '#fb923c' } });
                    if (log.isLate) badges.push({ text: '지각', style: detailBadge });
                    if (log.isUnscheduled) badges.push({ text: '스케줄외', style: { ...detailBadge, background: 'rgba(59,130,246,0.2)', color: '#60a5fa' } });
                    if (log.isSub) badges.push({ text: '대타', style: { ...detailBadge, background: 'rgba(168,85,247,0.2)', color: '#c084fc' } });

                    return (
                      <li key={log.id || i} style={detailRow}>
                        <div style={detailLeft}>
                          <span style={detailDate}>{day ? `${day}일` : '-'}</span>
                          <span style={detailTime}>{timeText}</span>
                          <div style={detailBadgeRow}>
                            {badges.map((badge, bIdx) => (
                              <span key={bIdx} style={badge.style}>{badge.text}</span>
                            ))}
                          </div>
                        </div>
                        <span style={detailTotal}>{totalHHMM}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button type="button" onClick={openPayStubForCrew} style={detailPayStubBtn}>월급여 명세서에서 보기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- [Apple 스타일 CSS] ---
const pageWrapper: React.CSSProperties = { 
  background: '#000', minHeight: '100vh', padding: '20px 30px 60px', color: '#fff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
};
const topHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' };
const titleGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const headerRight: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 };
const logoText: React.CSSProperties = { fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.15 };
const logoSubText: React.CSSProperties = { color: '#8e8e93', fontSize: '11px', fontWeight: '600', marginTop: '5px', letterSpacing: '0.2px', lineHeight: 1.2 };
const timeDisplay: React.CSSProperties = { color: '#888', fontSize: '13px', marginTop: 0 };
const branchSectionWrap: React.CSSProperties = { marginTop: 0 };
const logoutBtn: React.CSSProperties = { background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', padding: '8px 15px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
const managementGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '26px' };
const mgmtCard: React.CSSProperties = { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '14px 15px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', transition: 'transform 0.2s, background 0.2s' };
const mgmtIconBadge: React.CSSProperties = { width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.55)', background: 'rgba(148,163,184,0.12)', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const mgmtIconGlyph: React.CSSProperties = { fontSize: '15px', fontWeight: '700', lineHeight: 1 };
const mgmtPersonIcon: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', lineHeight: 1 };
const mgmtPersonHead: React.CSSProperties = { width: '7px', height: '7px', borderRadius: '50%', background: '#cbd5e1' };
const mgmtPersonBody: React.CSSProperties = { width: '12px', height: '6px', borderRadius: '6px 6px 4px 4px', background: '#cbd5e1' };
const mgmtTextGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const mgmtMainText: React.CSSProperties = { fontSize: '14px', fontWeight: '700', color: '#fff' };
const mgmtSubText: React.CSSProperties = { fontSize: '10px', color: '#8e8e93', marginTop: '2px' };
const divider: React.CSSProperties = { height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '30px' };
const gridContainer: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const branchCard: React.CSSProperties = { background: '#1c1c1e', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' };
const branchCardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const branchTitle: React.CSSProperties = { color: '#fff', fontSize: '19px', fontWeight: '800' };
const calBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(10,132,255,0.22) 0%, rgba(56,189,248,0.18) 100%)',
  border: '1px solid rgba(56,189,248,0.55)',
  color: '#7dd3fc',
  padding: '8px 14px',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '800',
  letterSpacing: '0.2px',
  boxShadow: '0 4px 12px rgba(56,189,248,0.18)'
};
const crewList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
const crewItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px 28px', borderRadius: '14px', cursor: 'pointer', transition: '0.2s', minHeight: '48px', boxSizing: 'border-box' };
const activeIndicator: React.CSSProperties = { width: '8px', height: '8px', background: '#32d74b', borderRadius: '50%', boxShadow: '0 0 8px #32d74b' };
const crewName: React.CSSProperties = { fontWeight: '700', fontSize: '12px' };
const badgeTag: React.CSSProperties = { fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' };
const workStatusMid: React.CSSProperties = { width: 18, height: 18, borderRadius: '50%', marginLeft: '8px', flexShrink: 0 };
const workTimeWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px', flexShrink: 0 };
const workTime: React.CSSProperties = { color: '#32d74b', fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' };
const workTimer: React.CSSProperties = { fontSize: '12px', fontWeight: '800', fontFamily: 'monospace', minWidth: '44px', textAlign: 'right' };
const emptyContainer: React.CSSProperties = { padding: '30px 0', textAlign: 'center' };
const emptyText: React.CSSProperties = { color: '#48484a', fontSize: '13px', fontWeight: '500' };
const footerArea: React.CSSProperties = { marginTop: '50px', display: 'flex', justifyContent: 'center', position: 'relative' };
const footerBtn: React.CSSProperties = { background: 'none', border: '1px solid #333', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', color: '#8e8e93', cursor: 'pointer' };
const bottomDropdownStyle: React.CSSProperties = { position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)', marginBottom:'10px', background:'#2c2c2e', borderRadius:'14px', width:'200px', overflow:'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
const dropdownItem: React.CSSProperties = { width:'100%', padding:'15px', background:'none', border:'none', color:'#fff', textAlign:'center', cursor:'pointer', fontSize:'13px', fontWeight:'600' };
const dropdownCloseItem: React.CSSProperties = { ...dropdownItem, borderTop:'1px solid #3a3a3c', color:'#8e8e93' };

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const detailModal: React.CSSProperties = { background: '#1c1c1e', borderRadius: '20px', width: '92%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' };
const detailModalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' };
const detailModalTitle: React.CSSProperties = { margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' };
const detailCloseBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer', padding: 0, lineHeight: 1 };
const detailModalBody: React.CSSProperties = { overflowY: 'auto', padding: '16px' };
const detailList: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' };
const detailRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '13px' };
const detailLeft: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, flexWrap: 'wrap' };
const detailDate: React.CSSProperties = { fontWeight: '700', color: '#fff', minWidth: '44px' };
const detailTime: React.CSSProperties = { color: '#aaa' };
const detailBadgeRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' };
const detailTotal: React.CSSProperties = { color: '#facc15', fontWeight: '700', fontFamily: 'monospace', marginLeft: '8px', flexShrink: 0, minWidth: '44px', textAlign: 'right' };
const detailBadge: React.CSSProperties = { fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px', background: 'rgba(255,59,48,0.2)', color: '#ff3b30' };
const detailHint: React.CSSProperties = { fontSize: '12px', color: '#888', marginBottom: '12px' };
const detailMonthRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' };
const detailMonthLabel: React.CSSProperties = { fontSize: '13px', color: '#888', fontWeight: '600' };
const detailMonthInput: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none' };
const detailSummaryCard: React.CSSProperties = { background: 'rgba(48,209,88,0.15)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', border: '1px solid rgba(48,209,88,0.3)' };
const detailSummaryRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' };
const detailSummaryLabel: React.CSSProperties = { color: '#888' };
const detailSummaryValue: React.CSSProperties = { color: '#32d74b', fontWeight: '700', fontSize: '15px' };
const detailSectionTitle: React.CSSProperties = { fontSize: '12px', fontWeight: '700', color: '#888', marginBottom: '10px', textTransform: 'uppercase' };
const detailPayStubBtn: React.CSSProperties = { width: '100%', marginTop: '16px', padding: '14px', background: '#0a84ff', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };

export default MainDashboard;