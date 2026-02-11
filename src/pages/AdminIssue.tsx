import React, { useState } from 'react';
import { BRANCHES } from '../utils/branches';
import { makeInvitePin4 } from '../utils/pin';
import type { CrewInvite } from '../types';
import AppSelect from '../components/common/AppSelect';

export default function AdminIssue() {
  // ... (보내주신 코드 내용 그대로)
  const [name, setName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [branchCode, setBranchCode] = useState(BRANCHES[0].code);
  const [generatedPin, setGeneratedPin] = useState('');

  const handleIssuePin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || phoneLast4.length !== 4) {
      alert('크루 이름과 전화번호 뒤 4자리를 정확히 입력해주세요.');
      return;
    }

    const newPin = makeInvitePin4();
    const issuedAt = Date.now();
    
    // 유효기간(expiresAt)을 제거한 데이터 구조
    const newInvite: CrewInvite = {
      invitePin4: newPin,
      branchCode: branchCode,
      crewName: name.trim(),
      phoneLast4: phoneLast4,
      status: "issued",
      issuedAt: issuedAt,
    };

    const STORAGE_KEY = 'xcape_invites_v1';
    const existingInvites = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existingInvites, newInvite]));

    setGeneratedPin(newPin);
    alert(`[${name}] 크루의 승인 PIN(${newPin})이 발급되었습니다.\n해당 크루가 가입하기 전까지 영구 유지됩니다.`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '400px', margin: '0 auto', color: '#fff', background: '#111', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>관리자 승인 PIN 발급</h1>
      <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>발급된 PIN은 퇴사 처리 전까지 유효합니다.</p>

      <form onSubmit={handleIssuePin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>크루 이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 입력"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>전화번호 뒤 4자리</label>
          <input
            type="text"
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="예: 1234"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>배정 지점</label>
          <AppSelect
            value={branchCode}
            onChange={setBranchCode}
            style={inputStyle}
            options={BRANCHES.map((b) => ({ value: b.code, label: b.label }))}
          />
        </div>

        <button type="submit" style={buttonStyle}>승인 PIN 발급하기</button>
      </form>

      {generatedPin && (
        <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '12px', textAlign: 'center', border: '1px solid #3b5cff' }}>
          <p style={{ margin: '0 0 8px', color: '#3b5cff', fontSize: '14px' }}>발급된 PIN 번호</p>
          <strong style={{ fontSize: '32px', letterSpacing: '6px', color: '#fff' }}>{generatedPin}</strong>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '12px' }}>크루가 가입 시 이 번호를 입력해야 합니다.</p>
        </div>
      )}

      <button
        onClick={() => window.location.hash = '#dashboard'} // dashboard -> crew-manager로 라우팅이 되어있는지 확인 필요
        style={{ marginTop: '24px', width: '100%', background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
      >
        대시보드로 돌아가기
      </button>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: '8px', opacity: 0.8, fontSize: '14px' };
const inputStyle = {
  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: '#fff', boxSizing: 'border-box' as const
};
const buttonStyle = {
  padding: '14px', backgroundColor: '#3b5cff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '16px'
};