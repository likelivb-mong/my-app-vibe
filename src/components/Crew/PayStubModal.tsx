import React, { useState, useEffect, useMemo } from 'react';
import AppSelect from '../common/AppSelect';
// 공통 스타일 import
import { 
  overlay, closeBtnIcon, 
  formInput, formSelect, helperText 
} from '../../utils/crewStyles';

const ADMIN_PHONES = ['01097243921', '01086369366'];
const EXPENSE_CATEGORIES = ['교통비', '운영비', '기타'];
const TIME_REASON_OPTIONS = ['출근 선택 Miss', '퇴근 선택 Miss', '직접 입력'];

interface Props {
  user: any;
  initialMonth: string;
  onBack: () => void;
}

export default function PayStubModal({ user, initialMonth, onBack }: Props) {
  const safeInitialMonth = initialMonth || new Date().toISOString().slice(0, 7);
  const [targetMonth, setTargetMonth] = useState(safeInitialMonth);
  const [payRefreshTick, setPayRefreshTick] = useState(Date.now());
  const [logs, setLogs] = useState<any[]>([]);
  const [holidaysMap, setHolidaysMap] = useState<{[key: string]: number}>({});
  const [approvedExpenses, setApprovedExpenses] = useState<any[]>([]); // ✅ 승인된 지원금 상태 추가
    
  const currentUser = JSON.parse(sessionStorage.getItem('current_user') || '{}');
  const userPhone = (currentUser.phone || '').replace(/[^0-9]/g, '');
  const isViewerAdmin = ADMIN_PHONES.includes(userPhone) || currentUser.name === '관리자' || user.name === '관리자';

  // 수정 가능 여부 판단
  const isEditableMonth = useMemo(() => {
    if (!targetMonth) return false;
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);
    return targetMonth === currentMonthStr;
  }, [targetMonth]);

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editMode, setEditMode] = useState<'TIME' | 'EXPENSE'>('TIME'); // ✅ 수정/청구 모드 추가
  const [selectedLogId, setSelectedLogId] = useState<number | string | null>(null);
  
  const [editForm, setEditForm] = useState({
      date: '',
      startTime: '',
      endTime: '',
      reason: '',
      reasonType: '',
      customReason: '',
      expenseAmount: '',
      expenseCategory: EXPENSE_CATEGORIES[0],
      receiptImage: ''
  });

  const formatTimeHM = (timeStr: string) => {
    if (!timeStr) return "00:00";
    const nums = timeStr.match(/\d+/g);
    if (nums && nums.length >= 2) {
        return `${nums[0].padStart(2,'0')}:${nums[1].padStart(2,'0')}`;
    }
    return timeStr;
  };

  useEffect(() => {
    if (!user || !targetMonth) return;
    setHolidaysMap(JSON.parse(localStorage.getItem('company_holidays_map') || '{}'));
    
    // ✅ 승인된 지원금 로드
    const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
    const myApproved = allApproved.filter((ex: any) => ex.userPin === user.pin && (ex.date || '').startsWith(targetMonth));
    setApprovedExpenses(myApproved);

    const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
    let myLogs = allLogs.filter((l: any) => 
        l.userPin === user.pin && l.type === 'OUT' && l.date && l.date.startsWith(targetMonth)
    );

    const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
    const activeShift = workingCrews[user.pin];
    const statusRaw = user?.phone ? localStorage.getItem(`work_status_${user.phone}`) : null;
    let isActuallyWorking = !user?.phone;
    if (statusRaw) {
      try {
        isActuallyWorking = !!JSON.parse(statusRaw)?.working;
      } catch (_) {
        isActuallyWorking = false;
      }
    }

    if (activeShift && activeShift.timestamp && isActuallyWorking) {
        const activeDate = new Date(activeShift.timestamp).toLocaleDateString('en-CA');
        if (activeDate.startsWith(targetMonth)) {
            myLogs.push({
                id: 'active_now', userPin: user.pin, userName: user.name, type: 'IN',
                date: activeDate, startTime: activeShift.startTime, endTime: '',
                totalWorkTime: '00:00:00', isLate: activeShift.isLate,
                isNoShowLate: activeShift.isNoShowLate, isUnscheduled: activeShift.isUnscheduled, isSub: activeShift.isSub
            });
        }
    }

    myLogs.sort((a: any, b: any) => {
        const dtA = (a.date || '') + formatTimeHM(a.startTime);
        const dtB = (b.date || '') + formatTimeHM(b.startTime);
        return dtB.localeCompare(dtA);
    });

    setLogs(myLogs);
  }, [user, targetMonth]);

  useEffect(() => {
    const syncPayTick = () => setPayRefreshTick(Date.now());
    syncPayTick();
    const interval = setInterval(syncPayTick, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 에딧 모드 변경 시 폼 초기화
  useEffect(() => {
    setSelectedLogId(null);
    setEditForm(prev => ({ ...prev, date: '', startTime: '', endTime: '', reason: '', reasonType: '', customReason: '', expenseAmount: '', receiptImage: '' }));
  }, [editMode]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditForm(prev => ({ ...prev, receiptImage: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleLogClick = (log: any) => {
      if (!isEditFormOpen) return;
      setSelectedLogId(log.id);
      setEditForm(prev => ({
          ...prev,
          date: log.date,
          startTime: formatTimeHM(log.startTime),
          endTime: log.type === 'IN' ? '' : formatTimeHM(log.endTime),
          reason: '',
          reasonType: '',
          customReason: ''
      }));
  };

  const calculateLogPay = (log: any) => {
    let totalMinutes = 0;
    if (log.type === 'IN') {
      const timeText = formatTimeHM(log.startTime || '');
      const [sh, sm] = timeText.split(':').map(Number);
      const startDate = new Date(log.date);
      if (!Number.isNaN(startDate.getTime()) && Number.isFinite(sh) && Number.isFinite(sm)) {
        startDate.setHours(sh, sm, 0, 0);
        totalMinutes = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 60000));
      }
    } else {
      if (!log.totalWorkTime) return { minutes: 0, basePay: 0, holidayPay: 0, total: 0 };
      const [h, m] = log.totalWorkTime.split(':').map(Number);
      totalMinutes = (h * 60) + m;
    }

    if (totalMinutes <= 0) return { minutes: 0, basePay: 0, holidayPay: 0, total: 0 };
    // company_holidays_map 값은 "휴일 추가시급"
    const holidayExtraRate = holidaysMap[log.date] || 0;
    const baseRate = Number(user.totalHourly) || 0; 
    let basePay = Math.floor(totalMinutes * (baseRate / 60));
    let holidayPay = 0;
    if (holidayExtraRate > 0) {
        holidayPay = Math.floor(totalMinutes * (holidayExtraRate / 60));
    }
    return { minutes: totalMinutes, basePay, holidayPay, total: basePay + holidayPay, isHoliday: holidayExtraRate > 0 };
  };

  const stats = useMemo(() => {
    let tBase = 0, tHoliday = 0, tMinutes = 0;
    const holidayBreakdown: any[] = [];
    const detailedLogs = logs.map(log => {
      const calc = calculateLogPay(log);
      if (calc.minutes > 0) {
        tBase += calc.basePay;
        tHoliday += calc.holidayPay;
        tMinutes += calc.minutes;
        if (calc.holidayPay > 0) {
          const dayExtraRate = Number(holidaysMap[log.date] || 0);
          holidayBreakdown.push({
            date: log.date,
            minutes: calc.minutes,
            extraRate: dayExtraRate,
            holidayPay: calc.holidayPay
          });
        }
      }
      const dayExpense = approvedExpenses.find(ex => ex.date === log.date);
      return { ...log, ...calc, dayExpense };
    });
    
    const totalExpense = approvedExpenses.reduce((acc, ex) => acc + (Number(ex.amount) || 0), 0);
    const supportPay = Number(user.supportPay || 0);
    const grossPay = tBase + tHoliday + totalExpense + supportPay;
    const tax = Math.floor(grossPay * 0.033);
    const netPay = grossPay - tax;
    
    return { 
        totalBasePay: tBase, totalHolidayPay: tHoliday, totalExpense, supportPay, grossPay, tax, netPay, 
        timeStr: `${Math.floor(tMinutes / 60)}시간 ${tMinutes % 60}분`, 
        detailedLogs,
        holidayBreakdown
    };
  }, [logs, targetMonth, user, holidaysMap, approvedExpenses, payRefreshTick]);

  const handleSubmitEdit = () => {
      if (editMode === 'TIME') {
          if (!selectedLogId) { alert("시간 수정은 리스트에서 대상을 먼저 선택해주세요."); return; }
          if (!editForm.date || !editForm.startTime) { alert("날짜와 출근 시간은 필수입니다."); return; }
          if (isViewerAdmin) {
              if (!confirm("관리자 권한으로 즉시 수정하시겠습니까?")) return;
              const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
              const updated = allLogs.map((l: any) => l.id === selectedLogId ? { ...l, date: editForm.date, startTime: editForm.startTime, endTime: editForm.endTime } : l);
              localStorage.setItem('attendance_logs', JSON.stringify(updated));
              alert("수정되었습니다."); window.location.reload();
          } else {
              const finalReason = editForm.reasonType === '직접 입력'
                ? String(editForm.customReason || '').trim()
                : String(editForm.reasonType || '').trim();
              if (!finalReason) { alert("수정 사유를 선택해주세요."); return; }
              const requests = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
              localStorage.setItem('log_edit_requests', JSON.stringify([...requests, { 
                  id: Date.now(), type: 'LOG', reqPin: user.pin, reqName: user.name, branchCode: user.branchCode, 
                  logId: selectedLogId === 'active_now' ? 'ACTIVE' : selectedLogId, 
                  targetDate: editForm.date, newStartTime: editForm.startTime, newEndTime: editForm.endTime || '(중)', 
                  reason: finalReason, status: 'pending', requestDate: new Date().toLocaleString(), isRead: false 
              }]));
              alert("수정 요청을 보냈습니다.");
          }
      } else {
          // 지원금 청구 로직
          if (!editForm.date) { alert("청구 날짜를 선택해주세요."); return; }
          if (!editForm.expenseAmount || Number(editForm.expenseAmount) <= 0) { alert("금액을 입력해주세요."); return; }
          const expenseRequest = {
              id: Date.now(), type: 'EXPENSE', reqPin: user.pin, reqName: user.name, branchCode: user.branchCode,
              targetDate: editForm.date, amount: Number(editForm.expenseAmount), category: editForm.expenseCategory,
              receiptImage: editForm.receiptImage, reason: editForm.expenseCategory, status: 'pending', requestDate: new Date().toLocaleString()
          };
          const requests = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
          localStorage.setItem('log_edit_requests', JSON.stringify([...requests, expenseRequest]));
          alert("지원금 청구 요청을 보냈습니다.");
      }
      setIsEditFormOpen(false);
  };

  const handleViewReceipt = (img?: string) => {
    if (img) {
      const win = window.open("");
      win?.document.write(`<img src="${img}" style="max-width:100%" />`);
    } else alert("등록된 영수증이 없습니다.");
  };

  const getDayOfWeek = (dateStr: string) => ['일','월','화','수','목','금','토'][new Date(dateStr).getDay()];
  const fmt = (n: number) => n?.toLocaleString();
  const compactInput: React.CSSProperties = { ...formInput, fontSize: '13px', padding: '9px 10px', marginBottom: '8px' };
  const compactSelect: React.CSSProperties = { ...formSelect, fontSize: '13px', minHeight: '38px', padding: '8px 10px', marginBottom: '8px' };
  const isTimeReasonReady = editForm.reasonType === '직접 입력'
    ? !!String(editForm.customReason || '').trim()
    : !!String(editForm.reasonType || '').trim();
  const isTimeSubmitReady = !!selectedLogId && !!editForm.date && !!editForm.startTime && (selectedLogId === 'active_now' || !!editForm.endTime) && (isViewerAdmin || isTimeReasonReady);
  const isExpenseSubmitReady = !!editForm.date && !!editForm.expenseCategory && Number(editForm.expenseAmount) > 0;
  const isSubmitReady = editMode === 'TIME' ? isTimeSubmitReady : isExpenseSubmitReady;

  return (
    <div style={overlay} onClick={onBack}>
      <div style={unifiedModal} onClick={e => e.stopPropagation()}>
        <div style={popupHeader}>
          <button style={{...closeBtnIcon, visibility: 'hidden'}}>✕</button>
          <div style={headerCenter}>
              <h3 style={headerTitle}>{user.name}님 급여 명세서</h3>
              <input type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} style={monthSelect} />
          </div>
          <button onClick={onBack} style={closeBtnIcon}>✕</button>
        </div>

        <div style={popupScrollContent}>
          {/* ✅ Hero 카드 (총 수령액) */}
          <div style={heroCard}>
             <div style={heroLabel}>{Number(targetMonth.split('-')[1])}월 예상 수령액</div>
             <div style={heroAmount}>₩{fmt(stats.netPay)}</div>
             <div style={heroMetaBadge}><span>총 근무 {stats.timeStr}</span></div>
          </div>

          {/* ✅ 정산 상세 카드 */}
          <div style={detailCard}>
             <div style={cardHeader}><span style={cardTitle}>📜 정산 상세 내역</span><span style={cardDateBadge}>{targetMonth} 귀속</span></div>
             <div style={sectionGroup}>
                 <div style={sectionLabel}>지급 항목 (+)</div>
                 <div style={row}><span style={label}>기본 급여</span><span style={val}>₩{fmt(stats.totalBasePay)}</span></div>
                 <div style={row}>
                    <span style={{color: stats.totalHolidayPay > 0 ? '#ef4444' : '#9ca3af'}}>휴일 수당 {stats.totalHolidayPay > 0 && '(가산)'}</span>
                    <span style={{...val, color: stats.totalHolidayPay > 0 ? '#ef4444' : '#9ca3af'}}>{stats.totalHolidayPay > 0 ? `+ ₩${fmt(stats.totalHolidayPay)}` : '-'}</span>
                 </div>
                 {stats.holidayBreakdown.length > 0 && (
                   <div style={holidayCalcList}>
                     {stats.holidayBreakdown.map((h, i) => {
                       const hh = Math.floor((Number(h.minutes) || 0) / 60);
                       const mm = (Number(h.minutes) || 0) % 60;
                       return (
                         <div key={`${h.date}-${i}`} style={holidayCalcItem}>
                           • {h.date?.split('-')[2] || ''}일 ({hh}시간 {mm}분) : {h.minutes}분 x ({fmt(h.extraRate)}원 / 60) = ₩{fmt(h.holidayPay)}
                         </div>
                       );
                     })}
                   </div>
                 )}
                 <div style={row}>
                     <div style={{display:'flex', alignItems:'center', gap:'6px'}}><span style={label}>지원금/기타</span><span style={expenseCountBadge}>{approvedExpenses.length}건</span></div>
                     <span style={val}>₩{fmt(stats.totalExpense + stats.supportPay)}</span>
                 </div>
                 {/* 승인된 지원금 미니 리스트 */}
                 {approvedExpenses.length > 0 && (
                     <div style={expenseMiniList}>
                         {approvedExpenses.map((ex, i) => (
                             <div key={i} style={expenseItem} onClick={() => ex.receiptImage && handleViewReceipt(ex.receiptImage)}>
                                 <span style={{cursor: ex.receiptImage ? 'pointer' : 'default'}}>• {ex.date?.split('-')[2]}일 ({ex.category}){ex.receiptImage && ' 📷'}</span>
                                 <span>₩{fmt(ex.amount)}</span>
                             </div>
                         ))}
                     </div>
                 )}
                 <div style={subTotalRow}><span>지급 계</span><span>₩{fmt(stats.grossPay)}</span></div>
             </div>
             <div style={divider}></div>
             <div style={sectionGroup}>
                 <div style={sectionLabel}>공제 항목 (-)</div>
                 <div style={row}><span style={label}>소득세 (3.3%)</span><span style={{...val, color:'#ef4444'}}>- ₩{fmt(stats.tax)}</span></div>
                 <div style={finalResultBox}><div style={finalLabel}>실지급액</div><div style={finalValue}>₩{fmt(stats.netPay)}</div></div>
             </div>
             <div style={bankInfoBox}><div style={bankLabel}>입금 계좌</div><div style={bankValue}>{user.bankName} {user.accountNumber}</div></div>
          </div>

          {/* ✅ 근무 기록 상세 섹션 */}
          <div style={{marginTop:'28px'}}>
            <h4 style={sectionTitle}>🗓️ 근무 기록 상세</h4>
            {isEditableMonth || isViewerAdmin ? (
                <button onClick={() => { setIsEditFormOpen(!isEditFormOpen); setSelectedLogId(null); }} style={editBtn}>
                    {isEditFormOpen ? '🔼 접기' : (isViewerAdmin ? '🛠️ 기록 수정 하기 (관리자)' : '✍️ 기록 수정 하기')}
                </button>
            ) : <div style={readOnlyBanner}>🔒 지난 기록은 조회만 가능합니다</div>}

            {/* ✅ 수정/청구 폼 */}
            {isEditFormOpen && (
                <div style={editFormBox}>
                    <div style={tabGroup}>
                        <button onClick={() => setEditMode('TIME')} style={editMode === 'TIME' ? activeTab : inactiveTab}>시간 수정</button>
                        <button onClick={() => setEditMode('EXPENSE')} style={editMode === 'EXPENSE' ? activeTab : inactiveTab}>지원금 청구</button>
                    </div>
                    {!selectedLogId ? (
                         <div style={{...helperText, background: editMode === 'TIME' ? '#fff1f2' : '#eff6ff', color: editMode === 'TIME' ? '#e11d48' : '#1d4ed8', border: `1px solid ${editMode === 'TIME' ? '#fecdd3' : '#bfdbfe'}`}}>
                            {editMode === 'TIME' ? '⚠️ 시간 수정은 아래 리스트에서 대상을 선택하세요.' : '지원금 청구할 날짜를 아래 리스트에서 선택하세요.'}
                         </div>
                    ) : <div style={helperText}>✅ {editForm.date} 기록이 선택되었습니다.</div>}
                    
                    <div style={{marginTop:'10px'}}>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={e => setEditForm({...editForm, date: e.target.value})}
                          onKeyDown={e => e.preventDefault()}
                          style={compactInput}
                        />
                        {editMode === 'EXPENSE' ? (
                            <>
                                <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                    <AppSelect
                                      value={editForm.expenseCategory}
                                      onChange={(value) => setEditForm({ ...editForm, expenseCategory: value })}
                                      style={compactSelect}
                                      options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                                    />
                                    <input type="number" placeholder="금액(₩)" value={editForm.expenseAmount} onChange={e => setEditForm({...editForm, expenseAmount: e.target.value})} style={compactInput} />
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageChange} style={compactInput} />
                            </>
                        ) : (
                            <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                <input disabled={!selectedLogId} type="time" value={editForm.startTime} onChange={e => setEditForm({...editForm, startTime: e.target.value})} style={compactInput} />
                                <input disabled={!selectedLogId || selectedLogId === 'active_now'} type="time" value={editForm.endTime} onChange={e => setEditForm({...editForm, endTime: e.target.value})} style={compactInput} />
                            </div>
                        )}
                        {editMode === 'TIME' ? (
                          <>
                            <AppSelect
                              value={editForm.reasonType}
                              onChange={(value) => setEditForm({ ...editForm, reasonType: value, customReason: value === '직접 입력' ? editForm.customReason : '' })}
                              style={compactSelect}
                              options={[
                                { value: '', label: '사유 선택하기', disabled: true },
                                ...TIME_REASON_OPTIONS.map((reason) => ({ value: reason, label: reason })),
                              ]}
                            />
                            {editForm.reasonType === '직접 입력' && (
                              <input
                                type="text"
                                placeholder="사유를 직접 입력하세요"
                                value={editForm.customReason}
                                onChange={e => setEditForm({ ...editForm, customReason: e.target.value })}
                                style={compactInput}
                              />
                            )}
                          </>
                        ) : null}
                        <button onClick={handleSubmitEdit} disabled={!isSubmitReady} style={{...sendBtn, background: isSubmitReady ? '#3b82f6' : '#cbd5e1'}}>승인 요청</button>
                    </div>
                </div>
            )}

            {/* ✅ 로그 리스트 */}
            {stats.detailedLogs.length === 0 ? <div style={emptyState}>기록 없음</div> : (
                <div style={logList}>
                    {stats.detailedLogs.map((log: any, idx: number) => {
                        const [h, m] = log.totalWorkTime ? log.totalWorkTime.split(':').map(Number) : [0, 0];
                        const isSelected = selectedLogId === log.id;
                        const isWorking = log.type === 'IN';
                        return (
                            <div key={idx} onClick={() => handleLogClick(log)} style={{...logCard, border: isEditFormOpen && isSelected ? '2px solid #2563EB' : '1px solid #F1F5F9', background: isSelected ? '#EFF6FF' : '#FFF'}}>
                                <div style={{...logDateBox, ...(log.isHoliday ? holidayDateBox : {})}}>
                                  <span style={{...logDay, ...(log.isHoliday ? holidayDayText : {})}}>{log.date.split('-')[2]}</span>
                                  <span style={{...logMonth, ...(log.isHoliday ? holidayMonthText : {})}}>({getDayOfWeek(log.date)})</span>
                                </div>
                                <div style={logInfoBox}>
                                    <div style={logTimeRange}>{formatTimeHM(log.startTime)} ~ {isWorking ? '근무중' : formatTimeHM(log.endTime)}</div>
                                    <div style={logDurationValue}>{isWorking ? 'Working...' : `${h}시간 ${m}분`}</div>
                                    <div style={logBadgeRow}>
                                        {isWorking && <span style={{...badgeBase, background:'#dcfce7', color:'#16a34a'}}>근무중</span>}
                                        {log.isHoliday && <span style={badgeHoliday}>휴일</span>}
                                        {log.isNoShowLate && <span style={badgeNoShowLate}>무단 지각</span>}
                                        {log.isUnscheduled && <span style={badgeOver}>추가</span>}
                                        {log.dayExpense && <span style={badgeExpense}>💰 지원금 ₩{fmt(log.dayExpense.amount)}</span>}
                                    </div>
                                </div>
                                <div style={logAmountBox}><div style={logAmount}>{isWorking ? '-' : `₩${fmt(log.total)}`}</div></div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 스타일 정의 (기존 스타일 유지 + 추가된 UI 요소) ---
const unifiedModal: React.CSSProperties = { background: '#F8FAFC', width: '100%', maxWidth: '420px', height: '100%', display:'flex', flexDirection:'column', overflow: 'hidden' };
const popupHeader: React.CSSProperties = { padding: '16px 12px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', position: 'relative' };
const headerCenter: React.CSSProperties = { flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: '4px' };
const headerTitle: React.CSSProperties = { fontSize: '17px', fontWeight: '800', color: '#1E293B', margin: 0, letterSpacing: '-0.5px' };
const monthSelect: React.CSSProperties = { border: '1.5px solid #E2E8F0', background: '#F8FAFC', padding: '5px 12px', borderRadius: '12px', fontSize: '15px', fontWeight: '800', color: '#2563EB', outline: 'none', cursor: 'pointer', textAlign: 'center' };
const popupScrollContent: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px' };
const heroCard: React.CSSProperties = { background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', padding: '28px 20px', borderRadius: '20px', color: '#fff', textAlign: 'center', marginBottom: '20px', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)' };
const heroLabel: React.CSSProperties = { fontSize: '14px', opacity: 0.9, marginBottom: '4px' };
const heroAmount: React.CSSProperties = { fontSize: '28px', fontWeight: '800', letterSpacing: '-1px' };
const heroMetaBadge: React.CSSProperties = { display: 'inline-flex', background: 'rgba(255,255,255,0.15)', padding: '4px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600' };
const detailCard: React.CSSProperties = { background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' };
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px dashed #E2E8F0', paddingBottom: '15px' };
const cardTitle: React.CSSProperties = { fontSize: '14px', fontWeight: '700', color: '#111827' };
const cardDateBadge: React.CSSProperties = { fontSize: '14px', color: '#475569', background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px' };
const sectionGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
const sectionLabel: React.CSSProperties = { fontSize: '14px', color: '#94A3B8', fontWeight: '700' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#475569' };
const label: React.CSSProperties = { fontWeight: '500' };
const val: React.CSSProperties = { fontWeight: '600', color: '#1E293B' };
const subTotalRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dotted #E2E8F0', paddingTop: '10px' };
const divider: React.CSSProperties = { height: '1px', background: '#F1F5F9', margin: '16px 0' };
const finalResultBox: React.CSSProperties = { marginTop: '12px', background: '#F0FDF4', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', border: '1px solid #BBF7D0' };
const finalLabel: React.CSSProperties = { fontSize: '14px', fontWeight: '700', color: '#166534' };
const finalValue: React.CSSProperties = { fontSize: '14px', fontWeight: '800', color: '#15803D' };
const bankInfoBox: React.CSSProperties = { marginTop: '20px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' };
const bankLabel: React.CSSProperties = { fontSize: '14px', color: '#475569', fontWeight: '600', marginBottom: '2px' };
const bankValue: React.CSSProperties = { fontSize: '14px', fontWeight: '600', color: '#1E293B' };
const sectionTitle: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '12px' };
const editBtn: React.CSSProperties = { width: '100%', padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#475569', fontWeight: '700', fontSize: '13px', marginBottom: '12px', cursor: 'pointer' };
const readOnlyBanner: React.CSSProperties = { width: '100%', padding: '12px', background: '#F8FAFC', color: '#94A3B8', borderRadius: '12px', textAlign: 'center', marginBottom: '15px' };
const editFormBox: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '16px', border: '2px solid #3b82f6', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1)' };
const tabGroup: React.CSSProperties = { display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' };
const activeTab: React.CSSProperties = { flex: 1, padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' };
const inactiveTab: React.CSSProperties = { flex: 1, padding: '8px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' };
const logList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
const logCard: React.CSSProperties = { background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' };
const logDateBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#F8FAFC', padding: '10px 0', borderRadius: '10px', width: '48px' };
const logDay: React.CSSProperties = { fontSize: '18px', fontWeight: '800', color: '#111827' };
const logMonth: React.CSSProperties = { fontSize: '11px', color: '#475569', fontWeight: '700' };
const holidayDateBox: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fecaca' };
const holidayDayText: React.CSSProperties = { color: '#b91c1c' };
const holidayMonthText: React.CSSProperties = { color: '#dc2626', fontWeight: 700 };
const logInfoBox: React.CSSProperties = { flex: 1 };
const logTimeRange: React.CSSProperties = { fontSize: '12px', color: '#475569', fontWeight: '500', marginBottom: '2px' };
const logDurationValue: React.CSSProperties = { fontSize: '15px', fontWeight: '800', color: '#1E293B' };
const logBadgeRow: React.CSSProperties = { display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' };
const badgeBase: React.CSSProperties = { fontSize: '10px', padding: '2px 6px', borderRadius: '5px', fontWeight: '700' };
const badgeHoliday: React.CSSProperties = { ...badgeBase, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' };
const badgeNoShowLate: React.CSSProperties = { ...badgeBase, background: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74' };
const badgeOver: React.CSSProperties = { ...badgeBase, background: '#EFF6FF', color: '#3B82F6' };
const badgeExpense: React.CSSProperties = { ...badgeBase, background: '#f0fdf4', color: '#16a34a' };
const logAmountBox: React.CSSProperties = { textAlign: 'right', minWidth: '70px' };
const logAmount: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#2563EB' };
const emptyState: React.CSSProperties = { padding: '40px', textAlign: 'center', color: '#94A3B8' };
const sendBtn: React.CSSProperties = { width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '8px' };
const expenseCountBadge: React.CSSProperties = { fontSize: '14px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '8px', color: '#64748b', fontWeight: '600' };
const expenseMiniList: React.CSSProperties = { marginTop: '8px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const expenseItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '4px 0', color: '#475569' };
const holidayCalcList: React.CSSProperties = { marginTop: '4px', marginBottom: '2px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '8px' };
const holidayCalcItem: React.CSSProperties = { fontSize: '14px', color: '#9f1239', lineHeight: 1.45 };