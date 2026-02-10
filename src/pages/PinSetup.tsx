import { useEffect, useMemo, useState, useRef } from "react";
import { BRANCHES } from "../utils/branches";

// 주요 은행 목록
const BANK_LIST = [
  "카카오뱅크", "토스뱅크", "KB국민은행", "신한은행", "우리은행", 
  "하나은행", "NH농협은행", "IBK기업은행", "SC제일은행", "K뱅크", 
  "우체국", "수협", "신협", "새마을금고", "부산은행", "대구은행", 
  "광주은행", "전북은행", "제주은행", "씨티은행"
];

const EMAIL_DOMAINS = [
  "gmail.com",
  "naver.com",
  "kakao.com",
  "daum.net",
  "직접 입력"
];

// ✅ [수정] CrewManager와 동일한 시간대 옵션 적용
const SHIFT_OPTIONS = [
  "평일 오픈", "평일 미들", "평일 마감",
  "주말 오픈", "주말 미들", "주말 마감"
];

type CrewPinStatus = "active" | "terminated";

type CrewPinRecord = {
  pin: string;
  branchCode: string;
  name: string;
  phone: string;
  email: string;
  rrn: string;
  workShifts: string[]; // 배열 형태로 저장
  workTimeSlot?: string; // 호환성을 위한 문자열 필드
  hourlyWage: number;
  hireDate: string;
  createdAt: number;
  status: CrewPinStatus;
  terminatedAt: number | null;
  bankName?: string;
  accountNumber?: string;
  idCardImage?: string;
};

function generatePin5() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function makeKey(branchCode: string, name: string) {
  return `crew_pin_${branchCode}_${name.trim()}`;
}

export default function PinSetup() {
  const [name, setName] = useState("");
  const [branchCode, setBranchCode] = useState(BRANCHES[0]?.code ?? "GDXC");
  const [phone, setPhone] = useState("");
  const [rrn, setRrn] = useState(""); 
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState("gmail.com");
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [hireDate, setHireDate] = useState("");
  const [pin, setPin] = useState("");
  
  // 담당 시간대
  const [workShifts, setWorkShifts] = useState<string[]>([]);
  
  // 추가 정보
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [idCardImage, setIdCardImage] = useState<string>("");

  // UI State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPin, setCreatedPin] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setHireDate(today);
  }, []);

  const ready = useMemo(
    () => name.trim().length > 0 && branchCode.trim().length > 0,
    [name, branchCode]
  );

  useEffect(() => {
    if (!ready) {
      setPin("");
      return;
    }
    setPin((prev) => (prev ? prev : generatePin5()));
  }, [ready]);

  const handleNumberInput = (setter: (val: string) => void, val: string, maxLength?: number) => {
    let onlyNums = val.replace(/[^0-9]/g, "");
    if (maxLength && onlyNums.length > maxLength) {
        onlyNums = onlyNums.slice(0, maxLength);
    }
    setter(onlyNums);
  };

  const handleEmailInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
    setEmailLocal(val);
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "직접 입력") {
      setIsCustomDomain(true);
      setEmailDomain("");
    } else {
      setIsCustomDomain(false);
      setEmailDomain(val);
    }
  };

  // ✅ [수정] 버튼 클릭 시 토글 (순서 정렬 포함)
  const toggleShift = (shift: string) => {
    setWorkShifts(prev => {
        let newShifts;
        if (prev.includes(shift)) {
            newShifts = prev.filter(s => s !== shift);
        } else {
            newShifts = [...prev, shift];
        }
        // 화면에 보여질 때 순서가 뒤죽박죽되지 않도록 고정된 순서로 정렬
        return newShifts.sort((a, b) => SHIFT_OPTIONS.indexOf(a) - SHIFT_OPTIONS.indexOf(b));
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = useMemo(() => {
    const currentDomain = isCustomDomain ? emailDomain : emailDomain;
    return (
      name.trim().length > 0 &&
      branchCode.length > 0 &&
      phone.length > 0 &&
      rrn.length === 13 &&
      emailLocal.trim().length > 0 &&
      currentDomain.trim().length > 0 &&
      workShifts.length > 0 &&
      hireDate.length > 0 &&
      bankName.length > 0 &&
      accountNumber.length > 0 &&
      idCardImage.length > 0
    );
  }, [name, branchCode, phone, rrn, emailLocal, emailDomain, isCustomDomain, workShifts, hireDate, bankName, accountNumber, idCardImage]);

  const onSubmit = () => {
    if (!isFormValid) return;

    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("crew_pin_")) {
          try {
            const existingRecord = JSON.parse(localStorage.getItem(key) || "{}");
            if (
              (existingRecord.rrn && existingRecord.rrn === rrn) || 
              (existingRecord.phone && existingRecord.phone === phone)
            ) {
              alert("이미 가입된 계정이 존재합니다.\n찾으시려면 관리자에게 문의해주세요!");
              return; 
            }
          } catch (e) {
            continue;
          }
        }
      }
    }

    // 기본 시급 가져오기
    let initialWage = 10030;
    try {
      const storedSettings = localStorage.getItem("manager_settings");
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings.defaultHourlyWage) {
          initialWage = Number(parsedSettings.defaultHourlyWage);
        }
      }
    } catch (err) {
      console.error("기본 시급 불러오기 실패:", err);
    }

    const finalEmail = `${emailLocal}@${emailDomain}`;
    const finalPin = pin || generatePin5();

    const record: CrewPinRecord = {
      pin: finalPin,
      branchCode,
      name: name.trim(),
      phone,
      email: finalEmail,
      rrn,
      workShifts, 
      // ✅ [중요] CrewManager 호환성을 위해 문자열 포맷도 같이 저장
      workTimeSlot: workShifts.join(', '), 
      hourlyWage: initialWage,
      hireDate,
      createdAt: Date.now(),
      status: "active",
      terminatedAt: null,
      bankName,
      accountNumber,
      idCardImage
    };

    const key = makeKey(branchCode, name);
    localStorage.setItem(key, JSON.stringify(record));

    setCreatedPin(finalPin);
    setShowSuccessModal(true);
  };

  const handleConfirmAndRedirect = () => {
    window.location.hash = "login";
  };

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#111", color: "#fff" }}>
      <h1 style={{ fontSize: 28, marginBottom: 18 }}>크루 등록 신청</h1>

      <div style={{ maxWidth: 520 }}>
        <label style={labelStyle}>이름</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" style={inputStyle} />
        <div style={{ height: 14 }} />

        <label style={labelStyle}>주민등록번호 (숫자 13자리)</label>
        <input type="tel" value={rrn} onChange={(e) => handleNumberInput(setRrn, e.target.value, 13)} placeholder="예: 9901011234567 (- 제외)" style={inputStyle} maxLength={13} />
        <div style={{ height: 14 }} />

        <label style={labelStyle}>근무 지점</label>
        <select value={branchCode} onChange={(e) => setBranchCode(e.target.value)} style={inputStyle}>
          {BRANCHES.map((b) => (<option key={b.code} value={b.code}>{b.label} ({b.code})</option>))}
        </select>
        <div style={{ height: 14 }} />

        {/* ✅ [수정] 3열 그리드 버튼 방식 (CrewManager와 동일 디자인) */}
        <label style={labelStyle}>담당 시간대 (중복 선택 가능)</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {SHIFT_OPTIONS.map((option) => {
                const isSelected = workShifts.includes(option);
                return (
                    <button
                        key={option}
                        onClick={() => toggleShift(option)}
                        style={{
                            padding: '12px 0',
                            borderRadius: '8px',
                            border: '1px solid',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            // 선택됨: 파란색 / 선택안됨: 어두운 회색
                            background: isSelected ? '#2563eb' : '#1a1a1a',
                            borderColor: isSelected ? '#2563eb' : '#444',
                            color: isSelected ? '#fff' : '#888',
                            fontWeight: isSelected ? 'bold' : 'normal'
                        }}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
        <div style={{ height: 14 }} />

        <label style={labelStyle}>전화번호 (숫자만 입력)</label>
        <input type="tel" value={phone} onChange={(e) => handleNumberInput(setPhone, e.target.value)} placeholder="예: 01012345678" style={inputStyle} />
        <div style={{ height: 14 }} />

        <label style={labelStyle}>이메일</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input value={emailLocal} onChange={handleEmailInput} placeholder="영문/숫자 아이디" style={{ ...inputStyle, flex: 1 }} />
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#888' }}>@</span>
            {isCustomDomain ? <input value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} placeholder="도메인 입력" style={{ ...inputStyle, flex: 1 }} /> : <input value={emailDomain} readOnly style={{ ...inputStyle, flex: 1, background: '#222', color: '#aaa' }} />}
            <select onChange={handleDomainChange} value={isCustomDomain ? "직접 입력" : emailDomain} style={{ ...inputStyle, flex: 1 }}>{EMAIL_DOMAINS.map(domain => (<option key={domain} value={domain}>{domain}</option>))}</select>
        </div>
        <div style={{ height: 14 }} />

        <label style={labelStyle}>입사일자</label>
        <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} style={inputStyle} />
        <div style={{ height: 14 }} />

        <label style={labelStyle}>급여 입금 계좌</label>
        <div style={{ display: 'flex', gap: '8px' }}>
            <select value={bankName} onChange={e => setBankName(e.target.value)} style={{...inputStyle, flex: 1}}><option value="" disabled>은행 선택</option>{BANK_LIST.map(bank => (<option key={bank} value={bank}>{bank}</option>))}</select>
            <input type="tel" placeholder="계좌번호 (숫자만)" value={accountNumber} onChange={e => handleNumberInput(setAccountNumber, e.target.value)} style={{...inputStyle, flex: 2}} />
        </div>
        <div style={{ height: 14 }} />

        <label style={labelStyle}>주민등록증 사본 (또는 신분증)</label>
        <div style={{ border: '1px dashed #444', borderRadius: '8px', padding: '16px', textAlign: 'center', background: '#1a1a1a', cursor: 'pointer', position: 'relative' }} onClick={() => fileInputRef.current?.click()}>
            {idCardImage ? (<div><img src={idCardImage} alt="ID Preview" style={{ maxHeight: '150px', maxWidth: '100%', borderRadius: '4px' }} /><div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>이미지 변경하려면 클릭</div></div>) : (<div style={{ color: '#888', fontSize: '14px', padding: '20px 0' }}>📷 여기를 눌러 사진을 등록하세요</div>)}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
        </div>

        <div style={{ height: 32 }} />

        <button onClick={onSubmit} disabled={!isFormValid} style={{...submitBtn, background: isFormValid ? "#3b5cff" : "#333", color: isFormValid ? "#fff" : "#666", cursor: isFormValid ? "pointer" : "not-allowed", boxShadow: isFormValid ? "0 4px 12px rgba(59, 92, 255, 0.3)" : "none"}}>
          {isFormValid ? "제출하기" : "모든 항목을 입력해주세요"}
        </button>
      </div>

      {showSuccessModal && (
        <div style={modalOverlay}>
            <div style={modalContent}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎉</div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>제출 완료! {name} 크루 합류</h2>
                <div style={{ background: '#333', padding: '15px', borderRadius: '10px', margin: '20px 0', border: '1px dashed #555' }}>
                    <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>발급된 PIN (로그인시 필요)</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#facc15', letterSpacing: '4px' }}>{createdPin}</div>
                </div>
                <p style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.6', marginBottom: '24px' }}>함께 일하게 되어 반가워요!<br/>위 PIN은 꼭 기억해 주세요 👀 캡처 필수!</p>
                <button onClick={handleConfirmAndRedirect} style={primaryBtn}>확인</button>
            </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, opacity: 0.8, fontSize: "14px", fontWeight: "bold", color: "#ccc" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", fontSize: 16, borderRadius: 8, border: "1px solid #444", background: "#1a1a1a", color: "#fff", boxSizing: "border-box" };
const submitBtn: React.CSSProperties = { width: "100%", padding: "16px", fontSize: 18, fontWeight: "bold", borderRadius: 12, border: "none", marginTop: "10px", transition: "all 0.2s ease" };
const primaryBtn: React.CSSProperties = { width: "100%", padding: "12px 14px", fontSize: 16, borderRadius: 10, border: "none", background: "#3b5cff", color: "#fff", cursor: "pointer" };
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent: React.CSSProperties = { background: '#1a1a1a', padding: '32px', borderRadius: '24px', maxWidth: '320px', width: '90%', textAlign: 'center', border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' };