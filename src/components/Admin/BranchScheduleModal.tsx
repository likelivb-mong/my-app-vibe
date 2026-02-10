import React, { useState } from 'react';
import { BRANCHES } from '../../utils/branches';

interface Props {
  selectedBranch: string;
  allCrews: any[];
  holidays: { [key: string]: number }; // dateStr: extraPay
  oneOffShifts: any[];
  onClose: () => void;
  onSaveSchedule: (targetCrewId: string, dayIdx: number, start: string, end: string, isFixed: boolean, date?: string, type?: string) => void;
  onDeleteSchedule: (dateStr: string, worker: any, deleteFixed: boolean) => void;
  onHolidaySetting: (dateStr: string, extraPay?: number) => void;
}

export default function BranchScheduleModal({
  selectedBranch,
  allCrews,
  holidays,
  oneOffShifts,
  onClose,
  onSaveSchedule,
  onDeleteSchedule,
  onHolidaySetting
}: Props) {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'TIMETABLE'>('CALENDAR');
  const [mode, setMode] = useState<'NORMAL' | 'HOLIDAY' | 'ADD_ONE_OFF'>('NORMAL');

  // 휴일 설정 시 적용할 추가 수당 기본값 1,000원
  const [holidayExtraPay, setHolidayExtraPay] = useState<number>(1000);

  const currentMonthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  const [targetCrewId, setTargetCrewId] = useState<string>("");
  const [scheduleType, setScheduleType] = useState<'FIXED' | 'ONE_OFF'>('FIXED');
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1); 
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [scheduleForm, setScheduleForm] = useState({ startTime: "10:00", endTime: "18:00" });

  const [dayDetailData, setDayDetailModal] = useState<{ date: string, workers: any[] } | null>(null);
  const [addOneOffModal, setAddOneOffModal] = useState<{ date: string } | null>(null);
  
  const [deleteOptionModal, setDeleteOptionModal] = useState<{ date: string, worker: any } | null>(null);
  const [isDeleteFixed, setIsDeleteFixed] = useState<boolean>(false);

  const [oneOffForm, setOneOffForm] = useState({ crewId: "", startTime: "10:00", endTime: "18:00", type: "SUB" });

  const selectedBranchCode = BRANCHES.find(b => b.label === selectedBranch)?.code;
  const branchCrews = allCrews.filter(c => c.branchCode === selectedBranchCode && c.status === 'active');

  const formatName = (name: string) => (name && name.length > 2 ? name.slice(-2) : name);
  const getShiftStyle = (type?: string) => {
    if (type === 'SUB') return { bg: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.5)' };
    if (type === 'EDU') return { bg: 'rgba(250, 204, 21, 0.2)', color: '#fde047', border: '1px solid rgba(250, 204, 21, 0.5)' };
    return { bg: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: 'none' };
  };

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const handleDayClick = (dateStr: string, dailyWorkers: any[]) => {
    if (mode === 'HOLIDAY') {
      onHolidaySetting(dateStr, holidayExtraPay);
    } else if (mode === 'ADD_ONE_OFF') {
      setAddOneOffModal({ date: dateStr });
      setOneOffForm({ ...oneOffForm, crewId: branchCrews[0]?.pin || "", startTime: "10:00", endTime: "18:00" });
    } else setDayDetailModal({ date: dateStr, workers: dailyWorkers });
  };

  const openDeleteOption = (worker: any, dateStr: string) => {
    setDeleteOptionModal({ date: dateStr, worker });
    setIsDeleteFixed(false); 
  };

  const confirmDelete = () => {
    if (!deleteOptionModal) return;
    onDeleteSchedule(deleteOptionModal.date, deleteOptionModal.worker, isDeleteFixed);
    setDeleteOptionModal(null);
    setDayDetailModal(null);
  };

  const handlePanelSave = () => {
    if (!targetCrewId) return alert("크루를 선택해주세요.");
    if (scheduleType === 'FIXED') {
      onSaveSchedule(targetCrewId, selectedDayTab, scheduleForm.startTime, scheduleForm.endTime, true, currentMonthKey);
    } else {
      onSaveSchedule(targetCrewId, 0, scheduleForm.startTime, scheduleForm.endTime, false, selectedDate, 'WORK');
    }
    alert("등록이 완료되었습니다.");
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} style={appleDayCellEmpty}></div>);

    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const holidayExtra = holidays[dateStr];
      const isHoliday = holidayExtra !== undefined;
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

      let dailyWorkers: any[] = [];
      branchCrews.forEach(crew => {
        const schedule = crew.fixedSchedules?.[currentMonthKey]?.[dayOfWeek];
        if (schedule) dailyWorkers.push({ ...crew, ...schedule, type: 'FIXED' });
      });

      const oneOffs = oneOffShifts.filter(s => s.date === dateStr && s.branchCode === selectedBranchCode);
      const excludedNames = oneOffs.map(s => s.replaceTarget || (s.type === 'OFF' ? s.crewName : null)).filter(Boolean);
      dailyWorkers = dailyWorkers.filter(w => !excludedNames.includes(w.name));
      oneOffs.forEach(s => { if (s.type !== 'OFF') dailyWorkers.push({ name: s.crewName, startTime: s.startTime, endTime: s.endTime, type: s.type }); });

      dailyWorkers.sort((a, b) => a.startTime.localeCompare(b.startTime));

      days.push(
        <div key={d} onClick={() => handleDayClick(dateStr, dailyWorkers)} style={{
          ...appleDayCell,
          borderColor: isHoliday ? '#ef4444' : (isToday ? '#007aff' : 'rgba(255,255,255,0.05)'),
          background: isHoliday ? 'rgba(239, 68, 68, 0.08)' : 'transparent'
        }}>
          <div style={appleDateNumberWrapper}>
            <span style={{ ...appleDateNumber, background: isToday ? '#ef4444' : 'transparent', color: isToday ? '#fff' : (dayOfWeek === 0 ? '#ef4444' : (dayOfWeek === 6 ? '#60a5fa' : '#fff')) }}>{d}</span>
            {/* ✅ [+시급] 텍스트 노출 부분 제거 (로직은 상단 handleDayClick에서 유지됨) */}
            {isHoliday && <span style={{ fontSize: '10px', color: '#ef4444', marginLeft: '4px' }}>휴일</span>}
          </div>
          <div style={appleShiftList}>
            {dailyWorkers.map((worker, idx) => {
              const style = getShiftStyle(worker.type);
              return <div key={idx} style={{ ...appleShiftPill, background: style.bg, color: style.color, border: style.border }}>{worker.startTime.substring(0, 5)} {formatName(worker.name)}</div>;
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  const renderFixedTimetable = () => {
    const hours = Array.from({ length: 15 }, (_, i) => 10 + i);
    const weekMap = ['월', '화', '수', '목', '금', '토', '일'];
    return (
      <div style={excelWrapper}>
        <div style={excelGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '50px', borderRight: '1px solid #333', background: '#1a1a1a' }}>
            <div style={excelHeaderCell}>시간</div>
            <div style={{ height: '30px', borderBottom: '1px solid #333' }}></div>
            {hours.map(h => <div key={h} style={excelTimeCell}>{h}</div>)}
          </div>
          <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
            {weekMap.map((dayName, colIdx) => {
              const dayIdx = (colIdx + 1) % 7;
              const workers = branchCrews.filter(c => c.fixedSchedules?.[currentMonthKey]?.[dayIdx]);
              return (
                <div key={dayName} style={{ flex: 1, minWidth: '100px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
                  <div style={excelHeaderCell}>{dayName}</div>
                  <div style={{ display: 'flex', borderBottom: '1px solid #333', height: '30px', background: '#1a1a1a' }}>
                    {workers.map((w, i) => <div key={i} style={excelSubHeaderCell}>{formatName(w.name)}</div>)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {hours.map(hour => (
                      <div key={hour} style={{ display: 'flex', height: '30px', borderBottom: '1px solid #222' }}>
                        {workers.map((w, i) => {
                          const sc = w.fixedSchedules?.[currentMonthKey]?.[dayIdx];
                          if (!sc) return <div key={i} style={{ flex: 1 }} />;
                          const startH = parseInt(sc.startTime.split(':')[0]);
                          let endH = parseInt(sc.endTime.split(':')[0]) || 24;
                          return <div key={i} style={{ flex: 1, borderRight: '1px solid #222', background: (hour >= startH && hour < endH) ? 'rgba(59, 130, 246, 0.3)' : 'transparent' }} />;
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={appleModalContainer} onClick={e => e.stopPropagation()}>
        <div style={appleModalHeader}>
          <div style={{ flex: 1 }}>
            <div style={branchLabel}>{selectedBranch} BRANCH</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={monthTitle}>{viewDate.getFullYear()}. {viewDate.getMonth() + 1}</h2>
              {viewMode === 'CALENDAR' && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={handlePrevMonth} style={appleNavBtn}>←</button>
                  <button onClick={handleNextMonth} style={appleNavBtn}>→</button>
                </div>
              )}
            </div>
          </div>
          <div style={appleSegmentedControl}>
            <button onClick={() => setViewMode('CALENDAR')} style={viewMode === 'CALENDAR' ? appleSegmentActive : appleSegment}>캘린더</button>
            <button onClick={() => setViewMode('TIMETABLE')} style={viewMode === 'TIMETABLE' ? appleSegmentActive : appleSegment}>근무표</button>
          </div>
          <button onClick={onClose} style={appleCloseBtn}>✕</button>
        </div>

        <div style={appleContentArea}>
          {viewMode === 'CALENDAR' ? (
            <>
              <div style={appleToolbar}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {mode === 'HOLIDAY' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>휴일 추가 시급:</span>
                      <input 
                        type="number" 
                        value={holidayExtraPay} 
                        onChange={(e) => setHolidayExtraPay(Number(e.target.value))} 
                        style={{ background: 'transparent', border: 'none', color: '#fff', width: '60px', fontSize: '12px', textAlign: 'right', outline: 'none' }}
                      />
                      <span style={{ fontSize: '11px', color: '#888' }}>원</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setMode('NORMAL')} style={{ ...appleToolBtn, color: mode === 'NORMAL' ? '#fff' : '#888', borderColor: mode === 'NORMAL' ? '#fff' : 'transparent' }}>스케줄</button>
                    <button onClick={() => setMode('HOLIDAY')} style={{ ...appleToolBtn, color: mode === 'HOLIDAY' ? '#ef4444' : '#888', borderColor: mode === 'HOLIDAY' ? '#ef4444' : 'rgba(255,255,255,0.1)' }}>휴일 설정</button>
                    <button onClick={() => setMode('ADD_ONE_OFF')} style={{ ...appleToolBtn, color: mode === 'ADD_ONE_OFF' ? '#34d399' : '#888', borderColor: mode === 'ADD_ONE_OFF' ? '#34d399' : 'rgba(255,255,255,0.1)' }}>+ 교육/대타 추가</button>
                  </div>
                </div>
              </div>
              <div style={appleCalendarGrid}>
                {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} style={appleWeekHeader}>{d}</div>)}
                {renderCalendar()}
              </div>
            </>
          ) : renderFixedTimetable()}
        </div>

        <div style={appleBottomPanel}>
          <div style={applePanelTitle}>스케줄링 도구 (관리 중인 월: {currentMonthKey})</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={targetCrewId} onChange={e => setTargetCrewId(e.target.value)} style={appleSelect}>
              <option value="">크루 선택</option>
              {branchCrews.map(c => <option key={c.pin} value={c.pin}>{c.name}</option>)}
            </select>
            <div style={appleToggleGroup}>
              <button onClick={() => setScheduleType('FIXED')} style={scheduleType === 'FIXED' ? appleToggleActive : appleToggle}>주 고정</button>
              <button onClick={() => setScheduleType('ONE_OFF')} style={scheduleType === 'ONE_OFF' ? appleToggleActive : appleToggle}>일일 근무</button>
            </div>
            {scheduleType === 'FIXED' ? (
              <div style={{ display: 'flex', gap: '2px' }}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <div key={idx} onClick={() => setSelectedDayTab(idx)} style={{ ...appleDayTab, background: selectedDayTab === idx ? '#fff' : '#333', color: selectedDayTab === idx ? '#000' : '#888' }}>{day}</div>
                ))}
              </div>
            ) : (
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={appleDateInput} />
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#2C2C2E', padding: '8px 12px', borderRadius: '8px', border: '1px solid #444' }}>
              <input type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} style={appleTimeInputVisible} />
              <span style={{ color: '#888', fontWeight: 'bold' }}>~</span>
              <input type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} style={appleTimeInputVisible} />
            </div>
            <button onClick={handlePanelSave} style={appleSaveBtn}>등록</button>
          </div>
        </div>

        {dayDetailData && (
          <div style={{ ...overlay, zIndex: 1100 }} onClick={() => setDayDetailModal(null)}>
            <div style={{ ...applePopup, maxWidth: '350px' }} onClick={e => e.stopPropagation()}>
              <div style={applePopupHeader}><h3>{dayDetailData.date} 상세</h3><button onClick={() => setDayDetailModal(null)} style={closeBtn}>×</button></div>
              <div style={{ padding: '15px', maxHeight: '350px', overflowY: 'auto' }}>
                {dayDetailData.workers.length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>근무자 없음</p> :
                  dayDetailData.workers.map((w, idx) => (
                    <div key={idx} style={workerDetailItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: getShiftStyle(w.type).bg }}></div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#fff' }}>{w.name} <span style={{ fontSize: '11px', color: '#aaa' }}>{w.type === 'FIXED' ? '고정' : '임시'}</span></div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{w.startTime} ~ {w.endTime}</div>
                        </div>
                      </div>
                      <button onClick={() => openDeleteOption(w, dayDetailData.date)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {deleteOptionModal && (
          <div style={{ ...overlay, zIndex: 1200 }} onClick={() => setDeleteOptionModal(null)}>
            <div style={{ ...applePopup, maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
              <div style={applePopupHeader}>
                <div style={{textAlign: 'center', width: '100%'}}>
                  <div style={{fontSize: '13px', color: '#888', marginBottom: '4px'}}>{deleteOptionModal.date}</div>
                  <div style={{fontSize: '18px', fontWeight: '700'}}>{deleteOptionModal.worker.name} 크루</div>
                  <div style={{fontSize: '14px', color: '#007aff'}}>{deleteOptionModal.worker.startTime} - {deleteOptionModal.worker.endTime}</div>
                </div>
              </div>
              <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div 
                  onClick={() => setIsDeleteFixed(false)}
                  style={{...deleteOptionCard, borderColor: !isDeleteFixed ? '#007aff' : '#333', background: !isDeleteFixed ? 'rgba(0,122,255,0.1)' : 'transparent'}}
                >
                  <div style={{fontWeight: '600', marginBottom: '4px'}}>일일 스케줄 삭제</div>
                  <div style={{fontSize: '11px', color: '#888'}}>선택한 날짜의 근무만 삭제(휴무) 처리합니다.</div>
                </div>

                {deleteOptionModal.worker.type === 'FIXED' && (
                  <div 
                    onClick={() => setIsDeleteFixed(true)}
                    style={{...deleteOptionCard, borderColor: isDeleteFixed ? '#ef4444' : '#333', background: isDeleteFixed ? 'rgba(239,68,68,0.1)' : 'transparent'}}
                  >
                    <div style={{fontWeight: '600', marginBottom: '4px', color: isDeleteFixed ? '#ef4444' : '#fff'}}>주 고정 스케줄 삭제</div>
                    <div style={{fontSize: '11px', color: '#888'}}>해당 월의 고정 스케줄을 삭제합니다.</div>
                  </div>
                )}

                <div style={{display: 'flex', gap: '10px', marginTop: '8px'}}>
                  <button onClick={() => setDeleteOptionModal(null)} style={{...appleBtnBase, background: '#333', flex: 1}}>취소</button>
                  <button onClick={confirmDelete} style={{...appleBtnBase, background: isDeleteFixed ? '#ef4444' : '#007aff', flex: 1.5}}>삭제 확인</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {addOneOffModal && (
          <div style={{ ...overlay, zIndex: 1200 }} onClick={() => setAddOneOffModal(null)}>
            <div style={{ ...applePopup, maxWidth: '320px' }} onClick={e => e.stopPropagation()}>
              <div style={applePopupHeader}><h3>{addOneOffModal.date} 일정 추가</h3><button onClick={() => setAddOneOffModal(null)} style={closeBtn}>×</button></div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select value={oneOffForm.crewId} onChange={e => setOneOffForm({ ...oneOffForm, crewId: e.target.value })} style={appleSelectFull}>
                  <option value="">크루 선택</option>
                  {branchCrews.map(c => <option key={c.pin} value={c.pin}>{c.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setOneOffForm({ ...oneOffForm, type: 'SUB' })} style={oneOffForm.type === 'SUB' ? typeBtnActive : typeBtn}>🟣 대타</button>
                  <button onClick={() => setOneOffForm({ ...oneOffForm, type: 'EDU' })} style={oneOffForm.type === 'EDU' ? typeBtnActive : typeBtn}>🟡 교육</button>
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input type="time" value={oneOffForm.startTime} onChange={e => setOneOffForm({ ...oneOffForm, startTime: e.target.value })} style={appleSelectFull} />
                  <span style={{color:'#fff'}}>~</span>
                  <input type="time" value={oneOffForm.endTime} onChange={e => setOneOffForm({ ...oneOffForm, endTime: e.target.value })} style={appleSelectFull} />
                </div>
                <button onClick={() => {
                  if(!oneOffForm.crewId) return;
                  onSaveSchedule(oneOffForm.crewId, 0, oneOffForm.startTime, oneOffForm.endTime, false, addOneOffModal.date, oneOffForm.type);
                  setAddOneOffModal(null);
                }} style={appleSaveBtnFull}>추가하기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Styles (기존 스타일 동일) ---
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const appleModalContainer: React.CSSProperties = { background: 'rgba(28, 28, 30, 0.95)', width: '92%', maxWidth: '900px', height: '85vh', borderRadius: '18px', boxShadow: '0 40px 80px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const appleModalHeader: React.CSSProperties = { padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' };
const branchLabel: React.CSSProperties = { fontSize: '13px', color: '#86868b', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.5px' };
const monthTitle: React.CSSProperties = { margin: 0, fontSize: '22px', color: '#fff', fontWeight: '700', letterSpacing: '-0.5px' };
const appleNavBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', width: '28px', height: '28px', color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const appleCloseBtn: React.CSSProperties = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', color: '#888', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const appleSegmentedControl: React.CSSProperties = { display: 'flex', background: 'rgba(118, 118, 128, 0.24)', padding: '2px', borderRadius: '8px', width: '200px' };
const appleSegment: React.CSSProperties = { flex: 1, border: 'none', background: 'transparent', color: '#aaa', padding: '6px', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', fontWeight: '500' };
const appleSegmentActive: React.CSSProperties = { ...appleSegment, background: '#636366', color: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' };
const appleContentArea: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const appleToolbar: React.CSSProperties = { padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const appleToolBtn: React.CSSProperties = { background: 'transparent', border: '1px solid', borderRadius: '14px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: '600', transition: '0.2s' };
const appleCalendarGrid: React.CSSProperties = { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: '30px auto', overflowY: 'auto', padding: '12px', gap: '2px' };
const appleWeekHeader: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#86868b', fontWeight: '600', paddingBottom: '8px' };
const appleDayCell: React.CSSProperties = { minHeight: '80px', background: 'transparent', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'background 0.2s' };
const appleDayCellEmpty: React.CSSProperties = { minHeight: '80px', background: 'transparent', borderRadius: '6px', border: 'none', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'default' };
const appleDateNumberWrapper: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const appleDateNumber: React.CSSProperties = { fontSize: '13px', fontWeight: '500', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' };
const appleShiftList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' };
const appleShiftPill: React.CSSProperties = { fontSize: '10px', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' };
const appleBottomPanel: React.CSSProperties = { background: '#1c1c1e', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px' };
const applePanelTitle: React.CSSProperties = { fontSize: '11px', color: '#86868b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '12px' };
const appleSelect: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer', minWidth: '100px' };
const appleSelectFull: React.CSSProperties = { ...appleSelect, width: '100%' };
const appleToggleGroup: React.CSSProperties = { display: 'flex', background: '#333', borderRadius: '8px', padding: '2px' };
const appleToggle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#888', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' };
const appleToggleActive: React.CSSProperties = { ...appleToggle, background: '#555', color: '#fff', fontWeight: 'bold' };
const appleDayTab: React.CSSProperties = { width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', cursor: 'pointer', fontWeight: '600' };
const appleTimeInputVisible: React.CSSProperties = { background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontFamily: 'monospace', width: 'auto', minWidth: '70px', cursor: 'text', outline: 'none', textAlign: 'center' };
const appleDateInput: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', outline: 'none' };
const appleSaveBtn: React.CSSProperties = { background: '#30d158', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginLeft: 'auto' };
const appleSaveBtnFull: React.CSSProperties = { ...appleSaveBtn, width: '100%', marginLeft: 0, marginTop: '10px' };
const applePopup: React.CSSProperties = { background: '#1c1c1e', width: '90%', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' };
const applePopupHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' };
const workerDetailItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '6px' };
const typeBtn: React.CSSProperties = { flex: 1, padding: '8px', background: '#333', border: '1px solid #444', color: '#aaa', borderRadius: '8px', cursor: 'pointer' };
const typeBtnActive: React.CSSProperties = { ...typeBtn, background: '#444', color: '#fff', borderColor: '#fff' };
const excelWrapper: React.CSSProperties = { borderRadius: '0', overflow: 'hidden', overflowX: 'auto', background: '#1a1a1a', height: '100%' };
const excelGrid: React.CSSProperties = { display: 'flex', minWidth: '600px', height: '100%' };
const excelHeaderCell: React.CSSProperties = { padding: '8px 0', textAlign: 'center', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px', color: '#888', background: '#111' };
const excelSubHeaderCell: React.CSSProperties = { flex: 1, textAlign: 'center', borderRight: '1px solid #333', fontSize: '11px', padding: '6px 0', background: '#151515', color: '#fff' };
const excelTimeCell: React.CSSProperties = { height: '30px', borderBottom: '1px solid #333', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' };

const deleteOptionCard: React.CSSProperties = { padding: '12px 14px', borderRadius: '12px', border: '2px solid', cursor: 'pointer', transition: '0.2s' };
const appleBtnBase: React.CSSProperties = { border: 'none', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };