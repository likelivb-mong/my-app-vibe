import React, { useState } from 'react';
import { overlay, appleModal, appleModalHeader, closeBtn } from '../../utils/crewStyles';

interface Props {
  user: any;
  allCrews: any[];
  holidays: {[key: string]: number};
  oneOffShifts: any[];
  onClose: () => void;
  onDayClick: (date: string, crews: any[]) => void;
}

export default function ScheduleModal({ user, allCrews, holidays, oneOffShifts, onClose, onDayClick }: Props) {
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'TIMETABLE'>('CALENDAR');
  const [viewDate, setViewDate] = useState(new Date());

  // ✅ 현재 보고 있는 연-월 키 생성 (예: "2024-02")
  const currentMonthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  
  const formatName = (name: string) => (name && name.length > 2 ? name.slice(-2) : name);

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    const branchCrews = allCrews.filter(c => c.branchCode === user.branchCode && c.status === 'active');

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} style={appleDayCellEmpty}></div>);

    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const isHoliday = holidays[dateStr] !== undefined;
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

      let dailyWorkers: any[] = [];
      const oneOffs = oneOffShifts.filter(s => s.date === dateStr && s.branchCode === user.branchCode);
      
      const excludedNames = oneOffs
        .map(s => s.replaceTarget || (s.type === 'OFF' ? s.crewName : null))
        .filter(Boolean);

      branchCrews.forEach(crew => {
        // ✅ [수정] 해당 월(currentMonthKey)의 고정 스케줄에서 가져오도록 변경
        const schedule = crew.fixedSchedules?.[currentMonthKey]?.[dayOfWeek];
        if (schedule) {
          if (!excludedNames.includes(crew.name)) {
            dailyWorkers.push({ ...crew, ...schedule, type: 'FIXED' });
          } else if (crew.name === user.name && oneOffs.some(s => s.replaceTarget === user.name)) {
            dailyWorkers.push({ ...crew, ...schedule, type: 'REPLACED' });
          }
        }
      });

      oneOffs.forEach(s => {
        if (s.type !== 'OFF') {
          dailyWorkers.push({ name: s.crewName, startTime: s.startTime, endTime: s.endTime, type: s.type });
        }
      });

      dailyWorkers.sort((a, b) => a.startTime.localeCompare(b.startTime));

      days.push(
        <div key={d} onClick={() => onDayClick(dateStr, dailyWorkers)} style={{
          ...appleDayCell, 
          background: isToday ? 'rgba(0, 122, 255, 0.03)' : (isHoliday ? '#FFF5F5' : '#FFF'),
          borderColor: isToday ? '#007AFF' : '#F2F2F7'
        }}>
          <span style={{ 
            fontSize: '11px', 
            color: isHoliday ? '#FF3B30' : (isToday ? '#007AFF' : '#8E8E93'), 
            fontWeight: isToday ? '800' : '600', 
            marginBottom: '4px' 
          }}>{d}</span>
          
          <div style={tagContainer}>
            {dailyWorkers.map((worker, idx) => {
              const isMe = worker.name === user.name;
              let style = { bg: '#F2F2F7', color: '#636366', border: 'none' };

              if (isMe) {
                 if (worker.type === 'SUB') { style = { bg: '#5856D6', color: '#FFF', border: 'none' }; }
                 else if (worker.type === 'REPLACED') { style = { bg: '#E5E5EA', color: '#AEAEB2', border: 'none' }; }
                 else { style = { bg: '#007AFF', color: '#FFF', border: 'none' }; }
              } else {
                 if (worker.type === 'SUB') { style = { bg: '#F3E8FF', color: '#7E22CE', border: 'none' }; }
                 else if (worker.type === 'EDU') { style = { bg: '#FFF9C4', color: '#854D0E', border: 'none' }; }
                 else { style = { bg: '#E1F5FE', color: '#0277BD', border: 'none' }; }
              }

              return (
                <div key={idx} style={{
                  ...appleNameTag, 
                  backgroundColor: style.bg, 
                  color: style.color, 
                  border: style.border,
                  opacity: worker.type === 'REPLACED' ? 0.5 : 1,
                  textDecoration: worker.type === 'REPLACED' ? 'line-through' : 'none'
                }}>
                  {formatName(worker.name)}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  const renderFixedTimetable = () => {
    const hours = Array.from({length: 15}, (_, i) => 10 + i);
    const weekMap = ['월', '화', '수', '목', '금', '토', '일'];
    const weekIdxMap = [1, 2, 3, 4, 5, 6, 0];
    const branchCrews = allCrews.filter(c => c.status === 'active' && c.branchCode === user.branchCode);
    
    return (
        <div style={excelWrapper}>
            <div style={{display:'flex', minWidth:'600px'}}>
                <div style={timeColumn}>
                    <div style={excelHeaderCell}>시간</div>
                    <div style={{height:'28px', borderBottom:'1px solid #E5E5EA'}}></div>
                    {hours.map(h => <div key={h} style={excelTimeCell}>{h}</div>)}
                </div>
                <div style={{display:'flex', flex:1, overflowX:'auto'}}>
                    {weekMap.map((dayName, colIdx) => {
                        const dayIdx = weekIdxMap[colIdx];
                        // ✅ [수정] 근무표 탭에서도 현재 월(currentMonthKey)의 고정 스케줄만 필터링
                        const workers = branchCrews
                            .filter(c => c.fixedSchedules?.[currentMonthKey]?.[dayIdx])
                            .sort((a, b) => a.fixedSchedules[currentMonthKey][dayIdx].startTime.localeCompare(b.fixedSchedules[currentMonthKey][dayIdx].startTime));
                        
                        return (
                            <div key={dayName} style={dayColumn}>
                                <div style={excelHeaderCell}>{dayName}</div>
                                <div style={subHeaderRow}>
                                    {workers.length > 0 ? workers.map((w, i) => <div key={i} style={excelSubHeaderCell}>{formatName(w.name)}</div>) : <div style={{flex:1}}></div>}
                                </div>
                                <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                                    {hours.map(hour => (
                                        <div key={hour} style={excelDataRow}>
                                            {workers.length > 0 ? workers.map((w, i) => {
                                                const schedule = w.fixedSchedules[currentMonthKey][dayIdx];
                                                const startH = parseInt(schedule.startTime.split(':')[0]);
                                                const startM = parseInt(schedule.startTime.split(':')[1]);
                                                let endH = parseInt(schedule.endTime.split(':')[0]);
                                                const endM = parseInt(schedule.endTime.split(':')[1]);
                                                if (endH === 0) endH = 24;
                                                
                                                let bgColor = 'transparent';
                                                if (hour > startH && hour < endH) bgColor = 'rgba(0, 122, 255, 0.15)';
                                                else if (hour === startH) bgColor = startM >= 30 ? 'rgba(88, 86, 214, 0.2)' : 'rgba(0, 122, 255, 0.15)';
                                                else if (hour === endH) bgColor = endM >= 30 ? 'rgba(88, 86, 214, 0.2)' : 'transparent';
                                                
                                                return <div key={i} style={{flex:1, borderRight:'1px solid #F2F2F2', background: bgColor}} />;
                                            }) : <div style={{flex:1}}></div>}
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
      <div style={{...appleModal, display:'flex', flexDirection:'column', maxHeight:'92vh'}} onClick={e => e.stopPropagation()}>
        <div style={appleModalHeader}>
          <h3 style={modalTitle}>스케줄 확인 ({currentMonthKey})</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={contentBody}>
          <div style={segmentedControl}>
            <button onClick={()=>setViewMode('CALENDAR')} style={viewMode==='CALENDAR' ? segmentActive : segmentInactive}>월간 달력</button>
            <button onClick={()=>setViewMode('TIMETABLE')} style={viewMode==='TIMETABLE' ? segmentActive : segmentInactive}>주간 근무표</button>
          </div>

          {viewMode === 'CALENDAR' ? (
            <>
              <div style={calHeaderNav}>
                <button onClick={handlePrevMonth} style={navArrow}>‹</button>
                <span style={currentMonthText}>{viewDate.getFullYear()}. {viewDate.getMonth()+1}</span>
                <button onClick={handleNextMonth} style={navArrow}>›</button>
              </div>
              <div style={calGrid}>
                {['일','월','화','수','목','금','토'].map(d => <div key={d} style={weekDay}>{d}</div>)}
                {renderCalendar()}
              </div>
              <div style={legend}>
                <div style={legendItem}><span style={{...dot, background:'#007AFF'}}></span>본인</div>
                <div style={legendItem}><span style={{...dot, background:'#5856D6'}}></span>대타</div>
                <div style={legendItem}><span style={{...dot, background:'#EAB308'}}></span>교육</div>
              </div>
            </>
          ) : renderFixedTimetable()}
        </div>
      </div>
    </div>
  );
}

// ... (나머지 스타일 코드는 기존과 동일)
const modalTitle: React.CSSProperties = { margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px', color: '#1C1C1E' };
const contentBody: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '0 20px 30px 20px' };

const segmentedControl: React.CSSProperties = { display: 'flex', background: '#E5E5EA', borderRadius: '10px', padding: '2px', marginBottom: '24px' };
const segmentActive: React.CSSProperties = { flex: 1, border: 'none', background: '#FFFFFF', borderRadius: '8px', padding: '8px', fontSize: '13px', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'default', color: '#1C1C1E' };
const segmentInactive: React.CSSProperties = { flex: 1, border: 'none', background: 'transparent', padding: '8px', fontSize: '13px', color: '#8E8E93', cursor: 'pointer', fontWeight: '500' };

const calHeaderNav: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '20px' };
const currentMonthText: React.CSSProperties = { fontSize: '18px', fontWeight: '800', color: '#1C1C1E', letterSpacing: '-0.5px', minWidth: '100px', textAlign: 'center' };
const navArrow: React.CSSProperties = { background: 'none', border: '1px solid #E5E5EA', borderRadius: '50%', width: '36px', height: '36px', fontSize: '20px', color: '#007AFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' };

const calGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' };
const weekDay: React.CSSProperties = { textAlign: 'center', fontSize: '12px', color: '#AEAEB2', marginBottom: '8px', fontWeight: '600' };

const dayCell: React.CSSProperties = { minHeight: '85px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderRadius: '12px', padding: '8px', cursor: 'pointer', boxSizing: 'border-box', border: '1px solid transparent', transition: 'transform 0.1s' };
const appleDayCell: React.CSSProperties = { ...dayCell };
const appleDayCellEmpty: React.CSSProperties = { ...dayCell, cursor: 'default', background: 'transparent' };

const tagContainer: React.CSSProperties = { width: '100%', display: 'flex', flexDirection: 'column', gap: '3px' };

const appleNameTag: React.CSSProperties = { 
  height: '20px', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  borderRadius: '5px', 
  fontSize: '10px', 
  fontWeight: '700', 
  width: '100%', 
  whiteSpace: 'nowrap', 
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  letterSpacing: '-0.2px'
};

const legend: React.CSSProperties = { marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'center', background: '#F8F9FA', padding: '12px', borderRadius: '12px' };
const legendItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#636366', fontWeight: '600' };
const dot: React.CSSProperties = { width: '8px', height: '8px', borderRadius: '50%' };

const excelWrapper: React.CSSProperties = { marginTop: '10px', border: '1px solid #E5E5EA', borderRadius: '14px', overflow: 'hidden', overflowX: 'auto', background: '#FFF' };
const timeColumn: React.CSSProperties = { display: 'flex', flexDirection: 'column', width: '45px', borderRight: '1px solid #E5E5EA', background: '#F9FAFB' };
const dayColumn: React.CSSProperties = { flex: 1, minWidth: '90px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #E5E5EA' };
const subHeaderRow: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #E5E5EA', height: '28px', background: '#F9FAFB' };
const excelHeaderCell: React.CSSProperties = { padding: '8px 0', textAlign: 'center', borderBottom: '1px solid #E5E5EA', fontWeight: '700', fontSize: '11px', color: '#8E8E93' };
const excelSubHeaderCell: React.CSSProperties = { flex: 1, textAlign: 'center', borderRight: '1px solid #F2F2F2', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1C1C1E', fontWeight: '600' };
const excelTimeCell: React.CSSProperties = { height: '28px', borderBottom: '1px solid #F2F2F2', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#AEAEB2', fontWeight: '500' };
const excelDataRow: React.CSSProperties = { display: 'flex', height: '28px', borderBottom: '1px solid #F2F2F2' };