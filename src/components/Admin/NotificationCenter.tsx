import React, { useState, useEffect } from 'react';

interface Props {
  requests: any[];
  requestArchive: any[];
  tempEdits: { [reqId: number]: { start: string; end: string } };
  setTempEdits: React.Dispatch<React.SetStateAction<{ [reqId: number]: { start: string; end: string } }>>;
  handleProcessRequest: (req: any, isApproved: boolean) => void;
  handleClearAllRequests: () => void;
  handleRestoreRequest: (archived: any) => void;
  formatDateSafe: (d: any) => string;
  setRequests: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function NotificationCenter({
  requests,
  requestArchive,
  tempEdits,
  setTempEdits,
  handleProcessRequest,
  handleClearAllRequests,
  handleRestoreRequest,
  formatDateSafe
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'pending' | 'archive'>('pending');

  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isPhone = viewportWidth <= 560;

  const getNameWithBranch = (r: any) => {
    const name = r.reqName || r.fromName || r.toName || '크루';
    const code = r.branchCode;
    return code ? `${name} (${code})` : name;
  };

  const getReqLabel = (r: any) => {
    const who = getNameWithBranch(r);

    if (r.type === 'PROFILE') return `프로필 수정 요청 · ${who}`;
    if (r.type === 'LOG') return `근무 시간 수정 요청 · ${who}`;
    if (r.type === 'EXPENSE') return `지원금 청구 요청 · ${who}`;
    if (r.type === 'REPORT') {
      return r.reportType === 'NO_SHOW_LATE_REQUEST'
        ? `무단 지각 출근 승인 요청 · ${who}`
        : `징계/결근 리포트 · ${who}`;
    }
    if (r.type === 'UNSCHEDULED_WORK') return `스케줄 외 근무 신청 · ${who}`;
    if (r.type === 'SUB_NOTI' || r.type === 'SUB_REQUEST') {
      // 대타 요청은 기존 문구 유지 (필요 시 추후 별도 디자인)
      return `대타 요청 대기중, ${r.fromName || '?'} 가 ${r.toName || '?'} 에게`;
    }
    return `요청 · ${who}`;
  };

  const formatKoreanDateTime = (value: any) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatTimeHM = (value: any) => {
    if (!value) return '-';
    const str = String(value);
    const m = str.match(/^(\d{1,2}:\d{2})/);
    return m ? m[1] : str;
  };

  const getReqDetail = (r: any) => {
    if (r.type === 'UNSCHEDULED_WORK') {
      // 요청 일시는 상단 meta에서 날짜+시간으로 표시하므로, 여기서는 사유만 노출
      const reason = r.reason || '-';
      return `사유: ${reason}`;
    }

    if (r.type === 'LOG') {
      let base = `수정 희망: ${r.newStartTime || '-'} ~ ${r.newEndTime || '(중)'}`;
      if (r.reason) base += ` · 사유: ${r.reason}`;
      return base;
    }

    if (r.type === 'EXPENSE') {
      // 날짜·카테고리·금액은 여기서, 사유는 하단 expenseMetaRow에서 별도 노출
      return `${r.targetDate || '-'} · ${r.category || '기타'} · ₩${(Number(r.amount) || 0).toLocaleString()}`;
    }

    if (r.type === 'REPORT') {
      return `${r.targetDate || '-'} · ${r.reason || ''}`;
    }

    if (r.type === 'SUB_NOTI' || r.type === 'SUB_REQUEST') {
      let base = `대상일: ${r.targetDate || '-'} · ${r.targetStartTime || ''} ~ ${r.targetEndTime || ''}`;
      if (r.reason) base += ` · 사유: ${r.reason}`;
      return base;
    }

    return r.reason || '';
  };

  const handleOpenReceipt = (img?: string) => {
    if (!img) {
      alert('첨부된 영수증이 없습니다.');
      return;
    }
    const win = window.open('');
    win?.document.write(`<img src="${img}" style="max-width:100%" alt="영수증 이미지" />`);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={bellBtn}
        aria-label="알림"
      >
        🔔
        {requests.length > 0 && (
          <span style={badge}>{requests.length > 99 ? '99+' : requests.length}</span>
        )}
      </button>
      {open && (
        <>
          <div style={backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
          <div style={isPhone ? panelMobile : panel}>
            <div style={panelHeader}>
              <span style={panelTitle}>승인 요청</span>
              <div style={headerActions}>
                {tab === 'pending' && requests.length > 0 && (
                  <button type="button" onClick={handleClearAllRequests} style={clearAllBtn}>전부 삭제</button>
                )}
                <button type="button" onClick={() => setOpen(false)} style={closeBtn}>×</button>
              </div>
            </div>
            <div style={tabRow}>
              <button type="button" onClick={() => setTab('pending')} style={tab === 'pending' ? tabActive : tabInactive}>대기 중 ({requests.length})</button>
              <button type="button" onClick={() => setTab('archive')} style={tab === 'archive' ? tabActive : tabInactive}>요청 보관함 ({requestArchive.length})</button>
            </div>
            <div style={panelBody}>
              {tab === 'pending' ? (
                requests.length === 0 ? (
                  <p style={emptyText}>대기 중인 요청이 없습니다.</p>
                ) : (
                  requests.map(req => (
                    <div key={req.id} style={card}>
                      <div style={cardTitle}>{getReqLabel(req)}</div>
                      {req.requestDate && (
                        <div style={cardMeta}>요청 일시: {formatKoreanDateTime(req.requestDate)}</div>
                      )}
                      <div style={cardReason}>{getReqDetail(req) || req.reason}</div>
                      {req.type === 'EXPENSE' && (
                        <div style={expenseMetaRow}>
                          <span style={expenseReasonText}>{req.reason || '청구 사유 없음'}</span>
                          <button type="button" onClick={() => handleOpenReceipt(req.receiptImage)} style={receiptBtn}>열어보기</button>
                        </div>
                      )}
                      {req.type === 'LOG' && (
                        <div style={timeRow}>
                          <input
                            type="time"
                            value={tempEdits[req.id]?.start ?? req.newStartTime ?? ''}
                            onChange={e => {
                              const cur = tempEdits[req.id];
                              setTempEdits(prev => ({ ...prev, [req.id]: { start: e.target.value, end: cur?.end ?? (req.newEndTime && req.newEndTime !== '(중)' ? req.newEndTime : '18:00') } }));
                            }}
                            style={timeInput}
                          />
                          <span style={{ color: '#888' }}>~</span>
                          <input
                            type="time"
                            value={(tempEdits[req.id]?.end ?? req.newEndTime ?? '').replace('(중)', '') || '18:00'}
                            onChange={e => {
                              const cur = tempEdits[req.id];
                              setTempEdits(prev => ({ ...prev, [req.id]: { start: cur?.start ?? req.newStartTime ?? '09:00', end: e.target.value } }));
                            }}
                            style={timeInput}
                          />
                        </div>
                      )}
                      {req.type === 'SUB_NOTI' ? (
                        <div style={subWaitingText}>동료 수락/거절 대기 중</div>
                      ) : (
                        <div style={cardActions}>
                          <button type="button" onClick={() => handleProcessRequest(req, false)} style={rejectBtn}>거절</button>
                          <button type="button" onClick={() => handleProcessRequest(req, true)} style={approveBtn}>승인</button>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : requestArchive.length === 0 ? (
                <p style={emptyText}>보관된 요청이 없습니다.</p>
              ) : (
                requestArchive.map((archived, idx) => (
                  <div key={archived.processedAt + '-' + (archived.id ?? idx)} style={card}>
                    <div style={cardTitle}>{getReqLabel(archived)}</div>
                    {archived.requestDate && (
                      <div style={cardMeta}>요청 일시: {formatKoreanDateTime(archived.requestDate)}</div>
                    )}
                    <div style={cardReason}>{getReqDetail(archived) || archived.reason}</div>
                    {archived.type === 'EXPENSE' && (
                      <div style={expenseMetaRow}>
                        <span style={expenseReasonText}>{archived.reason || '청구 사유 없음'}</span>
                        <button type="button" onClick={() => handleOpenReceipt(archived.receiptImage)} style={receiptBtn}>열어보기</button>
                      </div>
                    )}
                    <div style={archiveFooter}>
                      <span style={{ fontSize: '11px', color: archived.archiveStatus === 'approved' ? '#30d158' : archived.archiveStatus === 'rejected' ? '#ff453a' : '#888' }}>
                        {archived.archiveStatus === 'approved' ? '승인됨' : archived.archiveStatus === 'rejected' ? '거절됨' : '취소됨'}
                        {archived.processedAt && ` · ${new Date(archived.processedAt).toLocaleString('ko-KR')}`}
                      </span>
                      <button type="button" onClick={() => handleRestoreRequest(archived)} style={restoreBtn}>복원하기</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const bellBtn: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  width: '44px',
  height: '44px',
  fontSize: '20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
const badge: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 4,
  minWidth: '18px',
  height: '18px',
  borderRadius: '9px',
  background: '#ff3b30',
  color: '#fff',
  fontSize: '10px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 4px'
};
const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 999 };

const panelBase: React.CSSProperties = {
  background: '#1c1c1e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};
const panel: React.CSSProperties = {
  ...panelBase,
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 8,
  width: '360px',
  maxHeight: '70vh',
};
const panelMobile: React.CSSProperties = {
  ...panelBase,
  position: 'fixed',
  top: 64,
  left: 0,
  right: 0,
  margin: '0 10px',
  width: 'auto',
  maxWidth: '100%',
  maxHeight: '80vh',
};
const panelHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.08)'
};
const panelTitle: React.CSSProperties = { fontSize: '15px', fontWeight: '700', color: '#fff' };
const headerActions: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px' };
const clearAllBtn: React.CSSProperties = { background: 'none', border: '1px solid #666', color: '#888', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer', padding: 0, lineHeight: 1 };
const tabRow: React.CSSProperties = { display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' };
const tabInactive: React.CSSProperties = { flex: 1, padding: '8px', border: 'none', background: 'transparent', color: '#888', fontSize: '12px', cursor: 'pointer', borderRadius: '8px' };
const tabActive: React.CSSProperties = { ...tabInactive, background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '600' };
const panelBody: React.CSSProperties = { overflowY: 'auto', padding: '12px' };
const emptyText: React.CSSProperties = { textAlign: 'center', color: '#888', fontSize: '13px', padding: '24px' };
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: '12px',
  padding: '12px 14px',
  marginBottom: '10px',
  border: '1px solid rgba(255,255,255,0.06)'
};
const cardTitle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '700',
  color: '#f9fafb',
  marginBottom: '6px'
};
const cardMeta: React.CSSProperties = { fontSize: '11px', color: '#666', marginBottom: '4px' };
const cardReason: React.CSSProperties = {
  fontSize: '12px',
  color: '#e5e7eb',
  marginBottom: '10px',
  lineHeight: 1.5
};
const expenseMetaRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' };
const expenseReasonText: React.CSSProperties = { fontSize: '12px', color: '#a1a1aa', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const receiptBtn: React.CSSProperties = { background: 'rgba(10,132,255,0.16)', border: '1px solid #0a84ff', color: '#9cc9ff', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 };
const subWaitingText: React.CSSProperties = { fontSize: '12px', color: '#888', marginTop: '8px', fontStyle: 'italic' };
const archiveFooter: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' };
const restoreBtn: React.CSSProperties = { background: 'rgba(0,122,255,0.2)', border: '1px solid #007aff', color: '#007aff', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' };
const timeRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' };
const timeInput: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '6px 8px', borderRadius: '8px', fontSize: '13px' };
const cardActions: React.CSSProperties = { display: 'flex', gap: '8px', justifyContent: 'flex-end' };
const rejectBtn: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
const approveBtn: React.CSSProperties = { background: '#30d158', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };