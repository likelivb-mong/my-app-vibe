import React from 'react';

// ----------------------------------------------------------------------
// [공통 모달 레이아웃]
// ----------------------------------------------------------------------
export const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
export const modal: React.CSSProperties = { background: '#FFFFFF', width: '90%', maxWidth: '400px', borderRadius: '24px', padding: '24px', maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
export const modalHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #F2F2F7', paddingBottom: '15px' };
export const closeBtn: React.CSSProperties = { background: 'none', border: 'none', fontSize: '24px', color: '#C7C7CC', cursor: 'pointer' };

// ----------------------------------------------------------------------
// [Apple 스타일 모달 (스케줄 등)]
// ----------------------------------------------------------------------
export const appleModal: React.CSSProperties = { background: '#FFFFFF', width: '90%', maxWidth: '800px', borderRadius: '24px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
export const appleModalHeader: React.CSSProperties = { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E5EA', background: '#fff' };

// ----------------------------------------------------------------------
// [급여 명세서 전용 스타일]
// ----------------------------------------------------------------------
export const closeBtnIcon: React.CSSProperties = { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#007AFF' };

// ----------------------------------------------------------------------
// [입력 폼 공통]
// ----------------------------------------------------------------------
export const formGroup: React.CSSProperties = { marginBottom: '15px' };
export const formLabel: React.CSSProperties = { fontSize: '11px', fontWeight: '600', color: '#8E8E93', marginBottom: '4px', display: 'block' };
export const formInput: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E5EA', marginBottom: '10px', boxSizing: 'border-box', fontSize: '13px' };
export const inputDisabled: React.CSSProperties = { width: '100%', padding: '12px', background: '#F2F2F7', border: 'none', borderRadius: '10px', color: '#8E8E93', boxSizing: 'border-box' };
export const textArea: React.CSSProperties = { width: '100%', padding: '12px', background: '#fff', border: '1px solid #E5E5EA', borderRadius: '10px', height: '80px', boxSizing: 'border-box', resize:'none' };
export const blackInput: React.CSSProperties = { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E5EA', background: '#fff', color: '#000', colorScheme: 'light', boxSizing: 'border-box' };

// ----------------------------------------------------------------------
// [버튼 스타일]
// ----------------------------------------------------------------------
export const submitBtn: React.CSSProperties = { width: '100%', padding: '15px', background: '#1C1C1E', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '15px', cursor: 'pointer', marginTop: '10px' };
export const approveBtn: React.CSSProperties = { flex: 1, background: '#007AFF', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight:'bold' };
export const rejectBtn: React.CSSProperties = { flex: 1, background: '#F2F2F7', color: '#8E8E93', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight:'bold' };

// ----------------------------------------------------------------------
// [통계 및 상세 박스 (내 정보 등)]
// ----------------------------------------------------------------------
export const statBox: React.CSSProperties = { background:'#F2F2F7', borderRadius:'12px', padding:'15px', textAlign:'center', border:'1px solid #E5E5EA' };
export const statLabel: React.CSSProperties = { fontSize:'12px', color:'#8E8E93', marginBottom:'5px' };
export const statValue: React.CSSProperties = { fontSize:'18px', fontWeight:'bold', color:'#1C1C1E' };
export const payDetailBox: React.CSSProperties = { background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #E5E5EA', marginBottom: '15px', fontSize: '12px', color: '#1C1C1E' };
export const helperText: React.CSSProperties = { fontSize: '12px', color: '#007AFF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px', background: '#F0F9FF', padding: '8px', borderRadius: '8px' };