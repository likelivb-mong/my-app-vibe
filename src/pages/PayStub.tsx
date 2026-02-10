import React, { useState, useEffect, useMemo } from 'react';
import { BRANCHES } from '../utils/branches';

// ----------------------------------------------------------------------
// [설정] 관리자 목록 및 비용 카테고리
// ----------------------------------------------------------------------
const ADMIN_PHONES = ['01097243921', '01086369366'];
const EXPENSE_CATEGORIES = ['교통비', '식비', '운영비', '기타'];

// ----------------------------------------------------------------------
// [1] 개별 급여 명세서 컴포넌트 (IndividualPayStub)
// ----------------------------------------------------------------------
const IndividualPayStub = ({ user, targetMonth, onBack }: any) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [holidaysMap, setHolidaysMap] = useState<{[key: string]: number}>({});
  const [approvedExpenses, setApprovedExpenses] = useState<any[]>([]); 
  
  const currentUser = JSON.parse(sessionStorage.getItem('current_user') || '{}');
  const userPhone = (currentUser.phone || '').replace(/[^0-9]/g, '');
  const isViewerAdmin = ADMIN_PHONES.includes(userPhone) || currentUser.name === '관리자' || user.name === '관리자';

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editMode, setEditMode] = useState<'TIME' | 'EXPENSE'>('TIME'); 
  const [selectedLogId, setSelectedLogId] = useState<number | string | null>(null);
  
  const [editForm, setEditForm] = useState({
      date: '', // 초기 날짜 비움 (선택 유도)
      startTime: '',
      endTime: '',
      reason: '',
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
    setHolidaysMap(JSON.parse(localStorage.getItem('company_holidays_map') || '{}'));
    const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
    const myApproved = allApproved.filter((ex: any) => ex.userPin === user.pin && (ex.date || '').startsWith(targetMonth));
    setApprovedExpenses(myApproved);

    const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
    let myLogs = allLogs.filter((l: any) => l.userPin === user.pin && l.type === 'OUT');
    const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
    const activeShift = workingCrews[user.pin];

    if (activeShift) {
        const activeDate = new Date(activeShift.timestamp).toLocaleDateString('en-CA');
        if (activeDate.startsWith(targetMonth)) {
            myLogs.push({
                id: 'active_now', userPin: user.pin, userName: user.name, type: 'IN',
                date: activeDate, startTime: activeShift.startTime, endTime: '',
                totalWorkTime: '00:00:00', isLate: activeShift.isLate,
                isUnscheduled: activeShift.isUnscheduled, isSub: activeShift.isSub
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

  // 모드 변경 시 선택 초기화
  useEffect(() => {
      setSelectedLogId(null);
      setEditForm(prev => ({
          ...prev,
          date: '', startTime: '', endTime: '', reason: '', expenseAmount: '', receiptImage: ''
      }));
  }, [editMode]);

  const getDayOfWeek = (dateStr: string) => {
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      return days[new Date(dateStr).getDay()];
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditForm(prev => ({ ...prev, receiptImage: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  // ✅ 리스트 클릭 시에만 데이터 바인딩 로직
  const handleLogClick = (log: any) => {
      if (!isEditFormOpen) return;
      setSelectedLogId(log.id);
      const endTimeVal = log.type === 'IN' ? '' : formatTimeHM(log.endTime);
      setEditForm(prev => ({
          ...prev,
          date: log.date,
          startTime: formatTimeHM(log.startTime),
          endTime: endTimeVal, 
          reason: '' 
      }));
  };

  const handleDeleteLog = () => {
      if (!selectedLogId) { alert("삭제할 기록을 선택해주세요."); return; }
      if (selectedLogId === 'active_now') { alert("현재 진행 중인 근무는 삭제할 수 없습니다."); return; }
      if (!confirm("정말로 삭제하시겠습니까?\n(즉시 반영됩니다)")) return;
      const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
      const updatedLogs = allLogs.filter((l: any) => l.id !== selectedLogId);
      localStorage.setItem('attendance_logs', JSON.stringify(updatedLogs));
      setLogs(prev => prev.filter(l => l.id !== selectedLogId));
      alert("삭제되었습니다.");
      setIsEditFormOpen(false);
  };

  const handleSubmitEdit = () => {
      if (!selectedLogId) { alert("기록 상세 리스트에서 대상을 먼저 선택해주세요."); return; }

      if (editMode === 'TIME') {
          if (!editForm.date || !editForm.startTime) { alert("날짜와 출근 시간은 필수입니다."); return; }
          const isEditingActive = selectedLogId === 'active_now';
          if (isViewerAdmin) {
              if (!confirm("관리자 권한으로 즉시 수정하시겠습니까?")) return;
              if (isEditingActive) {
                  const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
                  if (workingCrews[user.pin]) {
                      workingCrews[user.pin].startTime = editForm.startTime;
                      localStorage.setItem('working_crews', JSON.stringify(workingCrews));
                      alert("현재 근무 시간이 수정되었습니다.");
                      window.location.reload();
                  }
              } else {
                  const allLogs = JSON.parse(localStorage.getItem('attendance_logs') || '[]');
                  const updatedLogs = allLogs.map((log: any) => {
                      if (log.id === selectedLogId) {
                          const [sh, sm] = editForm.startTime.split(':').map(Number);
                          const [eh, em] = (editForm.endTime || "00:00").split(':').map(Number);
                          let startMin = sh * 60 + sm;
                          let endMin = eh * 60 + em;
                          if (endMin < startMin) endMin += 24 * 60;
                          const diffMin = endMin - startMin;
                          const h = Math.floor(diffMin / 60);
                          const m = diffMin % 60;
                          const newTotalTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
                          return {
                              ...log,
                              date: editForm.date,
                              startTime: editForm.startTime,
                              endTime: editForm.endTime,
                              totalWorkTime: newTotalTime,
                              overtimeReason: editForm.reason ? `(관리자수정) ${editForm.reason}` : log.overtimeReason
                          };
                      }
                      return log;
                  });
                  localStorage.setItem('attendance_logs', JSON.stringify(updatedLogs));
                  alert("수정되었습니다.");
                  window.location.reload();
              }
          } else {
              if (!editForm.reason) { alert("수정 사유를 입력해주세요."); return; }
              const newRequest = {
                  id: Date.now(),
                  type: 'LOG', 
                  reqPin: user.pin,
                  reqName: user.name,
                  branchCode: user.branchCode,
                  logId: isEditingActive ? 'ACTIVE_SHIFT' : selectedLogId,
                  targetDate: editForm.date,
                  newStartTime: editForm.startTime,
                  newEndTime: editForm.endTime || '(근무중)',
                  reason: editForm.reason,
                  status: 'pending', 
                  requestDate: new Date().toLocaleString(),
                  isRead: false
              };
              const requests = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
              localStorage.setItem('log_edit_requests', JSON.stringify([...requests, newRequest]));
              alert("관리자에게 수정 요청을 보냈습니다.");
          }
      } else {
          if (!editForm.expenseAmount || Number(editForm.expenseAmount) <= 0) { alert("청구 금액을 입력해주세요."); return; }
          if (!editForm.reason) { alert("청구 사유(상세 내용)를 입력해주세요."); return; }

          const expenseRequest = {
              id: Date.now(),
              type: 'EXPENSE',
              reqPin: user.pin,
              reqName: user.name,
              branchCode: user.branchCode,
              targetDate: editForm.date,
              amount: Number(editForm.expenseAmount),
              category: editForm.expenseCategory,
              receiptImage: editForm.receiptImage,
              reason: editForm.reason,
              status: 'pending',
              requestDate: new Date().toLocaleString()
          };
          const requests = JSON.parse(localStorage.getItem('log_edit_requests') || '[]');
          localStorage.setItem('log_edit_requests', JSON.stringify([...requests, expenseRequest]));
          alert("지원금 청구 요청을 보냈습니다. 관리자 승인 후 정산에 반영됩니다.");
      }
      setIsEditFormOpen(false);
  };

  const calculateLogPay = (log: any) => {
    if (log.type === 'IN' || !log.totalWorkTime) return { minutes: 0, basePay: 0, holidayPay: 0, total: 0 };
    const [h, m] = log.totalWorkTime.split(':').map(Number);
    const totalMinutes = (h * 60) + m;
    const holidayTotalRate = holidaysMap[log.date] || 0;
    const baseRate = user.totalHourly || 0; 
    let basePay = Math.floor(totalMinutes * (baseRate / 60));
    let holidayPay = 0;
    if (holidayTotalRate > 0) {
        const extraRate = Math.max(0, holidayTotalRate - baseRate);
        holidayPay = Math.floor(totalMinutes * (extraRate / 60));
    }
    return { minutes: totalMinutes, basePay, holidayPay, total: basePay + holidayPay, isHoliday: holidayTotalRate > 0 };
  };

  const stats = useMemo(() => {
    let tBase = 0, tHoliday = 0, tMinutes = 0;
    const detailedLogs = logs.map(log => {
      const calc = calculateLogPay(log);
      if (log.type === 'OUT' && log.date.startsWith(targetMonth)) {
          tBase += calc.basePay;
          tHoliday += calc.holidayPay;
          tMinutes += calc.minutes;
      }
      const dayExpense = approvedExpenses.find(ex => ex.date === log.date);
      return { ...log, ...calc, dayExpense };
    });
    const totalExpense = approvedExpenses.reduce((acc, ex) => acc + (Number(ex.amount) || 0), 0);
    const supportPay = Number(user.supportPay || 0);
    const grossPay = tBase + tHoliday + totalExpense + supportPay;
    const tax = Math.floor(grossPay * 0.033);
    const netPay = grossPay - tax;
    const hours = Math.floor(tMinutes / 60);
    const mins = tMinutes % 60;
    return { totalBasePay: tBase, totalHolidayPay: tHoliday, totalExpense, supportPay, grossPay, tax, netPay, timeStr: `${hours}시간 ${mins}분`, detailedLogs };
  }, [logs, targetMonth, user, holidaysMap, approvedExpenses]);

  const fmt = (n: number) => n?.toLocaleString();

  const handleViewReceipt = (img?: string) => {
    if (img) {
      const win = window.open("");
      win?.document.write(`<img src="${img}" style="max-width:100%" />`);
    } else alert("등록된 영수증이 없습니다.");
  };

  return (
    <div style={popupContainer}>
       <div style={popupHeader}>
         <div style={{width: 32}}></div>
         <h3 style={headerTitle}>{user.name}님 급여 명세서</h3>
         <button onClick={onBack} style={closeBtnIcon}>✕</button>
       </div>

       <div style={popupScrollContent}>
          <div style={heroCard}>
             <div style={heroLabel}>{Number(targetMonth.split('-')[1])}월 예상 수령액</div>
             <div style={heroAmount}>₩{fmt(stats.netPay)}</div>
             <div style={heroMetaBadge}><span>총 근무 {stats.timeStr}</span></div>
          </div>

          <div style={detailCard}>
             <div style={cardHeader}>
                <span style={cardTitle}>📜 정산 상세 내역</span>
                <span style={cardDateBadge}>{targetMonth} 귀속</span>
             </div>
             
             <div style={sectionGroup}>
                 <div style={sectionLabel}>지급 항목 (+)</div>
                 <div style={row}><span style={label}>기본 급여</span><span style={val}>₩{fmt(stats.totalBasePay)}</span></div>
                 <div style={row}>
                    <span style={{color: stats.totalHolidayPay > 0 ? '#ef4444' : '#9ca3af'}}>휴일 수당 {stats.totalHolidayPay > 0 && '(가산)'}</span>
                    <span style={{...val, color: stats.totalHolidayPay > 0 ? '#ef4444' : '#9ca3af'}}>{stats.totalHolidayPay > 0 ? `+ ₩${fmt(stats.totalHolidayPay)}` : '-'}</span>
                 </div>
                 <div style={row}>
                     <div style={{display:'flex', alignItems:'center', gap:'6px'}}><span style={label}>지원금/기타</span><span style={expenseCountBadge}>{approvedExpenses.length}건</span></div>
                     <span style={val}>₩{fmt(stats.totalExpense + stats.supportPay)}</span>
                 </div>
                 
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
                 <div style={finalResultBox}>
                     <div style={finalLabel}>예상 수령액 (실지급)</div>
                     <div style={finalValue}>₩{fmt(stats.netPay)}</div>
                 </div>
             </div>
             <div style={bankInfoBox}>
                 <div style={bankLabel}>입금 계좌</div>
                 <div style={bankValue}>{user.bankName} {user.accountNumber}</div>
             </div>
          </div>

          <div style={{marginTop:'24px', paddingBottom:'20px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'12px', padding:'0 4px'}}>
                <h4 style={sectionTitle}>🗓️ 근무 기록 상세</h4>
                <span style={{fontSize:'12px', color:'#64748b'}}>총 {stats.detailedLogs.length}건</span>
            </div>

            <button onClick={() => { setIsEditFormOpen(!isEditFormOpen); setSelectedLogId(null); setEditForm({...editForm, date:''}); }} style={editBtn}>
                {isEditFormOpen ? '🔼 접기' : (isViewerAdmin ? '🛠️ 근무 기록 수정/삭제 (관리자)' : '✍️ 기록 수정 / 지원금 청구')}
            </button>
            
            {isEditFormOpen && (
                <div style={{...editFormBox, borderColor: selectedLogId ? '#3b82f6' : '#cbd5e1'}}>
                    <div style={tabGroup}>
                        <button onClick={() => setEditMode('TIME')} style={editMode === 'TIME' ? activeTab : inactiveTab}>시간 수정</button>
                        <button onClick={() => setEditMode('EXPENSE')} style={editMode === 'EXPENSE' ? activeTab : inactiveTab}>지원금 청구</button>
                    </div>

                    <div style={{marginTop:'15px'}}>
                        {!selectedLogId ? (
                             <div style={{...helperText, background:'#fff1f2', color:'#e11d48', border:'1px solid #fecdd3'}}>
                                ⚠️ 아래 리스트에서 대상을 먼저 선택하세요.
                             </div>
                        ) : (
                             <div style={helperText}>✅ {editForm.date} 기록이 선택되었습니다.</div>
                        )}
                        
                        <div style={{marginBottom:'10px'}}>
                            <label style={formLabel}>선택된 날짜</label>
                            <input 
                                type="date" 
                                value={editForm.date} 
                                readOnly 
                                style={{...formInput, background:'#f8fafc', color:'#64748b', cursor:'not-allowed'}} 
                            />
                        </div>

                        {editMode === 'EXPENSE' ? (
                            <>
                                <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                    <div style={{flex:1}}>
                                        <label style={formLabel}>비용 목적</label>
                                        <select disabled={!selectedLogId} value={editForm.expenseCategory} onChange={e => setEditForm({...editForm, expenseCategory: e.target.value})} style={formInput}>
                                            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{flex:1}}>
                                        <label style={formLabel}>청구 금액(₩)</label>
                                        <input disabled={!selectedLogId} type="number" placeholder="0" value={editForm.expenseAmount} onChange={e => setEditForm({...editForm, expenseAmount: e.target.value})} style={formInput} />
                                    </div>
                                </div>
                                <div style={{marginBottom:'15px'}}>
                                    <label style={formLabel}>영수증 첨부 (선택)</label>
                                    <input disabled={!selectedLogId} type="file" accept="image/*" onChange={handleImageChange} style={formInput} />
                                    {editForm.receiptImage && <img src={editForm.receiptImage} style={previewImg} alt="receipt" />}
                                </div>
                            </>
                        ) : (
                            <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                <div style={{flex:1}}>
                                    <label style={formLabel}>출근 시간</label>
                                    <input disabled={!selectedLogId} type="time" value={editForm.startTime} onChange={e => setEditForm({...editForm, startTime: e.target.value})} style={formInput} />
                                </div>
                                <div style={{flex:1}}>
                                    <label style={formLabel}>퇴근 시간</label>
                                    <input disabled={!selectedLogId || selectedLogId === 'active_now'} type="time" value={editForm.endTime} onChange={e => setEditForm({...editForm, endTime: e.target.value})} style={formInput} />
                                </div>
                            </div>
                        )}
                        
                        <div style={{marginBottom:'15px'}}>
                            <label style={formLabel}>{editMode === 'TIME' ? `수정 사유 ${isViewerAdmin ? '(선택)' : ''}` : '청구 사유 및 메모'}</label>
                            <input disabled={!selectedLogId} type="text" placeholder="내용을 입력하세요" value={editForm.reason} onChange={e => setEditForm({...editForm, reason: e.target.value})} style={formInput} />
                        </div>

                        <div style={{display:'flex', gap:'8px'}}>
                            {isViewerAdmin && selectedLogId && selectedLogId !== 'active_now' && editMode === 'TIME' && (
                                <button onClick={handleDeleteLog} style={{...sendBtn, background:'#ef4444', flex:1}}>🗑️ 삭제</button>
                            )}
                            <button 
                                onClick={handleSubmitEdit} 
                                disabled={!selectedLogId}
                                style={{...sendBtn, flex:2, background: selectedLogId ? '#3b82f6' : '#cbd5e1', cursor: selectedLogId ? 'pointer' : 'not-allowed'}}
                            >
                                {editMode === 'TIME' ? (isViewerAdmin ? '✅ 즉시 수정 반영' : 'SEND (승인 요청)') : '관리자 승인 요청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={logList}>
                {stats.detailedLogs.length === 0 ? (
                    <div style={emptyState}>근무 기록이 없습니다.</div>
                ) : (
                    stats.detailedLogs.map((log: any, idx: number) => {
                        const [h, m] = log.totalWorkTime ? log.totalWorkTime.split(':').map(Number) : [0, 0];
                        const isSelected = selectedLogId === log.id;
                        const isWorking = log.type === 'IN';
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleLogClick(log)}
                                style={{
                                    ...logCard,
                                    border: isEditFormOpen && isSelected ? '2px solid #3b82f6' : '1px solid #F1F5F9',
                                    background: isEditFormOpen && isSelected ? '#eff6ff' : '#fff',
                                    cursor: isEditFormOpen ? 'pointer' : 'default',
                                    transform: isEditFormOpen && isSelected ? 'scale(1.02)' : 'scale(1)'
                                }}
                            >
                                <div style={logDateBox}>
                                    <span style={logDay}>{log.date.split('-')[2]}</span>
                                    <span style={logMonth}>({getDayOfWeek(log.date)})</span>
                                </div>
                                <div style={logInfoBox}>
                                    <div style={logTimeRange}>{formatTimeHM(log.startTime)} ~ {isWorking ? '근무중' : formatTimeHM(log.endTime)}</div>
                                    <div style={logDurationRow}>
                                        <span style={logDurationLabel}>{isWorking ? '현재' : '일일 합계'}</span>
                                        {isWorking ? <span style={{...logDurationValue, color:'#22c55e'}}>Working...</span> : <span style={logDurationValue}>{h}시간 {m}분</span>}
                                        {log.dayExpense && (
                                            <span style={badgeExpense} onClick={(e) => { e.stopPropagation(); log.dayExpense.receiptImage && handleViewReceipt(log.dayExpense.receiptImage); }}>
                                                💰 지원금 ₩{fmt(log.dayExpense.amount)}
                                            </span>
                                        )}
                                    </div>
                                    <div style={logBadgeRow}>
                                        {isWorking && <span style={{...badgeBase, background:'#dcfce7', color:'#16a34a'}}>🟢 근무중</span>}
                                        {log.isHoliday && <span style={badgeHoliday}>휴일</span>}
                                        {log.isUnscheduled && <span style={badgeOver}>추가</span>}
                                        {log.isLate && <span style={badgeLate}>지각</span>}
                                    </div>
                                </div>
                                <div style={logAmountBox}><div style={logAmount}>{isWorking ? '-' : `₩${fmt(log.total)}`}</div></div>
                            </div>
                        );
                    })
                )}
            </div>
          </div>
       </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// [2] 메인 페이지: 지점별 급여 대장 (관리자 뷰 wrapper)
// ----------------------------------------------------------------------
const PayStub = ({ user }: any) => {
  const [crews, setCrews] = useState<any[]>([]);
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [holidaysMap, setHolidaysMap] = useState<{[key: string]: number}>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedBranches, setExpandedBranches] = useState<string[]>([]);
  const [selectedPayStubUser, setSelectedPayStubUser] = useState<any | null>(null);

  useEffect(() => {
    const load = () => {
      const allKeys = Object.keys(localStorage);
      const loadedCrews = allKeys
        .filter(k => k.startsWith('crew_pin_'))
        .map(k => JSON.parse(localStorage.getItem(k) || '{}'))
        .sort((a, b) => (a.joinDate || '').localeCompare(b.joinDate || '') || a.name.localeCompare(b.name));
      setCrews(loadedCrews);
      setHolidaysMap(JSON.parse(localStorage.getItem('company_holidays_map') || '{}'));
      setLogs(JSON.parse(localStorage.getItem('attendance_logs') || '[]'));
    };
    load();
    const stored = sessionStorage.getItem('paystub_view_crew');
    if (stored) {
      try {
        const crew = JSON.parse(stored);
        sessionStorage.removeItem('paystub_view_crew');
        setSelectedPayStubUser(crew);
      } catch (_) {}
    }
  }, []);

  const toggleBranch = (code: string) => {
    setExpandedBranches(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const calculatePaySummary = (crew: any) => {
    const myLogs = logs.filter(l => l.userPin === crew.pin && l.type === 'OUT' && l.date.startsWith(targetMonth));
    let totalPay = 0;
    myLogs.forEach((log: any) => {
      const [h, m] = log.totalWorkTime.split(':').map(Number);
      const totalMinutes = (h * 60) + m;
      const holidayTotalRate = holidaysMap[log.date] || 0;
      const baseRate = crew.totalHourly || 0;
      let dayPay = Math.floor(totalMinutes * (baseRate / 60));
      if (holidayTotalRate > 0) {
          const extraRate = Math.max(0, holidayTotalRate - baseRate);
          dayPay += Math.floor(totalMinutes * (extraRate / 60));
      }
      totalPay += dayPay;
    });
    const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
    const myExpenses = allApproved.filter((ex: any) => ex.userPin === crew.pin && ex.date.startsWith(targetMonth));
    const totalExp = myExpenses.reduce((acc: any, ex: any) => acc + (Number(ex.amount) || 0), 0);
    const supportPay = Number(crew.supportPay || 0);
    const gross = totalPay + totalExp + supportPay;
    const tax = Math.floor(gross * 0.033);
    const net = gross - tax;
    return { gross, tax, net };
  };

  const grandTotalPay = useMemo(() => {
    let total = 0;
    crews.forEach(crew => {
       const hasLog = logs.some(l => l.userPin === crew.pin && l.type === 'OUT' && l.date.startsWith(targetMonth));
       const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
       const hasExp = allApproved.some((ex: any) => ex.userPin === crew.pin && ex.date.startsWith(targetMonth));
       if (hasLog || hasExp) total += calculatePaySummary(crew).net;
    });
    return total;
  }, [crews, logs, targetMonth, holidaysMap]);

  const handleClose = () => { window.location.hash = 'main-dashboard'; };

  if (user && !ADMIN_PHONES.includes(user.phone) && !user.isAdmin) {
      return (
        <div style={overlay}>
            <div style={modal}><IndividualPayStub user={user} targetMonth={targetMonth} onBack={() => window.location.hash = 'crew-home'} /></div>
        </div>
      );
  }

  return (
    <div style={container}>
      <div style={header}>
        <div style={headerLeft}><h1 style={title}>급여 대장 관리</h1><p style={subTitle}>지점별 급여 지급 내역을 확인하고 관리합니다.</p></div>
        <button onClick={handleClose} style={closeBtnMain}>나가기</button>
      </div>
      <div style={dashboardCard}>
         <div style={dashboardLeft}><label style={dashLabel}>조회 기준월</label><input type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} style={monthInput} /></div>
         <div style={dashboardDivider}></div>
         <div style={dashboardRight}><span style={dashTotalLabel}>총 지급 예정액</span><span style={dashTotalValue}>₩{grandTotalPay.toLocaleString()}</span></div>
      </div>
      <div style={listArea}>
        {BRANCHES.map(branch => {
          const allBranchCrews = crews.filter(c => c.branchCode === branch.code);
          const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
          const branchCrews = allBranchCrews.filter(c => {
             return logs.some(log => log.userPin === c.pin && log.type === 'OUT' && log.date.startsWith(targetMonth)) ||
                    allApproved.some((ex: any) => ex.userPin === c.pin && ex.date.startsWith(targetMonth));
          });
          const totalBranchPay = branchCrews.reduce((acc, c) => acc + calculatePaySummary(c).net, 0);
          const isOpen = expandedBranches.includes(branch.code);
          return (
            <div key={branch.code} style={branchCard}>
              <div style={accordionHead} onClick={() => toggleBranch(branch.code)}>
                <div style={branchInfo}><div style={branchName}>{branch.label}</div><div style={branchCount}>{branchCrews.length > 0 ? `${branchCrews.length}명 근무` : '근무자 없음'}</div></div>
                <div style={branchMeta}><div style={branchTotalLabel}>지급 합계</div><div style={branchTotalValue}>₩{totalBranchPay.toLocaleString()}</div><div style={{transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.2s', marginLeft:'10px'}}>▼</div></div>
              </div>
              {isOpen && (
                <div style={tableWrap}>
                  {branchCrews.length === 0 ? <div style={emptyBranch}>기록이 없습니다.</div> : (
                      <table style={table}>
                        <thead><tr style={thRow}><th style={th}>이름</th><th style={th}>입금 계좌</th><th style={{...th, textAlign:'right'}}>실 수령액</th><th style={{...th, width:'60px'}}></th></tr></thead>
                        <tbody>
                          {branchCrews.map((c, i) => {
                            const pay = calculatePaySummary(c);
                            return (
                              <tr key={i} style={tr}>
                                <td style={td}><div style={crewNameBox}><div style={crewAvatar}>{c.name.slice(0,1)}</div><div><div style={crewNameText}>{c.name}</div><div style={crewPosition}>{c.position || '크루'}</div></div></div></td>
                                <td style={td}>{c.bankName ? <div style={bankText}><span style={bankNameBadge}>{c.bankName}</span><span>{c.accountNumber}</span></div> : <span style={errorText}>미등록</span>}</td>
                                <td style={{...td, textAlign:'right'}}><span style={netPayText}>₩{pay.net.toLocaleString()}</span></td>
                                <td style={{...td, textAlign:'right'}}><button onClick={() => setSelectedPayStubUser(c)} style={detailBtn}>명세서</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {selectedPayStubUser && (
        <div style={overlay} onClick={() => setSelectedPayStubUser(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}><IndividualPayStub user={selectedPayStubUser} targetMonth={targetMonth} onBack={() => setSelectedPayStubUser(null)} /></div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// [Styles]
// ----------------------------------------------------------------------
const container: React.CSSProperties = { padding: '40px', background: '#f3f4f6', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#1f2937' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const modal: React.CSSProperties = { padding: 0, background: '#F8FAFC', width: '100%', maxWidth: '420px', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const popupContainer: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFC', overflow: 'hidden', height: '100%' };
const popupHeader: React.CSSProperties = { padding: '16px 20px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', flexShrink: 0, zIndex: 10 };
const closeBtnIcon: React.CSSProperties = { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94A3B8', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const headerTitle: React.CSSProperties = { fontSize: '16px', fontWeight: '700', margin: 0, color: '#0F172A' };
const popupScrollContent: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '40px' };
const headerLeft: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const title: React.CSSProperties = { fontSize: '24px', fontWeight: '800', margin: 0, color: '#111' };
const subTitle: React.CSSProperties = { fontSize: '14px', color: '#6b7280', margin: 0 };
const closeBtnMain: React.CSSProperties = { padding: '10px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', color: '#374151', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s' };
const header: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' };
const dashboardCard: React.CSSProperties = { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' };
const dashboardLeft: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
const dashLabel: React.CSSProperties = { fontSize: '13px', fontWeight: '500', opacity: 0.9 };
const monthInput: React.CSSProperties = { background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' };
const dashboardDivider: React.CSSProperties = { width: '1px', height: '40px', background: 'rgba(255,255,255,0.3)', margin: '0 20px' };
const dashboardRight: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' };
const dashTotalLabel: React.CSSProperties = { fontSize: '14px', fontWeight: '500', opacity: 0.9 };
const dashTotalValue: React.CSSProperties = { fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' };
const listArea: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px' };
const branchCard: React.CSSProperties = { background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6' };
const accordionHead: React.CSSProperties = { padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', background: '#fff' };
const branchInfo: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px' };
const branchName: React.CSSProperties = { fontSize: '17px', fontWeight: '700', color: '#1f2937' };
const branchCount: React.CSSProperties = { fontSize: '13px', color: '#6b7280' };
const branchMeta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '15px' };
const branchTotalLabel: React.CSSProperties = { fontSize: '12px', color: '#9ca3af', fontWeight: '500' };
const branchTotalValue: React.CSSProperties = { fontSize: '18px', fontWeight: '700', color: '#2563eb' };
const tableWrap: React.CSSProperties = { borderTop: '1px solid #f3f4f6' };
const emptyBranch: React.CSSProperties = { padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const thRow: React.CSSProperties = { background: '#f9fafb', borderBottom: '1px solid #e5e7eb' };
const th: React.CSSProperties = { padding: '12px 24px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tr: React.CSSProperties = { borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s' };
const td: React.CSSProperties = { padding: '16px 24px', verticalAlign: 'middle', color: '#374151' };
const crewNameBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px' };
const crewAvatar: React.CSSProperties = { width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '14px' };
const crewNameText: React.CSSProperties = { fontWeight: '600', color: '#1f2937' };
const crewPosition: React.CSSProperties = { fontSize: '12px', color: '#666' };
const bankText: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' };
const bankNameBadge: React.CSSProperties = { fontSize: '11px', fontWeight: 'bold', color: '#4b5563' };
const errorText: React.CSSProperties = { color: '#ef4444', fontSize: '12px', background: '#fef2f2', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' };
const netPayText: React.CSSProperties = { fontWeight: '700', color: '#111827', fontSize: '15px' };
const detailBtn: React.CSSProperties = { padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#374151' };
const heroCard: React.CSSProperties = { background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', padding: '28px 20px', borderRadius: '20px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)', marginBottom: '20px', textAlign: 'center' };
const heroLabel: React.CSSProperties = { fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' };
const heroAmount: React.CSSProperties = { fontSize: '28px', fontWeight: '800', marginBottom: '12px', letterSpacing: '-1px' };
const heroMetaBadge: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: '600', backdropFilter: 'blur(4px)' };
const detailCard: React.CSSProperties = { background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #E2E8F0' };
const cardHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px dashed #E2E8F0' };
const cardTitle: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#334155' };
const cardDateBadge: React.CSSProperties = { fontSize: '12px', color: '#475569', background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' };
const sectionGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
const sectionLabel: React.CSSProperties = { fontSize: '12px', color: '#94A3B8', fontWeight: '700', marginBottom: '4px' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center', color: '#475569' };
const label: React.CSSProperties = { fontWeight: '500' };
const val: React.CSSProperties = { fontWeight: '600', color: '#1E293B' };
const subTotalRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px', paddingTop: '8px', borderTop: '1px dotted #E2E8F0', color: '#64748B' };
const divider: React.CSSProperties = { height: '1px', background: '#F1F5F9', margin: '16px 0' };
const finalResultBox: React.CSSProperties = { marginTop: '12px', background: '#F0FDF4', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #BBF7D0' };
const finalLabel: React.CSSProperties = { fontSize: '14px', fontWeight: '700', color: '#166534' };
const finalValue: React.CSSProperties = { fontSize: '16px', fontWeight: '800', color: '#15803D' };
const bankInfoBox: React.CSSProperties = { marginTop: '20px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' };
const bankLabel: React.CSSProperties = { fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '2px' };
const bankValue: React.CSSProperties = { fontSize: '13px', fontWeight: '600', color: '#334155' };
const sectionTitle: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#1E293B', margin: 0 };
const emptyState: React.CSSProperties = { padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', background: '#fff', borderRadius: '16px', border: '1px dashed #E2E8F0' };
const logList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
const logCard: React.CSSProperties = { background: '#fff', padding: '16px 18px', borderRadius: '16px', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', gap: '16px', marginBottom: '10px', transition: 'all 0.2s' };
const logDateBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '10px 0', borderRadius: '10px', width: '48px', flexShrink: 0 };
const logDay: React.CSSProperties = { fontSize: '18px', fontWeight: '800', color: '#334155', lineHeight: '1', marginBottom: '2px' };
const logMonth: React.CSSProperties = { fontSize: '11px', color: '#94A3B8', fontWeight: '600' };
const logInfoBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' };
const logTimeRange: React.CSSProperties = { fontSize: '12px', color: '#94A3B8', fontWeight: '500', marginBottom: '2px' };
const logDurationRow: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '6px' };
const logDurationLabel: React.CSSProperties = { fontSize: '11px', color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' };
const logDurationValue: React.CSSProperties = { fontSize: '16px', fontWeight: '800', color: '#1E293B' };
const logBadgeRow: React.CSSProperties = { display: 'flex', gap: '5px', marginTop: '6px' };
const badgeBase: React.CSSProperties = { fontSize: '10px', padding: '2px 6px', borderRadius: '5px', fontWeight: '700', display: 'inline-block' };
const badgeHoliday: React.CSSProperties = { ...badgeBase, background: '#FEF2F2', color: '#EF4444' };
const badgeOver: React.CSSProperties = { ...badgeBase, background: '#EFF6FF', color: '#3B82F6' };
const badgeLate: React.CSSProperties = { ...badgeBase, background: '#FFF7ED', color: '#EA580C' };
const logAmountBox: React.CSSProperties = { textAlign: 'right', minWidth: '70px' };
const logAmount: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#2563EB' };
const editBtn: React.CSSProperties = { width: '100%', padding: '12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#475569', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: '0.2s' };
const editFormBox: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '16px', border: '2px solid #3b82f6', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1)' };
const formInput: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '10px', boxSizing: 'border-box', fontSize: '14px' };
const formLabel: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', display: 'block' };
const sendBtn: React.CSSProperties = { width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };
const helperText: React.CSSProperties = { fontSize: '13px', color: '#3b82f6', fontWeight: '600', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px', background: '#eff6ff', padding: '8px 12px', borderRadius: '8px' };
const tabGroup: React.CSSProperties = { display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' };
const activeTab: React.CSSProperties = { flex: 1, padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const inactiveTab: React.CSSProperties = { flex: 1, padding: '8px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const previewImg: React.CSSProperties = { width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '5px' };
const expenseCountBadge: React.CSSProperties = { fontSize: '10px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '8px', color: '#64748b', fontWeight: '600' };
const expenseMiniList: React.CSSProperties = { marginTop: '8px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' };
const expenseItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9', color: '#475569' };
const badgeExpense: React.CSSProperties = { fontSize: '10px', background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', marginLeft: '6px', cursor: 'pointer' };

export default PayStub;