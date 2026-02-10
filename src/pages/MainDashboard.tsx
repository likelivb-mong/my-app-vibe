import React, { useEffect, useState } from 'react';
import { BRANCHES } from '../utils/branches';
import BranchScheduleModal from '../components/Admin/BranchScheduleModal';
import NotificationCenter from '../components/Admin/NotificationCenter';

interface MainDashboardProps {
  onLogout: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workingCrews, setWorkingCrews] = useState<any[]>([]);
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
      const workData = JSON.parse(localStorage.getItem('working_crews') || '{}');
      setWorkingCrews(Object.values(workData));
      
      const allKeys = Object.keys(localStorage);
      const loadedCrews = allKeys
        .filter(k => k.startsWith('crew_pin_'))
        .map(k => JSON.parse(localStorage.getItem(k) || '{}'));
      setAllCrews(loadedCrews);

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

  const getWorkerStatusBadges = (worker: any) => {
    const badges = [];
    if (worker.isSub) badges.push({ text: '대타', color: '#a855f7' }); 
    if (worker.isUnscheduled) badges.push({ text: '스케줄외', color: '#3b82f6' }); 
    if (worker.isLate) badges.push({ text: '지각', color: '#ef4444' }); 
    return badges;
  };

  const getElapsedTime = (timestamp: number) => {
    const diff = currentTime.getTime() - timestamp;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
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
    if (activeShift) {
      const activeDate = new Date(activeShift.timestamp).toLocaleDateString('en-CA');
      if (activeDate.startsWith(detailTargetMonth)) {
        list = list.filter((l: any) => l.date !== activeDate);
        list.push({
          id: 'active_now', userPin: selectedCrewDetail.pin, userName: selectedCrewDetail.name, type: 'IN',
          date: activeDate, startTime: activeShift.startTime, endTime: '', totalWorkTime: '00:00:00',
          isLate: activeShift.isLate, isUnscheduled: activeShift.isUnscheduled, isSub: activeShift.isSub
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
      const holidayRate = holidaysMap[log.date] || 0;
      const baseRate = selectedCrewDetail.totalHourly || 0;
      tBase += Math.floor(totalMinutes * (baseRate / 60));
      if (holidayRate > 0) tHoliday += Math.floor(totalMinutes * (Math.max(0, holidayRate - baseRate) / 60));
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
      // 일회성 스케줄 삭제
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

  const openHolidaySettings = (dateStr: string) => {
    const next = { ...holidays };
    if (next[dateStr]) delete next[dateStr];
    else next[dateStr] = 1000;
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
              return { ...log, startTime: newStart, endTime: newEnd, totalWorkTime: newTotalTime };
            }
            return log;
          });
          localStorage.setItem('attendance_logs', JSON.stringify(updatedLogs));
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

  return (
    <div style={pageWrapper}>
      <div style={topHeader}>
        <div style={titleGroup}>
          <h1 style={logoText}>지점별 실시간 현황</h1>
          <span style={timeDisplay}>{currentTime.toLocaleString('ko-KR')}</span>
        </div>
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

      <div style={managementGrid}>
        <button onClick={() => window.location.hash = '#pay-stub'} style={mgmtCard}>
          <span style={mgmtEmoji}>💰</span>
          <div style={mgmtTextGroup}>
            <span style={mgmtMainText}>월급여 명세서</span>
            <span style={mgmtSubText}>정산 내역 확인</span>
          </div>
        </button>
        <button onClick={() => window.location.hash = '#manual-admin'} style={mgmtCard}>
          <span style={mgmtEmoji}>📘</span>
          <div style={mgmtTextGroup}>
            <span style={mgmtMainText}>매뉴얼 관리</span>
            <span style={mgmtSubText}>업무 가이드라인</span>
          </div>
        </button>
        <button onClick={() => window.location.hash = '#crew-manager'} style={mgmtCard}>
          <span style={mgmtEmoji}>👥</span>
          <div style={mgmtTextGroup}>
            <span style={mgmtMainText}>크루 관리</span>
            <span style={mgmtSubText}>인사 정보 및 권한</span>
          </div>
        </button>
      </div>

      <div style={divider} />

      <div style={gridContainer}>
        {BRANCHES.map(branch => (
          <div key={branch.code} style={branchCard}>
            <div style={branchCardHeader}>
              <h3 style={branchTitle}>{branch.label}</h3>
              <button onClick={() => setSelectedBranchCal(branch.label)} style={calBtn}>📅 스케줄</button>
            </div>
            <div style={crewList}>
              {workingCrews.filter(c => c.branchCode === branch.code).map((crew, idx) => (
                <div key={idx} style={crewItem} onClick={() => handleCrewClick(crew.name, branch.code)}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <div style={activeIndicator} />
                    <span style={crewName}>{crew.name}</span>
                    <div style={{display:'flex', gap:'4px'}}>
                      {getWorkerStatusBadges(crew).map((badge, bIdx) => (
                        <span key={bIdx} style={{...badgeTag, color: badge.color, border: `1px solid ${badge.color}`}}>{badge.text}</span>
                      ))}
                    </div>
                  </div>
                  <span style={workTime}>{getElapsedTime(crew.timestamp)}</span>
                </div>
              ))}
              {workingCrews.filter(c => c.branchCode === branch.code).length === 0 && (
                <div style={emptyContainer}>
                  <p style={emptyText}>현재 근무중인 크루가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        ))}
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
                  {crewDetailLogs.map((log: any, i: number) => (
                    <li key={log.id || i} style={detailRow}>
                      <span style={detailDate}>{log.date}</span>
                      <span style={detailTime}>{log.startTime || '-'} ~ {log.endTime || '(근무중)'}</span>
                      <span style={detailTotal}>{log.totalWorkTime || '-'}</span>
                      {log.isLate && <span style={detailBadge}>지각</span>}
                      {log.isUnscheduled && <span style={{ ...detailBadge, background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>스케줄외</span>}
                    </li>
                  ))}
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
const topHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' };
const titleGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const logoText: React.CSSProperties = { fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' };
const timeDisplay: React.CSSProperties = { color: '#888', fontSize: '13px', marginTop: '2px' };
const logoutBtn: React.CSSProperties = { background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', padding: '8px 15px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
const managementGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' };
const mgmtCard: React.CSSProperties = { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '18px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', textAlign: 'left', transition: 'transform 0.2s, background 0.2s' };
const mgmtEmoji: React.CSSProperties = { fontSize: '24px' };
const mgmtTextGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const mgmtMainText: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#fff' };
const mgmtSubText: React.CSSProperties = { fontSize: '11px', color: '#8e8e93', marginTop: '2px' };
const divider: React.CSSProperties = { height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '30px' };
const gridContainer: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' };
const branchCard: React.CSSProperties = { background: '#1c1c1e', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' };
const branchCardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };
const branchTitle: React.CSSProperties = { color: '#fff', fontSize: '19px', fontWeight: '800' };
const calBtn: React.CSSProperties = { background: '#2c2c2e', border: 'none', color: '#0a84ff', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' };
const crewList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
const crewItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '14px', cursor: 'pointer', transition: '0.2s' };
const activeIndicator: React.CSSProperties = { width: '8px', height: '8px', background: '#32d74b', borderRadius: '50%', boxShadow: '0 0 8px #32d74b' };
const crewName: React.CSSProperties = { fontWeight: '700', fontSize: '14px' };
const badgeTag: React.CSSProperties = { fontSize: '9px', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' };
const workTime: React.CSSProperties = { color: '#32d74b', fontSize: '13px', fontWeight: '700', fontFamily: 'monospace' };
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
const detailRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '13px', flexWrap: 'wrap' };
const detailDate: React.CSSProperties = { fontWeight: '700', color: '#fff', minWidth: '100px' };
const detailTime: React.CSSProperties = { color: '#aaa', flex: 1 };
const detailTotal: React.CSSProperties = { color: '#32d74b', fontWeight: '600', fontFamily: 'monospace' };
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