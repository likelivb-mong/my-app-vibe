import { useState, useEffect } from "react";

// ✅ 관리자 마스터 계정 목록
const MASTER_ADMINS = [
  { phone: "01097243921", pin: "XC107" },
  { phone: "01086369266", pin: "XC107" },
  { phone: "1234", pin: "1234" },
];

// 로컬 스토리지에서 크루 정보 찾기 (일반 크루용)
function findCrew(phone: string, pin: string) {
  if (typeof localStorage === "undefined") return null;

  // 🧪 [추가] 테스트용 크루 계정 설정 (0101234 / 1234)
  if (phone === "0101234" && pin === "1234") {
    return { 
      name: "테스트 크루", 
      phone: "0101234", 
      pin: "1234", 
      status: 'active',
      branch: '테스트 지점' 
    };
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("crew_pin_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        if (data.phone === phone && data.pin === pin && data.status === 'active') {
          return data; 
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

export default function CrewLogin() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isAutoLogin, setIsAutoLogin] = useState(false);
  const [error, setError] = useState("");

  // PIN 찾기 관련 상태
  const [showRecovery, setShowRecovery] = useState(false);
  const [recName, setRecName] = useState("");
  const [recRrn, setRecRrn] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recEmail, setRecEmail] = useState("");
  const [recAccount, setRecAccount] = useState("");
  const [recResult, setRecResult] = useState("");

  // ✅ 앱 시작 시 자동 로그인 체크
  useEffect(() => {
    const savedAutoLogin = localStorage.getItem("auto_login_user");
    if (savedAutoLogin) {
      const { phone: savedPhone, pin: savedPin } = JSON.parse(savedAutoLogin);
      
      // 1. 관리자 체크
      const isAdmin = MASTER_ADMINS.find(a => a.phone === savedPhone && a.pin === savedPin);
      if (isAdmin) {
        sessionStorage.setItem("current_user", JSON.stringify({ name: "총괄 관리자", isAdmin: true }));
        window.location.hash = "main-dashboard";
        return;
      }

      // 2. 크루 체크
      const crew = findCrew(savedPhone, savedPin);
      if (crew) {
        sessionStorage.setItem("current_user", JSON.stringify(crew));
        window.location.hash = "crew-home";
      }
    }
  }, []);

  const handleLogin = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const inputPin = pin.trim();

    // 🚨 1. 관리자 마스터 계정 확인
    const isAdmin = MASTER_ADMINS.find(a => a.phone === cleanPhone && a.pin === inputPin);

    if (isAdmin) {
      sessionStorage.setItem("current_user", JSON.stringify({ name: "총괄 관리자", isAdmin: true }));
      
      if (isAutoLogin) {
        localStorage.setItem("auto_login_user", JSON.stringify({ phone: cleanPhone, pin: inputPin }));
      } else {
        localStorage.removeItem("auto_login_user");
      }

      // 안내창 없이 바로 이동
      window.location.hash = "main-dashboard"; 
      return;
    }

    // 👤 2. 일반 크루 확인 (테스트 계정 포함)
    const crew = findCrew(cleanPhone, inputPin);

    if (crew) {
      sessionStorage.setItem("current_user", JSON.stringify(crew));
      
      if (isAutoLogin) {
        localStorage.setItem("auto_login_user", JSON.stringify({ phone: cleanPhone, pin: inputPin }));
      } else {
        localStorage.removeItem("auto_login_user");
      }

      window.location.hash = "crew-home"; 
    } else {
      setError("정보가 일치하지 않습니다. 다시 확인해주세요.");
    }
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setPhone(val);
    if(error) setError("");
  };

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value.toUpperCase());
    if(error) setError("");
  };

  // 🔑 PIN 번호 찾기 로직
  const handleFindPin = () => {
    let foundPin = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("crew_pin_")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (
              data.name === recName.trim() &&
              data.rrn === recRrn.trim() &&
              data.phone === recPhone.trim() &&
              data.email === recEmail.trim() &&
              data.accountNumber === recAccount.trim()
          ) {
              foundPin = data.pin;
              break;
          }
        } catch(e) { continue; }
      }
    }

    if (foundPin) {
        setRecResult(`회원님의 PIN 번호는 [ ${foundPin} ] 입니다.`);
    } else {
        alert("일치하는 정보를 찾을 수 없습니다.\n입력하신 내용을 다시 확인해주세요.");
    }
  };

  return (
    <div style={container}>
      <div style={loginCard}>
        {/* 헤더 영역 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={logoTitle}>CREW LOGIN</h1>
            <p style={subTitle}>등록된 정보를 입력하여 접속하세요.</p>
        </div>

        {/* 입력 폼 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <label style={labelStyle}>전화번호</label>
                <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneInput}
                    placeholder="01012345678"
                    style={inputStyle}
                />
            </div>

            <div>
                <label style={labelStyle}>PIN 코드</label>
                <input
                    type="text" 
                    value={pin}
                    onChange={handlePinInput}
                    placeholder="P I N  입력"
                    maxLength={5}
                    style={{...inputStyle, letterSpacing: '2px', fontWeight: 'bold'}}
                />
            </div>
        </div>

        {/* 자동 로그인 체크박스 */}
        <div style={checkboxWrapper} onClick={() => setIsAutoLogin(!isAutoLogin)}>
            <div style={{
                ...checkboxBase,
                background: isAutoLogin ? '#3b82f6' : 'transparent',
                borderColor: isAutoLogin ? '#3b82f6' : '#555'
            }}>
                {isAutoLogin && <span style={{fontSize:'10px', color:'#fff'}}>✔</span>}
            </div>
            <span style={{ fontSize: '13px', color: '#ccc', userSelect: 'none' }}>자동 로그인</span>
        </div>

        {/* 에러 메시지 */}
        <div style={{height: '20px', marginBottom: '10px', textAlign: 'center'}}>
            {error && <span style={errorMessage}>⚠️ {error}</span>}
        </div>

        {/* 로그인 버튼 */}
        <button onClick={handleLogin} style={loginBtn}>
          로그인
        </button>

        <div style={divider}></div>

        {/* 하단 링크 영역 */}
        <div style={footerLinks}>
            <button onClick={() => window.location.hash = "pin-setup"} style={linkBtn}>
                크루 등록 신청
            </button>
            <span style={{color: '#444'}}>|</span>
            <button onClick={() => { setShowRecovery(true); setRecResult(""); }} style={linkBtn}>
                PIN코드를 잃어버렸나요?
            </button>
        </div>
        
        <div style={{marginTop:'30px', textAlign:'center', fontSize:'11px', color:'#444'}}>
            로그인에 문제가 있나요? 관리자에게 문의하세요.
        </div>
      </div>

      {/* PIN 찾기 모달 */}
      {showRecovery && (
        <div style={modalOverlay}>
            <div style={modalContent}>
                <div style={modalHeader}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin:0, color:'#fff' }}>PIN 번호 찾기</h2>
                    <button onClick={() => setShowRecovery(false)} style={closeBtn}>×</button>
                </div>

                {recResult ? (
                    <div style={{textAlign:'center', padding:'30px 0'}}>
                        <div style={{fontSize:'16px', color:'#4ade80', fontWeight:'bold', marginBottom:'20px'}}>{recResult}</div>
                        <button onClick={() => { setShowRecovery(false); setPin(""); }} style={loginBtn}>로그인하러 가기</button>
                    </div>
                ) : (
                    <div style={{display:'flex', flexDirection:'column', gap:'14px'}}>
                        <p style={{fontSize:'13px', color:'#aaa', margin:0, marginBottom:'5px'}}>가입 시 등록한 정보를 정확히 입력해주세요.</p>
                        <input placeholder="이름" value={recName} onChange={e=>setRecName(e.target.value)} style={modalInput} />
                        <input placeholder="주민등록번호 (숫자만)" value={recRrn} onChange={e=>setRecRrn(e.target.value)} style={modalInput} maxLength={13}/>
                        <input placeholder="전화번호 (숫자만)" value={recPhone} onChange={e=>setRecPhone(e.target.value)} style={modalInput} />
                        <input placeholder="이메일 주소" value={recEmail} onChange={e=>setRecEmail(e.target.value)} style={modalInput} />
                        <input placeholder="급여 입금계좌 (숫자만)" value={recAccount} onChange={e=>setRecAccount(e.target.value)} style={modalInput} />
                        
                        <button onClick={handleFindPin} style={{...loginBtn, marginTop:'15px', background:'#444', color:'#fff'}}>
                            내 PIN 찾기
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Styles (기존과 동일)
// ============================================================================

const container: React.CSSProperties = {
  minHeight: "100vh", background: "#0f0f0f", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
};

const loginCard: React.CSSProperties = {
  width: "100%", maxWidth: "380px", background: "#1a1a1a", borderRadius: "24px", padding: "40px 30px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1px solid #333", display: 'flex', flexDirection: 'column'
};

const logoTitle: React.CSSProperties = {
  fontSize: "28px", fontWeight: "800", color: "#fff", margin: "0 0 8px 0", letterSpacing: "-0.5px"
};

const subTitle: React.CSSProperties = {
  fontSize: "14px", color: "#666", margin: 0
};

const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: "8px", color: "#888", fontSize: "12px", fontWeight: "600"
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid #333", background: "#222", color: "#fff", fontSize: "16px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s"
};

const checkboxWrapper: React.CSSProperties = {
    display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '15px', marginBottom: '10px'
};

const checkboxBase: React.CSSProperties = {
    width: '18px', height: '18px', borderRadius: '6px', border: '1px solid #555', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
};

const loginBtn: React.CSSProperties = {
  width: "100%", padding: "16px", borderRadius: "12px", border: "none", background: "#2563eb", color: "#fff", fontSize: "15px", fontWeight: "700", cursor: "pointer", transition: "background 0.2s"
};

const errorMessage: React.CSSProperties = {
    color: "#ef4444", fontSize: "13px", fontWeight: "500"
};

const divider: React.CSSProperties = {
    height: '1px', background: '#333', margin: '25px 0'
};

const footerLinks: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px'
};

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#888", fontSize: "13px", cursor: "pointer", transition: "color 0.2s"
};

const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
};

const modalContent: React.CSSProperties = {
    background: '#1a1a1a', padding: '30px', borderRadius: '24px', maxWidth: '340px', width: '90%', border: '1px solid #333', boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
};

const modalHeader: React.CSSProperties = {
    display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', paddingBottom:'15px', borderBottom:'1px solid #333'
};

const closeBtn: React.CSSProperties = {
    background:'none', border:'none', color:'#666', fontSize:'24px', cursor:'pointer'
};

const modalInput: React.CSSProperties = {
    width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#222", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box"
};