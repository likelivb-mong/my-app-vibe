import React, { useState, useEffect, useMemo } from 'react';
import { BRANCHES } from '../utils/branches';
import PayStubModal from '../components/Crew/PayStubModal';
import { payStubBankValue } from '../utils/payStubStyles';

// ----------------------------------------------------------------------
// [설정] 관리자 목록 및 비용 카테고리
// ----------------------------------------------------------------------
const ADMIN_PHONES = ['01097243921', '01086369366'];
// ----------------------------------------------------------------------
// [1] 메인 페이지: 지점별 급여 대장 (관리자 뷰 wrapper)
// ----------------------------------------------------------------------
const PayStub = ({ user }: any) => {
  const [viewportWidth, setViewportWidth] = useState<number>(window.innerWidth);
  const [crews, setCrews] = useState<any[]>([]);
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [holidaysMap, setHolidaysMap] = useState<{[key: string]: number}>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [payRefreshTick, setPayRefreshTick] = useState(Date.now());
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

  useEffect(() => {
    const tick = () => setPayRefreshTick(Date.now());
    tick();
    // ✅ 5초 단위로 급여 정산 재계산 (지원금 승인 반영용)
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleBranch = (code: string) => {
    setExpandedBranches(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const isCrewActiveInMonth = (crew: any) => {
    const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
    const activeShift = workingCrews[crew.pin];
    if (!activeShift?.timestamp) return false;

    if (crew.phone) {
      const statusRaw = localStorage.getItem(`work_status_${crew.phone}`);
      if (statusRaw) {
        try {
          if (!JSON.parse(statusRaw)?.working) return false;
        } catch (_) {
          return false;
        }
      }
    }

    const activeDate = new Date(activeShift.timestamp).toLocaleDateString('en-CA');
    return activeDate.startsWith(targetMonth);
  };

  const calculatePaySummary = (crew: any) => {
    const myLogs = logs.filter(l => l.userPin === crew.pin && l.type === 'OUT' && l.date.startsWith(targetMonth));
    let totalPay = 0;
    myLogs.forEach((log: any) => {
      const [h, m] = log.totalWorkTime.split(':').map(Number);
      const totalMinutes = (h * 60) + m;
      const holidayExtraRate = holidaysMap[log.date] || 0;
      const baseRate = crew.totalHourly || 0;
      let dayPay = Math.floor(totalMinutes * (baseRate / 60));
      if (holidayExtraRate > 0) {
          dayPay += Math.floor(totalMinutes * (holidayExtraRate / 60));
      }
      totalPay += dayPay;
    });

    // 현재 근무중(IN) 급여도 예상 수령액에 반영
    const workingCrews = JSON.parse(localStorage.getItem('working_crews') || '{}');
    const activeShift = workingCrews[crew.pin];
    const statusRaw = crew.phone ? localStorage.getItem(`work_status_${crew.phone}`) : null;
    let isActuallyWorking = !crew.phone;
    if (statusRaw) {
      try {
        isActuallyWorking = !!JSON.parse(statusRaw)?.working;
      } catch (_) {
        isActuallyWorking = false;
      }
    }
    if (activeShift?.timestamp && isActuallyWorking) {
      const activeDate = new Date(activeShift.timestamp).toLocaleDateString('en-CA');
      if (activeDate.startsWith(targetMonth)) {
        const startTimeText = String(activeShift.startTime || '00:00');
        const [sh, sm] = startTimeText.split(':').map((n: string) => Number(n) || 0);
        const startDate = new Date(activeDate);
        startDate.setHours(sh, sm, 0, 0);
        const totalMinutes = Math.max(0, Math.floor((Date.now() - startDate.getTime()) / 60000));
        if (totalMinutes > 0) {
          const holidayExtraRate = holidaysMap[activeDate] || 0;
          const baseRate = Number(crew.totalHourly) || 0;
          let activePay = Math.floor(totalMinutes * (baseRate / 60));
          if (holidayExtraRate > 0) {
            activePay += Math.floor(totalMinutes * (holidayExtraRate / 60));
          }
          totalPay += activePay;
        }
      }
    }

    const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
    const crewPin = String(crew.pin ?? '');
    const myExpenses = allApproved.filter((ex: any) => {
      const exPin = String(ex.userPin ?? ex.reqPin ?? '');
      const exDate = String(ex.date || ex.targetDate || '');
      return exPin === crewPin && exDate.startsWith(targetMonth);
    });
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
       const crewPin = String(crew.pin ?? '');
       const hasExp = allApproved.some((ex: any) => {
         const exPin = String(ex.userPin ?? ex.reqPin ?? '');
         const exDate = String(ex.date || ex.targetDate || '');
         return exPin === crewPin && exDate.startsWith(targetMonth);
       });
       const isActive = isCrewActiveInMonth(crew);
       if (hasLog || hasExp || isActive) total += calculatePaySummary(crew).net;
    });
    return total;
  }, [crews, logs, targetMonth, holidaysMap, payRefreshTick]);

  const handleClose = () => { window.location.hash = 'main-dashboard'; };
  const isMobile = viewportWidth <= 560;

  if (user && !ADMIN_PHONES.includes(user.phone) && !user.isAdmin) {
      return <PayStubModal user={user} initialMonth={targetMonth} onBack={() => window.location.hash = 'crew-home'} />;
  }

  return (
    <div style={container}>
      <div style={header}>
        <div style={headerLeft}><h1 style={title}>급여 대장 관리</h1><p style={subTitle}>지점별 급여 지급 내역을 확인하고 관리합니다.</p></div>
        <button
          onClick={handleClose}
          style={{
            ...closeBtnMain,
            width: isMobile ? '36px' : closeBtnMain.width,
            height: isMobile ? '36px' : closeBtnMain.height,
            padding: isMobile ? 0 : closeBtnMain.padding,
            fontSize: isMobile ? '20px' : '14px',
            borderRadius: isMobile ? '50%' : closeBtnMain.borderRadius
          }}
          aria-label="닫기"
        >
          {isMobile ? '×' : '나가기'}
        </button>
      </div>
      <div style={{ ...dashboardCard, padding: isMobile ? '16px' : dashboardCard.padding }}>
         <div style={dashboardLeft}>
          <label style={{ ...dashLabel, fontSize: isMobile ? '11px' : dashLabel.fontSize }}>조회 기준월</label>
          <input
            type="month"
            value={targetMonth}
            onChange={e => setTargetMonth(e.target.value)}
            style={{ ...monthInput, fontSize: isMobile ? '13px' : monthInput.fontSize, padding: isMobile ? '6px 10px' : monthInput.padding }}
          />
         </div>
         <div style={{ ...dashboardDivider, margin: isMobile ? '0 10px' : dashboardDivider.margin, height: isMobile ? '32px' : dashboardDivider.height }}></div>
         <div style={dashboardRight}>
          <span style={{ ...dashTotalLabel, fontSize: isMobile ? '11px' : dashTotalLabel.fontSize }}>총 지급 예정액</span>
          <span style={{ ...dashTotalValue, fontSize: isMobile ? '20px' : '26px' }}>₩{grandTotalPay.toLocaleString()}</span>
         </div>
      </div>
      <div style={listArea}>
        {BRANCHES.map(branch => {
          const allBranchCrews = crews.filter(c => c.branchCode === branch.code);
          const allApproved = JSON.parse(localStorage.getItem('approved_expenses') || '[]');
          const branchCrews = allBranchCrews.filter(c => {
             const crewPin = String(c.pin ?? '');
             const hasExpense = allApproved.some((ex: any) => {
               const exPin = String(ex.userPin ?? ex.reqPin ?? '');
               const exDate = String(ex.date || ex.targetDate || '');
               return exPin === crewPin && exDate.startsWith(targetMonth);
             });
             return logs.some(log => log.userPin === c.pin && log.type === 'OUT' && log.date.startsWith(targetMonth)) ||
                    hasExpense ||
                    isCrewActiveInMonth(c);
          });
          const totalBranchPay = branchCrews.reduce((acc, c) => acc + calculatePaySummary(c).net, 0);
          const isOpen = expandedBranches.includes(branch.code);
          return (
            <div key={branch.code} style={branchCard}>
              <div style={accordionHead} onClick={() => toggleBranch(branch.code)}>
                <div style={branchInfo}>
                  <div style={{ ...branchName, fontSize: isMobile ? '15px' : branchName.fontSize }}>{branch.label}</div>
                  <div style={{ ...branchCount, fontSize: isMobile ? '11px' : branchCount.fontSize }}>{branchCrews.length > 0 ? `${branchCrews.length}명 근무` : '근무자 없음'}</div>
                </div>
                <div style={{ ...branchMeta, gap: isMobile ? '8px' : branchMeta.gap }}>
                  <div style={{ ...branchTotalLabel, fontSize: isMobile ? '10px' : branchTotalLabel.fontSize }}>지급 합계</div>
                  <div style={{ ...branchTotalValue, fontSize: isMobile ? '14px' : branchTotalValue.fontSize }}>₩{totalBranchPay.toLocaleString()}</div>
                  <div style={{transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'0.2s', marginLeft: isMobile ? '4px' : '10px'}}>▼</div>
                </div>
              </div>
              {isOpen && (
                <div style={tableWrap}>
                  {branchCrews.length === 0 ? <div style={emptyBranch}>기록이 없습니다.</div> : (
                      <table style={{ ...table, fontSize: isMobile ? '12px' : table.fontSize }}>
                        <thead>
                          <tr style={thRow}>
                            <th style={{ ...th, padding: isMobile ? '10px 12px' : th.padding, fontSize: isMobile ? '10px' : th.fontSize }}>이름</th>
                            <th style={{ ...th, padding: isMobile ? '10px 12px' : th.padding, fontSize: isMobile ? '10px' : th.fontSize }}>입금 계좌</th>
                            <th style={{ ...th, textAlign:'right', padding: isMobile ? '10px 12px' : th.padding, fontSize: isMobile ? '10px' : th.fontSize }}>실 수령액</th>
                            <th style={{ ...th, width: isMobile ? '48px' : '60px', padding: isMobile ? '10px 8px' : th.padding }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {branchCrews.map((c, i) => {
                            const pay = calculatePaySummary(c);
                            return (
                              <tr key={i} style={tr}>
                                <td
                                  style={{ ...td, padding: isMobile ? '12px' : td.padding, cursor: 'pointer' }}
                                  onClick={() => setSelectedPayStubUser(c)}
                                  title="개인 급여 명세서 보기"
                                >
                                  <div style={{ ...crewNameBox, gap: isMobile ? '0px' : crewNameBox.gap }}>
                                    {!isMobile && (
                                      <div style={{ ...crewAvatar, width: crewAvatar.width, height: crewAvatar.height, fontSize: crewAvatar.fontSize }}>
                                        {c.name.slice(0,1)}
                                      </div>
                                    )}
                                    <div>
                                      <div style={{ ...crewNameText, fontSize: isMobile ? '12px' : crewNameText.fontSize }}>{c.name}</div>
                                      <div style={{ ...crewPosition, fontSize: isMobile ? '10px' : crewPosition.fontSize }}>{c.position || '크루'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td
                                  style={{ ...td, padding: isMobile ? '12px' : td.padding, cursor: 'pointer' }}
                                  onClick={() => setSelectedPayStubUser(c)}
                                  title="개인 급여 명세서 보기"
                                >
                                  {c.bankName ? (
                                    <div style={{ ...bankText, fontSize: isMobile ? '11px' : bankText.fontSize }}>
                                      <span style={{ ...bankNameBadge, fontSize: isMobile ? '10px' : bankNameBadge.fontSize }}>{c.bankName}</span>
                                      <span>{c.accountNumber}</span>
                                    </div>
                                  ) : (
                                    <span style={errorText}>미등록</span>
                                  )}
                                </td>
                                <td
                                  style={{...td, padding: isMobile ? '12px' : td.padding, textAlign:'right', cursor: 'pointer'}}
                                  onClick={() => setSelectedPayStubUser(c)}
                                  title="개인 급여 명세서 보기"
                                >
                                  <span style={{ ...netPayText, fontSize: isMobile ? '13px' : netPayText.fontSize }}>{pay.net.toLocaleString()}</span>
                                </td>
                                <td style={{...td, padding: isMobile ? '10px 8px' : td.padding, textAlign:'right'}}>
                                  <button
                                    onClick={() => setSelectedPayStubUser(c)}
                                    style={{ ...detailBtn, fontSize: isMobile ? '13px' : '14px', padding: isMobile ? '5px 8px' : detailBtn.padding }}
                                    aria-label="명세서 보기"
                                    title="명세서 보기"
                                  >
                                    ₩
                                  </button>
                                </td>
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
        <PayStubModal
          user={selectedPayStubUser}
          initialMonth={targetMonth}
          onBack={() => setSelectedPayStubUser(null)}
        />
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
const subTitle: React.CSSProperties = { fontSize: '12px', color: '#6b7280', margin: 0 };
const closeBtnMain: React.CSSProperties = { padding: '8px', background: 'transparent', border: 'none', borderRadius: '0', cursor: 'pointer', fontWeight: '400', color: '#374151', boxShadow: 'none', transition: 'opacity 0.2s', minWidth: 'auto', minHeight: 'auto' };
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
const cardTitle: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#111827' };
const cardDateBadge: React.CSSProperties = { fontSize: '12px', color: '#475569', background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' };
const sectionGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
const sectionLabel: React.CSSProperties = { fontSize: '12px', color: '#94A3B8', fontWeight: '700', marginBottom: '4px' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center', color: '#475569' };
const label: React.CSSProperties = { fontWeight: '500' };
const val: React.CSSProperties = { fontWeight: '600', color: '#1E293B', fontSize: '13px' };
const subTotalRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px', paddingTop: '8px', borderTop: '1px dotted #E2E8F0', color: '#64748B' };
const divider: React.CSSProperties = { height: '1px', background: '#F1F5F9', margin: '16px 0' };
const finalResultBox: React.CSSProperties = { marginTop: '12px', background: '#F0FDF4', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #BBF7D0' };
const finalLabel: React.CSSProperties = { fontSize: '13px', fontWeight: '700', color: '#166534' };
const finalValue: React.CSSProperties = { fontSize: '13px', fontWeight: '800', color: '#15803D' };
const bankInfoBox: React.CSSProperties = { marginTop: '20px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' };
const bankLabel: React.CSSProperties = { fontSize: '11px', color: '#64748B', fontWeight: '600', marginBottom: '2px' };
const sectionTitle: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#111827', margin: 0 };
const emptyState: React.CSSProperties = { padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', background: '#fff', borderRadius: '16px', border: '1px dashed #E2E8F0' };
const logList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
const logCard: React.CSSProperties = { background: '#fff', padding: '16px 18px', borderRadius: '16px', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', gap: '16px', marginBottom: '10px', transition: 'all 0.2s' };
const logDateBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '10px 0', borderRadius: '10px', width: '48px', flexShrink: 0 };
const logDay: React.CSSProperties = { fontSize: '18px', fontWeight: '800', color: '#111827', lineHeight: '1', marginBottom: '2px' };
const logMonth: React.CSSProperties = { fontSize: '11px', color: '#475569', fontWeight: '700' };
const holidayDateBox: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fecaca' };
const holidayDayText: React.CSSProperties = { color: '#b91c1c' };
const holidayMonthText: React.CSSProperties = { color: '#dc2626', fontWeight: 700 };
const logInfoBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' };
const logTimeRange: React.CSSProperties = { fontSize: '12px', color: '#94A3B8', fontWeight: '500', marginBottom: '2px' };
const logDurationRow: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '6px' };
const logDurationLabel: React.CSSProperties = { fontSize: '11px', color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' };
const logDurationValue: React.CSSProperties = { fontSize: '16px', fontWeight: '800', color: '#1E293B' };
const logBadgeRow: React.CSSProperties = { display: 'flex', gap: '5px', marginTop: '6px' };
const badgeBase: React.CSSProperties = { fontSize: '10px', padding: '2px 6px', borderRadius: '5px', fontWeight: '700', display: 'inline-block' };
const badgeHoliday: React.CSSProperties = { ...badgeBase, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' };
const badgeNoShowLate: React.CSSProperties = { ...badgeBase, background: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74' };
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
const holidayCalcList: React.CSSProperties = { marginTop: '4px', marginBottom: '2px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '8px' };
const holidayCalcItem: React.CSSProperties = { fontSize: '11px', color: '#9f1239', lineHeight: 1.45 };

export default PayStub;