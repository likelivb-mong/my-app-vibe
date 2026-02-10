import React, { useState } from 'react';

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

  const getReqLabel = (r: any) => {
    if (r.type === 'PROFILE') return `프로필 수정 요청 · ${r.reqName}`;
    if (r.type === 'LOG') return `근무 시간 수정 요청 · ${r.reqName} (${r.targetDate})`;
    if (r.type === 'EXPENSE') return `지원금 청구 요청 · ${r.reqName}`;
    if (r.type === 'UNSCHEDULED_WORK') return `스케줄 외 근무 신청이 요청되었습니다. · ${r.reqName} (${r.targetDate || r.requestDate})`;
    if (r.type === 'SUB_NOTI' || r.type === 'SUB_REQUEST') return `대타 요청 대기중, ${r.fromName || '?'} 가 ${r.toName || '?'} 에게`;
    return '요청';
  };

  const getReqDetail = (r: any) => {
    if (r.type === 'UNSCHEDULED_WORK') return `스케줄 외 근무 신청이 요청되었습니다. · 요청 시간: ${r.startTime || '-'}`;
    if (r.type === 'LOG') return `수정 희망: ${r.newStartTime || '-'} ~ ${r.newEndTime || '(중)'}`;
    if (r.type === 'SUB_NOTI' || r.type === 'SUB_REQUEST') return `대상일: ${r.targetDate || '-'} · ${r.targetStartTime || ''} ~ ${r.targetEndTime || ''}`;
    return r.reason || '';
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
          <div style={panel}>
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
                      {req.requestDate && <div style={cardMeta}>요청 일시: {req.requestDate}</div>}
                      <div style={cardReason}>{getReqDetail(req) || req.reason}</div>
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
                    {archived.requestDate && <div style={cardMeta}>요청 일시: {archived.requestDate}</div>}
                    <div style={cardReason}>{getReqDetail(archived) || archived.reason}</div>
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
const panel: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 8,
  width: '360px',
  maxHeight: '70vh',
  background: '#1c1c1e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
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
const cardTitle: React.CSSProperties = { fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' };
const cardMeta: React.CSSProperties = { fontSize: '11px', color: '#666', marginBottom: '4px' };
const cardReason: React.CSSProperties = { fontSize: '12px', color: '#888', marginBottom: '10px' };
const subWaitingText: React.CSSProperties = { fontSize: '12px', color: '#888', marginTop: '8px', fontStyle: 'italic' };
const archiveFooter: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' };
const restoreBtn: React.CSSProperties = { background: 'rgba(0,122,255,0.2)', border: '1px solid #007aff', color: '#007aff', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' };
const timeRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' };
const timeInput: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '6px 8px', borderRadius: '8px', fontSize: '13px' };
const cardActions: React.CSSProperties = { display: 'flex', gap: '8px', justifyContent: 'flex-end' };
const rejectBtn: React.CSSProperties = { background: '#333', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
const approveBtn: React.CSSProperties = { background: '#30d158', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' };
