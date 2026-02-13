import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BRANCHES } from '../../utils/branches';
import AppSelect from '../common/AppSelect';

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

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

function normalizeToQuarterHour(raw: string): string {
  const [hRaw = '10', mRaw = '00'] = String(raw || '').split(':');
  const hourNum = Number(hRaw);
  const minuteNum = Number(mRaw);
  const safeHour = Number.isFinite(hourNum) ? Math.min(23, Math.max(0, hourNum)) : 10;
  const safeMinute = Number.isFinite(minuteNum) ? Math.min(59, Math.max(0, minuteNum)) : 0;
  const q = Math.round(safeMinute / 15) * 15;
  const normalizedMinute = q === 60 ? '00' : String(q).padStart(2, '0');
  const normalizedHour = q === 60 ? Math.min(23, safeHour + 1) : safeHour;
  return `${String(normalizedHour).padStart(2, '0')}:${normalizedMinute}`;
}

/** 모바일에서 네이티브 select 드롭다운 위치/크기 오류 방지용 커스텀 드롭다운 */
function MobileTimeSelect({
  options,
  value,
  onChange,
  triggerMinWidth = 48
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  triggerMinWidth?: number;
}) {
  const DROPDOWN_MAX_HEIGHT = 240;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number; openUp: boolean } | null>(null);

  useEffect(() => {
    if (open && triggerRef.current && typeof window !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp = spaceBelow < DROPDOWN_MAX_HEIGHT;
      if (openUp) {
        setPosition({ left: rect.left, bottom: window.innerHeight - rect.top + 6, openUp: true });
      } else {
        setPosition({ left: rect.left, top: rect.bottom + 6, openUp: false });
      }
    } else if (!open) {
      setPosition(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  const listEl = position && open && typeof document !== 'undefined' && createPortal(
    <div
      ref={listRef}
      role="listbox"
      style={{
        position: 'fixed',
        left: position.left,
        ...(position.openUp ? { bottom: position.bottom } : { top: position.top }),
        minWidth: Math.max(triggerMinWidth, 72),
        maxHeight: DROPDOWN_MAX_HEIGHT,
        overflowY: 'auto',
        background: '#1c1c1e',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 10000,
        padding: '6px 0'
      }}
    >
      {options.map((opt) => (
        <div
          key={opt}
          role="option"
          aria-selected={opt === value}
          onClick={() => { onChange(opt); setOpen(false); }}
          style={{
            padding: '12px 16px',
            fontSize: 15,
            fontWeight: 600,
            color: opt === value ? '#60a5fa' : '#e2e8f0',
            background: opt === value ? 'rgba(96,165,250,0.15)' : 'transparent',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          {opt}
        </div>
      ))}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          ...halfHourSelect,
          minWidth: triggerMinWidth,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit'
        }}
      >
        {value} ▼
      </button>
      {listEl}
    </>
  );
}

type HalfHourTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  isMobile?: boolean;
};

function HalfHourTimePicker({ value, onChange, style, isMobile }: HalfHourTimePickerProps) {
  const normalized = normalizeToQuarterHour(value);
  const [hour = '10', minute = '00'] = normalized.split(':');

  if (isMobile) {
    return (
      <span style={{ ...halfHourPickerWrap, ...style }}>
        <MobileTimeSelect
          options={HOUR_OPTIONS}
          value={hour}
          onChange={(h) => onChange(`${h}:${minute}`)}
          triggerMinWidth={48}
        />
        <span style={halfHourColon}>:</span>
        <MobileTimeSelect
          options={MINUTE_OPTIONS}
          value={minute}
          onChange={(m) => onChange(`${hour}:${m}`)}
          triggerMinWidth={44}
        />
      </span>
    );
  }

  return (
    <span style={{ ...halfHourPickerWrap, ...style }}>
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
        style={halfHourSelect}
      >
        {HOUR_OPTIONS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span style={halfHourColon}>:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        style={halfHourSelect}
      >
        {MINUTE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </span>
  );
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
  const [timetableSelectedDay, setTimetableSelectedDay] = useState<number | 'ALL'>(1);
  const [mode, setMode] = useState<'NORMAL' | 'HOLIDAY' | 'ADD_ONE_OFF'>('NORMAL');

  // 휴일 설정 시 적용할 추가 수당 기본값 1,000원
  const [holidayExtraPay, setHolidayExtraPay] = useState<number>(1000);

  const currentMonthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  const [targetCrewId, setTargetCrewId] = useState<string>("");
  const [scheduleType, setScheduleType] = useState<'FIXED' | 'ONE_OFF'>('FIXED');
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [compactScheduleLabels, setCompactScheduleLabels] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth <= 560 : false
  );
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1); 
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [scheduleForm, setScheduleForm] = useState({ startTime: "10:00", endTime: "18:00" });
  const [isToolPanelOpen, setIsToolPanelOpen] = useState<boolean>(false);

  const [dayDetailData, setDayDetailModal] = useState<{ date: string, workers: any[] } | null>(null);
  const [addOneOffModal, setAddOneOffModal] = useState<{ date: string } | null>(null);
  
  const [deleteOptionModal, setDeleteOptionModal] = useState<{ date: string, worker: any } | null>(null);
  const [isDeleteFixed, setIsDeleteFixed] = useState<boolean>(false);

  const [oneOffForm, setOneOffForm] = useState({ crewId: "", startTime: "10:00", endTime: "18:00", type: "SUB" });

  const selectedBranchCode = BRANCHES.find(b => b.label === selectedBranch)?.code;
  const branchCrews = allCrews.filter(
    (c) => c && c.branchCode === selectedBranchCode && c.name && c.pin && (c.status !== 'terminated')
  );
  const isHolidayMode = mode === 'HOLIDAY';
  const isAddOneOffMode = mode === 'ADD_ONE_OFF';
  const calendarModeBg = isHolidayMode
    ? 'rgba(239,68,68,0.07)'
    : isAddOneOffMode
      ? 'rgba(168,85,247,0.08)'
      : 'transparent';
  const isFixedMode = scheduleType === 'FIXED';
  const scheduleAccent = isFixedMode ? '#60a5fa' : '#34d399';
  const scheduleAccentBg = isFixedMode ? 'rgba(96,165,250,0.14)' : 'rgba(52,211,153,0.14)';

  const formatName = (name: string) => (name && name.length > 2 ? name.slice(-2) : name);
  const getShiftStyle = (type?: string) => {
    if (type === 'SUB') return { bg: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.5)' };
    if (type === 'EDU') return { bg: 'rgba(250, 204, 21, 0.2)', color: '#fde047', border: '1px solid rgba(250, 204, 21, 0.5)' };
    return { bg: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: 'none' };
  };
  const getWorkerTypeLabel = (type?: string) => {
    if (type === 'FIXED') return '고정';
    if (type === 'EDU') return '교육';
    if (type === 'SUB') return '대타';
    return '일일';
  };
  const getCrewScheduleHint = (crew: any) => {
    const fromSlot = String(crew?.workTimeSlot || '').trim();
    const fromShifts = Array.isArray(crew?.workShifts) ? crew.workShifts.join(', ') : '';
    const raw = fromSlot || fromShifts;
    if (!raw) return '';
    const compact = raw.replace(/\s*,\s*/g, ' · ');
    return compact.length > 14 ? `${compact.slice(0, 14)}...` : compact;
  };
  const getCrewOptionLabel = (crew: any) => {
    const hint = getCrewScheduleHint(crew);
    // 네이티브 select에서 부분 스타일이 불가하므로, 보조 정보는 짧고 떨어진 형태로만 표기
    return hint ? `${crew.name}   |   (${hint})` : crew.name;
  };

  useEffect(() => {
    const onResize = () => {
      setCompactScheduleLabels(window.innerWidth <= 560);
      setViewportWidth(window.innerWidth);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = viewportWidth <= 560;
  const isVeryNarrow = viewportWidth <= 390;

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const handleDayClick = (dateStr: string, dailyWorkers: any[]) => {
    if (mode === 'HOLIDAY') {
      onHolidaySetting(dateStr, holidayExtraPay);
    } else if (mode === 'ADD_ONE_OFF') {
      setAddOneOffModal({ date: dateStr });
      setOneOffForm({ ...oneOffForm, crewId: String(branchCrews[0]?.pin || ""), startTime: "10:00", endTime: "18:00" });
    } else {
      setDayDetailModal({ date: dateStr, workers: dailyWorkers });
    }
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

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ ...appleDayCellEmpty, height: isMobile ? '96px' : appleDayCellEmpty.height }}></div>);
    }

    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay();
      const holidayExtra = holidays[dateStr];
      const isHoliday = holidayExtra !== undefined;
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

      let dailyWorkers: any[] = [];
      branchCrews.forEach(crew => {
        const schedule = crew.fixedSchedules?.[currentMonthKey]?.[dayOfWeek] ?? crew.fixedSchedules?.[dayOfWeek];
        if (schedule) dailyWorkers.push({ ...crew, ...schedule, type: 'FIXED' });
      });

      const oneOffs = oneOffShifts.filter(s => s.date === dateStr && s.branchCode === selectedBranchCode);
      const replacedNames = new Set(oneOffs.map(s => s.replaceTarget).filter(Boolean) as string[]);
      dailyWorkers = dailyWorkers.filter(w => !replacedNames.has(w.name));
      oneOffs.forEach(s => { if (s.type !== 'OFF') dailyWorkers.push({ name: s.crewName, startTime: s.startTime, endTime: s.endTime, type: s.type }); });

      dailyWorkers.sort((a, b) => a.startTime.localeCompare(b.startTime));

      days.push(
        <div key={d} onClick={() => handleDayClick(dateStr, dailyWorkers)} style={{
          ...appleDayCell,
          height: isMobile ? '96px' : appleDayCell.height,
          padding: isMobile ? '5px' : appleDayCell.padding,
          borderColor: isHoliday ? '#ef4444' : (isToday ? '#007aff' : 'rgba(255,255,255,0.05)'),
          background: isHoliday
            ? 'rgba(239, 68, 68, 0.08)'
            : isHolidayMode
              ? 'rgba(239, 68, 68, 0.05)'
              : isAddOneOffMode
                ? 'rgba(168,85,247,0.06)'
                : 'transparent'
        }}>
          <div style={appleDateNumberWrapper}>
            <span style={{ ...appleDateNumber, width: isMobile ? '21px' : appleDateNumber.width, height: isMobile ? '21px' : appleDateNumber.height, fontSize: isMobile ? '12px' : appleDateNumber.fontSize, background: isToday ? '#ef4444' : 'transparent', color: isToday ? '#fff' : (dayOfWeek === 0 ? '#ef4444' : (dayOfWeek === 6 ? '#60a5fa' : '#fff')) }}>{d}</span>
            {/* 휴일은 텍스트 없이 셀 강조만 유지 */}
          </div>
          <div style={{ ...appleShiftList, gap: isMobile ? '2px' : appleShiftList.gap }}>
            {dailyWorkers.map((worker, idx) => {
              const style = getShiftStyle(worker.type);
              return (
                <div
                  key={idx}
                  style={{
                    ...appleShiftPill,
                    fontSize: isMobile ? '9px' : appleShiftPill.fontSize,
                    padding: isMobile ? '2px 4px' : appleShiftPill.padding,
                    background: style.bg,
                    color: style.color,
                    border: style.border
                  }}
                >
                  {worker.startTime?.substring(0, 5)} {formatName(worker.name)}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  const TIMETABLE_ROW_HEIGHT = 26;
  const TIMETABLE_HEADER_HEIGHT = 28;

  const renderFixedTimetableForMonth = (monthKey: string) => {
    const hours = Array.from({ length: 15 }, (_, i) => 10 + i);
    const weekMap = ['월', '화', '수', '목', '금', '토', '일'];
    const headerCellStyle: React.CSSProperties = { height: TIMETABLE_HEADER_HEIGHT, minHeight: TIMETABLE_HEADER_HEIGHT, padding: 0, borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: isMobile ? '10px' : '11px', color: '#888', background: '#111', boxSizing: 'border-box' };
    const subRowStyle: React.CSSProperties = { height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT, boxSizing: 'border-box' };
    return (
      <div style={excelGrid}>
        <div style={{ display: 'flex', flexDirection: 'column', width: isMobile ? '40px' : '50px', flexShrink: 0, borderRight: '1px solid #333', background: '#1a1a1a', boxSizing: 'border-box' }}>
          <div style={headerCellStyle}>시간</div>
          <div style={{ ...subRowStyle, borderBottom: '1px solid #333' }} />
          {hours.map(h => (
            <div key={h} style={{ ...excelTimeCell, height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT, flexShrink: 0, boxSizing: 'border-box', fontSize: isMobile ? '9px' : '10px' }}>{h}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', minWidth: 0 }}>
          {weekMap.map((dayName, colIdx) => {
            const dayIdx = (colIdx + 1) % 7;
            const workers = branchCrews.filter(c => c.fixedSchedules?.[monthKey]?.[dayIdx]);
            return (
              <div key={dayName} style={{ flex: 1, minWidth: isMobile ? '72px' : '100px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #333', boxSizing: 'border-box' }}>
                <div style={headerCellStyle}>{dayName}</div>
                <div style={{ display: 'flex', borderBottom: '1px solid #333', ...subRowStyle, background: '#1a1a1a' }}>
                  {workers.map((w, i) => <div key={i} style={{ ...excelSubHeaderCell, boxSizing: 'border-box', fontSize: isMobile ? '10px' : excelSubHeaderCell.fontSize }}>{formatName(w.name)}</div>)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {hours.map(hour => (
                    <div key={hour} style={{ display: 'flex', height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT, borderBottom: '1px solid #222', boxSizing: 'border-box' }}>
                      {workers.map((w, i) => {
                        const sc = w.fixedSchedules?.[monthKey]?.[dayIdx];
                        if (!sc) return <div key={i} style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }} />;
                        const startParts = (sc.startTime || '').split(':');
                        const endParts = (sc.endTime || '24:00').split(':');
                        const startH = parseInt(startParts[0], 10);
                        const startM = parseInt(startParts[1], 10) || 0;
                        const endH = parseInt(endParts[0], 10);
                        const endM = parseInt(endParts[1], 10) || 0;
                        const endHour = (typeof endH === 'number' && !Number.isNaN(endH) && endH > 0 && endH <= 24) ? endH : 24;
                        const inRange = hour >= startH && (hour < endHour || (hour === endHour && endM > 0));
                        const isStartRow = hour === startH;
                        const isEndRow = hour === endHour && endM > 0;
                        const q = [15, 30, 45];
                        const showStart = isStartRow && q.includes(startM);
                        const showEnd = isEndRow && q.includes(endM);
                        const labels: number[] = [];
                        if (showStart) labels.push(startM);
                        if (showEnd && (hour !== startH || endM !== startM)) labels.push(endM);
                        const labelText = labels.length ? labels.join(' / ') : '';
                        return (
                          <div key={i} style={{ flex: 1, minWidth: 0, borderRight: '1px solid #222', background: inRange ? 'rgba(59, 130, 246, 0.3)' : 'transparent', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '9px' : '10px', fontWeight: 700, color: '#fff' }}>
                            {labelText}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const renderFixedTimetableOneDay = (dayIdx: number) => {
    const hours = Array.from({ length: 15 }, (_, i) => 10 + i);
    const workers = branchCrews.filter(c => c.fixedSchedules?.[currentMonthKey]?.[dayIdx]);
    const headerCellStyle: React.CSSProperties = { height: TIMETABLE_HEADER_HEIGHT, minHeight: TIMETABLE_HEADER_HEIGHT, padding: 0, borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: isMobile ? '10px' : '11px', color: '#888', background: '#111', boxSizing: 'border-box' };
    const subRowStyle: React.CSSProperties = { height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT, boxSizing: 'border-box' };
    const oneDayGridStyle: React.CSSProperties = { ...excelGrid, minWidth: 0, width: '100%' };
    const timeColWidth = isMobile ? 36 : 50;
    return (
      <div style={oneDayGridStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', width: timeColWidth, flexShrink: 0, borderRight: '1px solid #333', background: '#1a1a1a', boxSizing: 'border-box' }}>
          <div style={headerCellStyle}>시간</div>
          <div style={{ ...subRowStyle, borderBottom: '1px solid #333' }} />
          {hours.map(h => (
            <div key={h} style={{ ...excelTimeCell, height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT, flexShrink: 0, boxSizing: 'border-box', fontSize: isMobile ? '9px' : '10px' }}>{h}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #333', boxSizing: 'border-box' }}>
            <div style={headerCellStyle}>{dayNames[dayIdx]}</div>
            <div style={{ display: 'flex', borderBottom: '1px solid #333', ...subRowStyle, background: '#1a1a1a' }}>
              {workers.map((w, i) => <div key={i} style={{ ...excelSubHeaderCell, boxSizing: 'border-box', fontSize: isMobile ? '10px' : excelSubHeaderCell.fontSize }}>{formatName(w.name)}</div>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              {hours.map(hour => (
                <div key={hour} style={{ display: 'flex', height: TIMETABLE_ROW_HEIGHT, minHeight: TIMETABLE_ROW_HEIGHT, borderBottom: '1px solid #222', boxSizing: 'border-box' }}>
                  {workers.map((w, i) => {
                    const sc = w.fixedSchedules?.[currentMonthKey]?.[dayIdx];
                    if (!sc) return <div key={i} style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }} />;
                    const startParts = (sc.startTime || '').split(':');
                    const endParts = (sc.endTime || '24:00').split(':');
                    const startH = parseInt(startParts[0], 10);
                    const startM = parseInt(startParts[1], 10) || 0;
                    const endH = parseInt(endParts[0], 10);
                    const endM = parseInt(endParts[1], 10) || 0;
                    const endHour = (typeof endH === 'number' && !Number.isNaN(endH) && endH > 0 && endH <= 24) ? endH : 24;
                    const inRange = hour >= startH && (hour < endHour || (hour === endHour && endM > 0));
                    const isStartRow = hour === startH;
                    const isEndRow = hour === endHour && endM > 0;
                    const q = [15, 30, 45];
                    const showStart = isStartRow && q.includes(startM);
                    const showEnd = isEndRow && q.includes(endM);
                    const labels: number[] = [];
                    if (showStart) labels.push(startM);
                    if (showEnd && (hour !== startH || endM !== startM)) labels.push(endM);
                    const labelText = labels.length ? labels.join(' / ') : '';
                    return (
                      <div key={i} style={{ flex: 1, minWidth: 0, borderRight: '1px solid #222', background: inRange ? 'rgba(59, 130, 246, 0.3)' : 'transparent', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '9px' : '10px', fontWeight: 700, color: '#fff' }}>
                        {labelText}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTimetableContent = () => {
    const tabStyle = (selected: boolean): React.CSSProperties => ({
      padding: isMobile ? '6px 8px' : '8px 10px',
      fontSize: isMobile ? '10px' : '11px',
      fontWeight: 600,
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      background: selected ? 'rgba(96,165,250,0.25)' : 'transparent',
      color: selected ? '#93c5fd' : '#94a3b8',
      flexShrink: 0
    });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {dayNames.map((name, i) => (
            <button key={i} type="button" onClick={() => setTimetableSelectedDay(i)} style={tabStyle(timetableSelectedDay === i)}>
              {name}
            </button>
          ))}
          <button type="button" onClick={() => setTimetableSelectedDay('ALL')} style={tabStyle(timetableSelectedDay === 'ALL')}>
            전체 보기
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {timetableSelectedDay === 'ALL' ? (
            <div style={{ ...excelWrapper, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {renderFixedTimetableForMonth(currentMonthKey)}
            </div>
          ) : (
            <div style={{ ...excelWrapper, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', overflowX: 'hidden' }}>
              {renderFixedTimetableOneDay(timetableSelectedDay)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div
        style={{
          ...appleModalContainer,
          width: isMobile ? '96%' : appleModalContainer.width,
          maxWidth: isMobile ? '560px' : appleModalContainer.maxWidth,
          height: isMobile ? '92vh' : appleModalContainer.height,
          borderRadius: isMobile ? '16px' : appleModalContainer.borderRadius
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ ...appleModalHeader, padding: isMobile ? '14px 12px' : appleModalHeader.padding }}>
          <div style={{ ...appleHeaderMainRow, gap: isMobile ? '6px' : '8px' }}>
            <div style={{ ...appleHeaderMonthRow, gap: isMobile ? '4px' : '4px' }}>
              {viewMode === 'CALENDAR' && (
                <button
                  onClick={handlePrevMonth}
                  aria-label="이전 달"
                  style={{ ...appleNavBtn, width: '24px', height: '24px', fontSize: '13px' }}
                >
                  ‹
                </button>
              )}
              <div style={{ ...monthYearBlock, alignItems: 'center' }}>
                <span style={{ ...monthTitleMonth, fontSize: isMobile ? '22px' : '20px', lineHeight: 1.1 }}>{viewDate.getMonth() + 1}</span>
                <span style={monthTitleYear}>{viewDate.getFullYear()}</span>
              </div>
              {viewMode === 'CALENDAR' && (
                <button
                  onClick={handleNextMonth}
                  aria-label="다음 달"
                  style={{ ...appleNavBtn, width: '24px', height: '24px', fontSize: '13px' }}
                >
                  ›
                </button>
              )}
            </div>
            <div
              style={{
                ...appleToggleSwitchTrack,
                width: isVeryNarrow ? '160px' : isMobile ? '200px' : '220px'
              }}
            >
              <div
                style={{
                  ...appleToggleSwitchThumb,
                  left: viewMode === 'CALENDAR' ? '2px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 4px)'
                }}
              />
              <button
                type="button"
                onClick={() => setViewMode('CALENDAR')}
                style={{ ...appleToggleSwitchOption, color: viewMode === 'CALENDAR' ? '#60a5fa' : appleToggleSwitchOption.color }}
              >
                월간 스케줄
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('TIMETABLE'); setTimetableSelectedDay(viewDate.getDay()); }}
                style={{ ...appleToggleSwitchOption, color: viewMode === 'TIMETABLE' ? '#60a5fa' : appleToggleSwitchOption.color }}
              >
                근무표
              </button>
            </div>
          </div>
          <button onClick={onClose} style={{ ...appleCloseBtn, width: isMobile ? '30px' : appleCloseBtn.width, height: isMobile ? '30px' : appleCloseBtn.height }}>✕</button>
        </div>

        <div style={appleContentArea}>
          {viewMode === 'CALENDAR' ? (
            <>
              <div style={{ ...appleToolbar, padding: isMobile ? '10px 12px' : appleToolbar.padding, gap: isMobile ? '8px' : '12px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <div style={toolbarBranchCode}>{selectedBranchCode || selectedBranch}</div>
                <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                  {mode === 'HOLIDAY' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', whiteSpace: 'nowrap' }}>휴일 수당</span>
                      <input 
                        type="number" 
                        value={holidayExtraPay} 
                        onChange={(e) => setHolidayExtraPay(Number(e.target.value))} 
                        style={{ background: 'transparent', border: 'none', color: '#fff', width: '52px', fontSize: '12px', textAlign: 'right', outline: 'none' }}
                      />
                      <span style={{ fontSize: '11px', color: '#888' }}>원</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setMode(prev => (prev === 'HOLIDAY' ? 'NORMAL' : 'HOLIDAY'))}
                      style={{ ...appleToolBtn, color: mode === 'HOLIDAY' ? '#ef4444' : '#888', borderColor: mode === 'HOLIDAY' ? '#ef4444' : 'rgba(255,255,255,0.1)', padding: isMobile ? '4px 10px' : appleToolBtn.padding, fontSize: isMobile ? '10px' : appleToolBtn.fontSize }}
                    >
                      휴일 설정
                    </button>
                    <button
                      onClick={() => setMode(prev => (prev === 'ADD_ONE_OFF' ? 'NORMAL' : 'ADD_ONE_OFF'))}
                      style={{ ...appleToolBtn, color: mode === 'ADD_ONE_OFF' ? '#a855f7' : '#888', borderColor: mode === 'ADD_ONE_OFF' ? '#a855f7' : 'rgba(255,255,255,0.1)', padding: isMobile ? '4px 10px' : appleToolBtn.padding, fontSize: isMobile ? '10px' : appleToolBtn.fontSize }}
                    >
                      +교육/대타
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ ...appleCalendarGrid, background: calendarModeBg, padding: isMobile ? '8px' : appleCalendarGrid.padding }}>
                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                  <div key={d} style={{ ...appleWeekHeader, fontSize: isMobile ? '10px' : appleWeekHeader.fontSize, paddingBottom: isMobile ? '6px' : appleWeekHeader.paddingBottom }}>
                    {d}
                  </div>
                ))}
                {renderCalendar()}
              </div>
            </>
          ) : renderTimetableContent()}
        </div>

        <div style={{ ...appleBottomPanel, padding: isMobile ? '8px 12px 10px' : appleBottomPanel.padding }}>
          <button
            type="button"
            onClick={() => setIsToolPanelOpen(prev => !prev)}
            style={{
              ...applePanelToggleBtn,
              padding: isMobile ? '12px 10px' : applePanelToggleBtn.padding,
              minHeight: isMobile ? '48px' : applePanelToggleBtn.minHeight
            }}
          >
            <span style={{ ...applePanelToggleTitle, fontSize: isMobile ? '12px' : applePanelToggleTitle.fontSize }}>Scheduling Setup</span>
            <span style={{ ...applePanelToggleHint, fontSize: isVeryNarrow ? '10px' : (isMobile ? '11px' : applePanelToggleHint.fontSize) }}>근무자 스케줄 설정하기</span>
            <span style={applePanelToggleArrowCenter}>{isToolPanelOpen ? '⌄' : '⌃'}</span>
          </button>
          <div style={{ ...appleBottomPanelContent, maxHeight: isToolPanelOpen ? (isMobile ? '360px' : '240px') : '0px', opacity: isToolPanelOpen ? 1 : 0 }}>
          <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: '20px' } : { display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* 모바일 1행: 요일(고정) 또는 날짜(일일) */}
            {isMobile && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%', minWidth: 0 }}>
                {scheduleType === 'FIXED' ? (
                  <div style={{ display: 'flex', flex: '1 1 0', minWidth: 0, gap: '6px' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedDayTab(idx)}
                        style={{
                          flex: '1 1 0',
                          minWidth: 0,
                          height: '28px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          background: selectedDayTab === idx ? scheduleAccent : '#333',
                          color: selectedDayTab === idx ? '#0b1220' : '#888',
                          border: selectedDayTab === idx ? `1px solid ${scheduleAccent}` : '1px solid rgba(255,255,255,0.08)'
                        }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                ) : (
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...appleDateInput, flex: 1, minWidth: 0, fontSize: '12px' }} />
                )}
              </div>
            )}

            {/* 모바일 2행: 매주/일일 + 시간 한 줄 */}
            <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', alignItems: 'center', flexWrap: 'nowrap', minWidth: 0, overflowX: isMobile ? 'auto' : 'visible' }}>
              {!isMobile && scheduleType === 'FIXED' && (
                <div style={fixedScheduleRow}>
                  <div style={fixedDayTabsRow}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedDayTab(idx)}
                        style={{
                          ...appleDayTab,
                          background: selectedDayTab === idx ? scheduleAccent : '#333',
                          color: selectedDayTab === idx ? '#0b1220' : '#888',
                          border: selectedDayTab === idx ? `1px solid ${scheduleAccent}` : '1px solid rgba(255,255,255,0.08)'
                        }}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <HalfHourTimePicker value={scheduleForm.startTime} onChange={(value) => setScheduleForm({ ...scheduleForm, startTime: value })} isMobile={isMobile} />
                    <span style={{ color: '#888', fontWeight: 'bold' }}>~</span>
                    <HalfHourTimePicker value={scheduleForm.endTime} onChange={(value) => setScheduleForm({ ...scheduleForm, endTime: value })} isMobile={isMobile} />
                  </div>
                </div>
              )}
              {!isMobile && scheduleType === 'ONE_OFF' && (
                <div style={oneOffDateTimeRow}>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={appleDateInput} />
                  <div style={oneOffTimeRangeBox}>
                    <HalfHourTimePicker value={scheduleForm.startTime} onChange={(value) => setScheduleForm({ ...scheduleForm, startTime: value })} isMobile={isMobile} />
                    <span style={{ color: '#888', fontWeight: 'bold' }}>~</span>
                    <HalfHourTimePicker value={scheduleForm.endTime} onChange={(value) => setScheduleForm({ ...scheduleForm, endTime: value })} isMobile={isMobile} />
                  </div>
                </div>
              )}
              <div style={{ ...appleToggleGroup, marginRight: isMobile ? 0 : appleToggleGroup.marginRight, flexShrink: 0, ...(isMobile ? { height: '30px', padding: '2px', borderRadius: '8px' } : {}) }}>
                <button
                  onClick={() => setScheduleType('FIXED')}
                  style={scheduleType === 'FIXED' ? { ...appleToggleActive, background: 'rgba(96,165,250,0.28)', color: '#dbeafe', border: '1px solid rgba(96,165,250,0.55)', ...(isMobile ? { padding: '0 8px', minWidth: '40px', height: '26px', fontSize: '11px' } : {}) } : { ...appleToggle, ...(isMobile ? { padding: '0 8px', minWidth: '40px', height: '26px', fontSize: '11px' } : {}) }}
                >
                  {compactScheduleLabels ? '매주' : '주 고정'}
                </button>
                <button
                  onClick={() => setScheduleType('ONE_OFF')}
                  style={scheduleType === 'ONE_OFF' ? { ...appleToggleActive, background: 'rgba(52,211,153,0.28)', color: '#d1fae5', border: '1px solid rgba(52,211,153,0.55)', ...(isMobile ? { padding: '0 8px', minWidth: '40px', height: '26px', fontSize: '11px' } : {}) } : { ...appleToggle, ...(isMobile ? { padding: '0 8px', minWidth: '40px', height: '26px', fontSize: '11px' } : {}) }}
                >
                  {compactScheduleLabels ? '일일' : '일일 근무'}
                </button>
              </div>
              {isMobile && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                  <HalfHourTimePicker value={scheduleForm.startTime} onChange={(value) => setScheduleForm({ ...scheduleForm, startTime: value })} isMobile={isMobile} />
                  <span style={{ color: '#888', fontWeight: 'bold', fontSize: isMobile ? '11px' : undefined }}>~</span>
                  <HalfHourTimePicker value={scheduleForm.endTime} onChange={(value) => setScheduleForm({ ...scheduleForm, endTime: value })} isMobile={isMobile} />
                </div>
              )}
            </div>

            {/* 모바일 3행: 크루 선택 + 등록 | PC: 크루 + 등록 */}
            <div style={{ display: 'flex', gap: isMobile ? '12px' : '12px', alignItems: 'center', ...(isMobile ? { width: '100%' } : { marginLeft: 'auto' }) }}>
              <div style={{ ...appleRightSetupGroup, marginLeft: isMobile ? 0 : appleRightSetupGroup.marginLeft, flex: isMobile ? '1 1 0' : undefined, minWidth: isMobile ? 0 : undefined }}>
                <AppSelect
                  value={targetCrewId}
                  onChange={setTargetCrewId}
                  style={{ ...appleCrewSelect, width: isMobile ? '100%' : appleCrewSelect.width, minWidth: isMobile ? 0 : appleCrewSelect.minWidth, ...(isMobile ? { height: '32px', fontSize: '12px', padding: '0 8px' } : {}) }}
                  optionStyle={{ fontSize: '14px', minHeight: '36px', padding: '8px 10px' }}
                  options={[
                    { value: '', label: '크루 선택' },
                    ...branchCrews.map((c) => ({ value: String(c.pin), label: c.name })),
                  ]}
                />
              </div>
              <button onClick={handlePanelSave} style={{ ...appleSaveBtn, marginLeft: isMobile ? 0 : appleSaveBtn.marginLeft, width: isMobile ? '72px' : undefined, flexShrink: 0, ...(isMobile ? { height: '32px', padding: '0 12px', fontSize: '12px' } : {}) }}>등록</button>
            </div>
          </div>
          </div>
        </div>

        {dayDetailData && (
          <div style={{ ...overlay, zIndex: 1100 }} onClick={() => setDayDetailModal(null)}>
            <div style={{ ...applePopup, maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div style={dayDetailHeader}>
                <h3 style={dayDetailTitle}>{dayDetailData.date} · 상세 근무 일정</h3>
                <button onClick={() => setDayDetailModal(null)} style={closeBtn}>×</button>
              </div>
              <div style={{ padding: '15px', maxHeight: '350px', overflowY: 'auto' }}>
                {dayDetailData.workers.length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>근무자 없음</p> :
                  dayDetailData.workers.map((w, idx) => (
                    <div key={idx} style={workerDetailItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: getShiftStyle(w.type).bg }}></div>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#fff' }}>
                            {w.name} <span style={workerTypeLabel}>{getWorkerTypeLabel(w.type)}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{w.startTime} ~ {w.endTime}</div>
                        </div>
                      </div>
                      <button onClick={() => openDeleteOption(w, dayDetailData.date)} style={deleteTextBtn}>삭제</button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {deleteOptionModal && (
          <div style={{ ...overlay, zIndex: 1200 }} onClick={() => setDeleteOptionModal(null)}>
            <div style={{ ...applePopup, maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
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
                  <div style={{fontSize: '11px', color: '#888'}}>선택한 날짜에 등록된 내용만 삭제합니다. 고정 스케줄이 있으면 다시 등록하면 그대로 표시됩니다.</div>
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
            <div style={{ ...applePopup, maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div style={applePopupHeader}><h3>{addOneOffModal.date} 일정 추가</h3><button onClick={() => setAddOneOffModal(null)} style={closeBtn}>×</button></div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AppSelect
                  value={oneOffForm.crewId}
                  onChange={(value) => setOneOffForm({ ...oneOffForm, crewId: value })}
                  style={{ ...appleSelectFull, fontSize: '14px' }}
                  optionStyle={{ fontSize: '14px', minHeight: '36px', padding: '8px 10px' }}
                  options={[
                    { value: '', label: '크루 선택' },
                    ...branchCrews.map((c) => ({ value: String(c.pin), label: c.name })),
                  ]}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setOneOffForm({ ...oneOffForm, type: 'SUB' })} style={oneOffForm.type === 'SUB' ? typeBtnActive : typeBtn}>🟣 대타</button>
                  <button onClick={() => setOneOffForm({ ...oneOffForm, type: 'EDU' })} style={oneOffForm.type === 'EDU' ? typeBtnActive : typeBtn}>🟡 교육</button>
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <HalfHourTimePicker value={oneOffForm.startTime} onChange={(value) => setOneOffForm({ ...oneOffForm, startTime: value })} style={{ width: '100%' }} isMobile={isMobile} />
                  <span style={{color:'#fff'}}>~</span>
                  <HalfHourTimePicker value={oneOffForm.endTime} onChange={(value) => setOneOffForm({ ...oneOffForm, endTime: value })} style={{ width: '100%' }} isMobile={isMobile} />
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
const appleModalHeader: React.CSSProperties = { padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' };
const appleHeaderMainRow: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 };
const appleHeaderMonthRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: '1 1 auto' };
const monthYearBlock: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0', minWidth: 0 };
const monthTitleYear: React.CSSProperties = { fontSize: '11px', color: '#94a3b8', fontWeight: '600', letterSpacing: '0.02em', lineHeight: 1.2 };
const monthTitleMonth: React.CSSProperties = { fontSize: '20px', color: '#fff', fontWeight: '800', letterSpacing: '-0.02em' };
const appleNavBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', width: '20px', height: '20px', color: '#e2e8f0', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };
const appleCloseBtn: React.CSSProperties = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', color: '#888', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const appleToggleSwitchTrack: React.CSSProperties = { position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' };
const appleToggleSwitchThumb: React.CSSProperties = { position: 'absolute', top: '2px', bottom: '2px', borderRadius: '8px', background: 'rgba(99,99,102,0.9)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s ease', zIndex: 0 };
const appleToggleSwitchOption: React.CSSProperties = { flex: 1, border: 'none', background: 'transparent', color: '#94a3b8', padding: '6px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '8px', fontWeight: '600', position: 'relative', zIndex: 1, whiteSpace: 'nowrap' };
const appleContentArea: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const appleToolbar: React.CSSProperties = { padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const toolbarBranchCode: React.CSSProperties = { fontSize: '13px', color: '#cbd5e1', fontWeight: '800', letterSpacing: '0.4px', whiteSpace: 'nowrap', textShadow: '0 1px 0 rgba(0,0,0,0.45)' };
const appleToolBtn: React.CSSProperties = { background: 'transparent', border: '1px solid', borderRadius: '14px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: '600', transition: '0.2s' };
const appleCalendarGrid: React.CSSProperties = { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: '30px auto', overflowY: 'auto', padding: '12px', gap: '2px' };
const appleWeekHeader: React.CSSProperties = { textAlign: 'center', fontSize: '11px', color: '#86868b', fontWeight: '600', paddingBottom: '8px' };
const appleDayCell: React.CSSProperties = { height: '112px', background: 'transparent', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'background 0.2s', overflow: 'hidden' };
const appleDayCellEmpty: React.CSSProperties = { height: '112px', background: 'transparent', borderRadius: '6px', border: 'none', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'default' };
const appleDateNumberWrapper: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const appleDateNumber: React.CSSProperties = { fontSize: '13px', fontWeight: '500', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' };
const appleShiftList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', minHeight: 0, flex: 1, paddingRight: '2px' };
const appleShiftPill: React.CSSProperties = { fontSize: '10px', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', fontWeight: '500', lineHeight: 1.25, wordBreak: 'keep-all' };
const appleBottomPanel: React.CSSProperties = { background: '#1c1c1e', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '10px 24px 12px' };
const applePanelToggleBtn: React.CSSProperties = { position: 'relative', width: '100%', minHeight: '52px', background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', borderRadius: '10px', display: 'flex', alignItems: 'center', padding: '14px 12px', cursor: 'pointer' };
const applePanelToggleTitle: React.CSSProperties = { fontSize: '13px', fontWeight: '800', letterSpacing: '0.2px', color: '#e2e8f0' };
const applePanelToggleHint: React.CSSProperties = { marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap', textAlign: 'right' };
const applePanelToggleArrow: React.CSSProperties = { fontSize: '18px', lineHeight: 1, color: '#93c5fd' };
const applePanelToggleArrowCenter: React.CSSProperties = { ...applePanelToggleArrow, position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
const appleBottomPanelContent: React.CSSProperties = { overflow: 'visible', transition: 'max-height 0.24s ease, opacity 0.2s ease', willChange: 'max-height, opacity', paddingTop: '20px' };
const appleSelect: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none', cursor: 'pointer', minWidth: '100px' };
const appleCrewSelect: React.CSSProperties = { ...appleSelect, minWidth: '140px', width: '140px', flexShrink: 0, height: '40px', padding: '0 12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' };
const appleRightSetupGroup: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginLeft: 'auto', flexWrap: 'nowrap', whiteSpace: 'nowrap' };
const appleSelectFull: React.CSSProperties = { ...appleSelect, width: '100%' };
const appleToggleGroup: React.CSSProperties = { display: 'flex', background: '#333', borderRadius: '10px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)', marginRight: 'auto', height: '40px', boxSizing: 'border-box' };
const appleToggle: React.CSSProperties = { background: 'transparent', border: '1px solid transparent', color: '#888', padding: '0 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', minWidth: '82px', fontWeight: '700', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const appleToggleActive: React.CSSProperties = { ...appleToggle, color: '#fff', fontWeight: 'bold' };
const fixedScheduleRow: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', flexWrap: 'wrap' };
const fixedDayTabsRow: React.CSSProperties = { display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' };
const appleDayTab: React.CSSProperties = { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer', fontWeight: '700' };
const appleTimeInputVisible: React.CSSProperties = { background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontFamily: 'monospace', width: 'auto', minWidth: '70px', cursor: 'text', outline: 'none', textAlign: 'center', colorScheme: 'dark' };
const halfHourPickerWrap: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0', height: '32px', padding: '0 4px', borderRadius: '8px', background: 'transparent', border: 'none', minWidth: '56px', boxSizing: 'border-box' };
const halfHourSelect: React.CSSProperties = { background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, outline: 'none', textAlign: 'center', minWidth: '20px', padding: 0, cursor: 'pointer' };
const halfHourColon: React.CSSProperties = { color: '#fff', fontSize: '12px', fontWeight: 600, lineHeight: 1, margin: '0 1px' };
const oneOffDateTimeRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 420px', minWidth: '300px' };
const oneOffTimeRangeBox: React.CSSProperties = { display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', flex: 1, minWidth: '220px' };
const appleDateInput: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', outline: 'none', colorScheme: 'dark', flex: '0 0 138px', minWidth: '138px' };
const appleSaveBtn: React.CSSProperties = { background: '#30d158', color: '#fff', border: 'none', height: '40px', padding: '0 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const appleSaveBtnFull: React.CSSProperties = { ...appleSaveBtn, width: '100%', marginLeft: 0, marginTop: '10px' };
const applePopup: React.CSSProperties = { background: '#1c1c1e', width: '90%', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' };
const applePopupHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' };
const workerDetailItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '6px' };
const dayDetailHeader: React.CSSProperties = { ...applePopupHeader, padding: '12px 14px' };
const dayDetailTitle: React.CSSProperties = { margin: 0, fontSize: '15px', fontWeight: '700', letterSpacing: '-0.2px', color: '#e5e7eb' };
const workerTypeLabel: React.CSSProperties = { fontSize: '11px', color: '#a5b4fc', fontWeight: '700', marginLeft: '4px' };
const deleteTextBtn: React.CSSProperties = { background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' };
const typeBtn: React.CSSProperties = { flex: 1, padding: '8px', background: '#333', border: '1px solid #444', color: '#aaa', borderRadius: '8px', cursor: 'pointer' };
const typeBtnActive: React.CSSProperties = { ...typeBtn, background: '#444', color: '#fff', borderColor: '#fff' };
const excelWrapper: React.CSSProperties = { borderRadius: '0', overflow: 'hidden', overflowX: 'auto', background: '#1a1a1a', height: '100%' };
const excelGrid: React.CSSProperties = { display: 'flex', minWidth: '600px', height: '100%' };
const excelHeaderCell: React.CSSProperties = { padding: '8px 0', textAlign: 'center', borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: '12px', color: '#888', background: '#111' };
const excelSubHeaderCell: React.CSSProperties = { flex: 1, minWidth: 0, textAlign: 'center', borderRight: '1px solid #333', fontSize: '11px', padding: '4px 2px', background: '#151515', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box' };
const excelTimeCell: React.CSSProperties = { height: '30px', borderBottom: '1px solid #333', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', boxSizing: 'border-box' };

const deleteOptionCard: React.CSSProperties = { padding: '12px 14px', borderRadius: '12px', border: '2px solid', cursor: 'pointer', transition: '0.2s' };
const appleBtnBase: React.CSSProperties = { border: 'none', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' };