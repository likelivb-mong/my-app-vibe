import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BRANCHES } from "../utils/branches";
import type { CrewInvite } from "../types";

type SortOption = "CREATED_DESC" | "HIRE_DATE_DESC" | "POSITION_DESC";

const WORK_SHIFTS = [
  "평일 오픈", "평일 미들", "평일 마감",
  "주말 오픈", "주말 미들", "주말 마감"
];

interface CombinedRecord {
  name: string;
  branchCode: string;
  phoneLast4?: string;
  status: "active" | "terminated" | "issued" | "used" | "expired";
  createdAt: number;
  pin?: string;            
  residentNumber?: string; // 주민등록번호 (PinSetup의 rrn과 매핑)
  workTimeSlot?: string;   
  workShifts?: string[];   
  phone?: string;          
  email?: string;          
  bankName?: string;       
  accountNumber?: string;  
  idCardImage?: string;    
  position?: string;
  basePay?: number;
  dutyAllowance?: number;
  incentiveAllowance?: number;
  specialAllowance?: number;
  totalHourly?: number;
  hireDate?: string;
  contractDone?: boolean; 
  isInvite?: boolean;
  invitePin4?: string;
}

export default function CrewManager() {
  const [records, setRecords] = useState<CombinedRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [filterName, setFilterName] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("HIRE_DATE_DESC");

  const [detail, setDetail] = useState<CombinedRecord | null>(null);
  const [isIdVisible, setIsIdVisible] = useState(false);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [bulkPay, setBulkPay] = useState({ 
    basePay: 0, dutyAllowance: 0, incentiveAllowance: 0, specialAllowance: 0 
  });

  const loadData = () => {
    if (typeof localStorage === "undefined") return;

    const allKeys = Object.keys(localStorage);
    const crewKeys = allKeys.filter(key => key.startsWith('crew_pin_'));
    
    const crewData: CombinedRecord[] = crewKeys.map(key => {
        const saved = JSON.parse(localStorage.getItem(key) || '{}');

        // ✅ [핵심 수정 1] PinSetup의 rrn을 residentNumber로 매핑
        if (saved.rrn && !saved.residentNumber) {
            saved.residentNumber = saved.rrn;
        }

        // 시간대 배열 -> 문자열 변환 (호환성)
        if (Array.isArray(saved.workShifts) && (!saved.workTimeSlot || saved.workTimeSlot === "")) {
            saved.workTimeSlot = saved.workShifts.join(', ');
        }
        
        return saved;
    });

    const rawInvites = localStorage.getItem('xcape_invites_v1');
    const invites: CrewInvite[] = rawInvites ? JSON.parse(rawInvites) : [];
    
    const inviteData: CombinedRecord[] = invites.map(inv => ({
      name: inv.crewName,
      branchCode: inv.branchCode,
      phoneLast4: inv.phoneLast4,
      status: inv.status,
      createdAt: inv.issuedAt,
      isInvite: true,
      invitePin4: inv.invitePin4,
      position: inv.status === 'issued' ? '가입 대기' : '초대 완료'
    }));

    const activeInvites = inviteData.filter(inv => inv.status === 'issued' || inv.status === 'expired');
    setRecords([...crewData, ...activeInvites]);
    
    const savedDefaults = JSON.parse(localStorage.getItem('company_default_pay') || '{}');
    if (savedDefaults.basePay !== undefined) setBulkPay(savedDefaults);
  };

  useEffect(() => { loadData(); }, []);

  const saveBulkSettings = () => {
    if (!confirm("모든 크루(가입자)에게 시급 설정을 적용하시겠습니까?")) return;
    records.forEach(r => {
      if (r.isInvite || r.status === 'terminated' || r.status === 'expired') return;
      const total = Number(bulkPay.basePay) + Number(bulkPay.dutyAllowance) + 
                    Number(bulkPay.incentiveAllowance) + Number(bulkPay.specialAllowance);
      const updatedCrew = { 
        ...r, 
        ...bulkPay, 
        totalHourly: total,
        position: Number(bulkPay.dutyAllowance) > 0 ? "크루장" : "크루"
      };
      localStorage.setItem(`crew_pin_${r.branchCode}_${r.name}`, JSON.stringify(updatedCrew));
    });
    localStorage.setItem('company_default_pay', JSON.stringify(bulkPay));
    alert("설정이 저장되었습니다.");
    setIsSettingOpen(false);
    loadData();
  };

  const openDetail = (item: CombinedRecord) => {
    let initialData = { ...item };
    
    // ✅ 팝업 열 때도 rrn 매핑 확인
    if ((initialData as any).rrn && !initialData.residentNumber) {
        initialData.residentNumber = (initialData as any).rrn;
    }

    if (!item.isInvite && !initialData.basePay && bulkPay.basePay > 0) {
        initialData = {
            ...initialData,
            ...bulkPay,
            totalHourly: Number(bulkPay.basePay) + Number(bulkPay.dutyAllowance) + Number(bulkPay.incentiveAllowance) + Number(bulkPay.specialAllowance),
            position: Number(bulkPay.dutyAllowance) > 0 ? "크루장" : "크루"
        };
    }
    setDetail(initialData);
    setIsIdVisible(false);
  };

  const handleDetailChange = (field: string, value: any) => {
    if (detail?.isInvite) return;
    setDetail((prev: any) => {
      const updated = { ...prev, [field]: value };
      
      // residentNumber 수정 시 rrn도 같이 업데이트 (동기화)
      if (field === 'residentNumber') {
          updated.rrn = value;
      }

      if (['basePay', 'dutyAllowance', 'incentiveAllowance', 'specialAllowance'].includes(field)) {
          const base = Number(updated.basePay || 0);
          const duty = Number(updated.dutyAllowance || 0);
          const incentive = Number(updated.incentiveAllowance || 0);
          const special = Number(updated.specialAllowance || 0);
          updated.totalHourly = base + duty + incentive + special;
          updated.position = duty > 0 ? "크루장" : "크루";
      }
      return updated;
    });
  };

  const toggleShift = (shift: string) => {
    if (!detail) return;
    const currentShifts = detail.workTimeSlot ? detail.workTimeSlot.split(',').map(s => s.trim()) : [];
    
    let newShifts;
    if (currentShifts.includes(shift)) {
      newShifts = currentShifts.filter(s => s !== shift);
    } else {
      newShifts = [...currentShifts, shift];
    }
    
    newShifts.sort((a, b) => WORK_SHIFTS.indexOf(a) - WORK_SHIFTS.indexOf(b));
    handleDetailChange('workTimeSlot', newShifts.join(', '));
  };

  const saveDetail = () => {
    if (!detail || detail.isInvite) return;

    const shiftsArray = detail.workTimeSlot ? detail.workTimeSlot.split(',').map(s => s.trim()) : [];
    
    const dataToSave = {
        ...detail,
        rrn: detail.residentNumber, // 저장할 때 rrn 필드도 확실하게 업데이트
        workShifts: shiftsArray
    };

    localStorage.setItem(`crew_pin_${detail.branchCode}_${detail.name}`, JSON.stringify(dataToSave));
    alert("변경 사항이 저장 되었습니다.");
    setDetail(null);
    loadData();
  };

  const toggleStatus = () => {
    if (!detail) return;
    
    if (detail.isInvite) {
      if (detail.status === 'issued') {
        if (!confirm(`초대 PIN을 무효화 하시겠습니까?`)) return;
        const rawInvites = localStorage.getItem('xcape_invites_v1');
        if (rawInvites) {
          const list: CrewInvite[] = JSON.parse(rawInvites);
          const nextList = list.map(inv => 
            (inv.invitePin4 === detail.invitePin4 && inv.crewName === detail.name) ? { ...inv, status: 'expired' as const } : inv
          );
          localStorage.setItem('xcape_invites_v1', JSON.stringify(nextList));
          setDetail(null);
          loadData();
        }
      }
      return;
    }

    if (detail.status === 'active') {
      if (!confirm(`${detail.name}님을 퇴사 처리하시겠습니까?\n\n- 퇴사자 탭으로 이동됩니다.\n- PIN 로그인이 즉시 차단됩니다.`)) return;
      const updated = { ...detail, status: 'terminated', terminatedAt: Date.now() };
      localStorage.setItem(`crew_pin_${detail.branchCode}_${detail.name}`, JSON.stringify(updated));
      alert("퇴사 처리되었습니다.");
      setDetail(null);
      loadData();
    }
  };

  const restoreCrew = () => {
    if (!confirm(`${detail?.name}님을 복원하시겠습니까?`)) return;
    const updated = { ...detail, status: 'active', terminatedAt: null };
    localStorage.setItem(`crew_pin_${detail?.branchCode}_${detail?.name}`, JSON.stringify(updated));
    setDetail(null);
    loadData();
  };

  const deleteCrewPermanently = () => {
    if (!confirm(`데이터를 영구 삭제하시겠습니까?`)) return;
    if (detail?.isInvite) {
      const rawInvites = localStorage.getItem('xcape_invites_v1');
      if (rawInvites) {
        const list: CrewInvite[] = JSON.parse(rawInvites);
        const nextList = list.filter(inv => !(inv.invitePin4 === detail.invitePin4 && inv.crewName === detail.name));
        localStorage.setItem('xcape_invites_v1', JSON.stringify(nextList));
      }
    } else {
      localStorage.removeItem(`crew_pin_${detail?.branchCode}_${detail?.name}`);
    }
    setDetail(null);
    loadData();
  };

  const filteredCrews = useMemo(() => {
    let result = records.filter(r => {
      if (activeTab === "TERMINATED") return r.status === "terminated" || r.status === "expired";
      const matchBranch = activeTab === "ALL" || r.branchCode === activeTab;
      const matchName = filterName ? r.name.includes(filterName) : true;
      return matchBranch && matchName && (r.status === "active" || r.status === "issued");
    });
    result.sort((a, b) => {
        if (sortOption === "HIRE_DATE_DESC") {
            // ✅ [수정] 입사일(hireDate) 기준 내림차순 정렬
            const dateA = a.hireDate ? new Date(a.hireDate).getTime() : 0;
            const dateB = b.hireDate ? new Date(b.hireDate).getTime() : 0;
            // 입사일이 같거나 없으면 등록일(createdAt) 기준으로
            if (dateA === dateB) {
                return (b.createdAt || 0) - (a.createdAt || 0);
            }
            return dateB - dateA;
        } else if (sortOption === "POSITION_DESC") {
            const posA = a.position || "크루";
            const posB = b.position || "크루";
            if (posA === "크루장" && posB !== "크루장") return -1;
            return a.name.localeCompare(b.name);
        } else {
            return (b.createdAt || 0) - (a.createdAt || 0);
        }
    });
    return result;
  }, [records, activeTab, filterName, sortOption]);

  return (
    <div style={styles.pageWrapper}>
      {/* Top Navigation */}
      <div style={styles.topNav}>
        <button onClick={() => { window.location.hash = "main-dashboard"; }} style={styles.btnBack}>
          ← 실시간 현황판
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* ✅ [수정] 버튼 문구 변경: ⚙️ Setup */}
          <button onClick={() => setIsSettingOpen(true)} style={styles.btnSetting}>⚙️ Setup</button>
          <button onClick={() => window.location.hash = "#pin-setup"} style={styles.btnCreate}>
            + NEW PIN
          </button>
        </div>
      </div>

      <div style={styles.contentLayout}>
        <div style={styles.sectionCard}>
          {/* Header & Filter */}
          <div style={styles.cardHeader}>
            {/* ✅ [수정] 타이틀 변경: Crew Info */}
            <h2 style={{margin:0, fontSize:'20px', fontWeight:'700', color:'#fff', letterSpacing:'-0.5px'}}>👥 Crew Info</h2>
            <div style={{display:'flex', gap:'10px'}}>
              <input 
                placeholder="이름 검색" 
                value={filterName} 
                onChange={(e) => setFilterName(e.target.value)} 
                style={styles.searchInput} 
              />
              <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} style={styles.sortSelect}>
                  {/* ✅ [수정] 최신순 -> 입사일순 */}
                  <option value="HIRE_DATE_DESC">입사일순</option>
                  <option value="CREATED_DESC">등록순</option>
                  <option value="POSITION_DESC">직급순</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabRow}>
            {["ALL", ...BRANCHES.map(b => b.code), "TERMINATED"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  ...styles.tabItem, 
                  background: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.1)',
                  color: activeTab === tab ? '#000' : '#888',
                  fontWeight: activeTab === tab ? '700' : '500'
                }}>
                {tab === "TERMINATED" ? "퇴사/취소" : (tab === "ALL" ? "전체" : tab)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={styles.tableWrapper}>
            <div style={styles.tableHeader}>
                <div>지점</div><div>이름</div><div>전화번호</div><div>직책</div><div>상태</div><div>계약</div>
            </div>
            {filteredCrews.length === 0 ? <div style={{padding:'60px', textAlign:'center', color:'#555', fontSize:'14px'}}>데이터가 없습니다.</div> :
             filteredCrews.map((crew, i) => (
              <div key={i} style={styles.tableRow} onClick={() => openDetail(crew)}>
                <div style={{color:'#aaa'}}>{crew.branchCode}</div>
                <div>
                   <span style={{ fontWeight: '600', fontSize:'15px', color:'#fff' }}>{crew.name}</span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    {(crew.phone || crew.phoneLast4) ? (
                         <a href={`tel:${crew.phone}`} style={{ color:'#0a84ff', textDecoration:'none', fontWeight:'500' }}>
                            {crew.phone || `010-****-${crew.phoneLast4}`}
                         </a>
                    ) : (
                        <span style={{color:'#444'}}>-</span>
                    )}
                </div>
                <div>
                  <span style={{ 
                    padding:'4px 10px', borderRadius:'12px', fontSize:'11px', fontWeight:'600',
                    background: crew.isInvite ? 'rgba(234, 179, 8, 0.2)' : (crew.position === '크루장' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                    color: crew.isInvite ? '#facc15' : (crew.position === '크루장' ? '#f87171' : '#60a5fa') 
                  }}>
                    {crew.position || '크루'}
                  </span>
                </div>
                <div style={{ color: (crew.status === 'active' || crew.status === 'issued') ? '#4ade80' : '#ef4444' }}>
                  {crew.status === 'active' ? '근무중' : (crew.status === 'issued' ? `대기` : '종료')}
                </div>
                <div>
                  {crew.contractDone ? <span style={{color:'#4ade80'}}>✔ 체결</span> : <span style={{color:'#666'}}>미체결</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- [모달 1] 일괄 시급 설정 --- */}
      {isSettingOpen && (
        <div style={styles.overlay} onClick={() => setIsSettingOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 10px 0', fontSize:'22px', fontWeight:'700' }}>일괄 시급 설정</h2>
            <div style={styles.grid2}>
              <div style={styles.inputGroup}><small>기본급</small><input type="number" value={bulkPay.basePay} onChange={e => setBulkPay({...bulkPay, basePay: Number(e.target.value)})} style={styles.input} /></div>
              <div style={styles.inputGroup}><small>책임수당</small><input type="number" value={bulkPay.dutyAllowance} onChange={e => setBulkPay({...bulkPay, dutyAllowance: Number(e.target.value)})} style={styles.input} /></div>
              <div style={styles.inputGroup}><small>장려수당</small><input type="number" value={bulkPay.incentiveAllowance} onChange={e => setBulkPay({...bulkPay, incentiveAllowance: Number(e.target.value)})} style={styles.input} /></div>
              <div style={styles.inputGroup}><small>특별수당</small><input type="number" value={bulkPay.specialAllowance} onChange={e => setBulkPay({...bulkPay, specialAllowance: Number(e.target.value)})} style={styles.input} /></div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSave} onClick={saveBulkSettings}>저장</button>
              <button style={styles.btnClose} onClick={() => setIsSettingOpen(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* --- [모달 2] Apple Style 상세 정보 팝업 --- */}
      {detail && (
        <div style={styles.overlay} onClick={() => setDetail(null)}>
          <div style={styles.appleModal} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={styles.appleHeader}>
              <div style={{flex:1}}>
                <div style={{fontSize:'13px', color:'#888', fontWeight:'600', marginBottom:'4px', letterSpacing:'1px'}}>{detail.branchCode}</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap:'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', color:'#fff', fontWeight:'700', letterSpacing:'-0.5px' }}>{detail.name}</h2>
                    
                    {(detail.pin || detail.invitePin4) && (
                        <div style={{
                            display:'flex', alignItems:'center', gap:'6px',
                            background:'rgba(255,255,255,0.15)', padding:'4px 10px', borderRadius:'8px',
                            border:'1px solid rgba(255,255,255,0.1)'
                        }}>
                             <span style={{fontSize:'10px', color:'#aaa', fontWeight:'600', letterSpacing:'0.5px'}}>PIN CODE</span>
                             <span style={{fontSize:'14px', color:'#fff', fontWeight:'700', fontFamily:'SF Mono, Menlo, monospace', letterSpacing:'1px'}}>
                                 {detail.pin || detail.invitePin4}
                             </span>
                        </div>
                    )}

                    <div 
                        onClick={() => handleDetailChange('contractDone', !detail.contractDone)}
                        style={{
                            display:'flex', alignItems:'center', gap:'6px', cursor:'pointer',
                            background: detail.contractDone ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                            padding:'4px 10px', borderRadius:'8px',
                            border: detail.contractDone ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                         <span style={{fontSize:'13px', color: detail.contractDone ? '#30d158' : '#aaa', fontWeight:'600'}}>
                             {detail.contractDone ? '✔ 계약 체결' : '계약 미체결'}
                         </span>
                    </div>
                </div>
              </div>
              
              {/* Status Badge */}
              <div 
                 onClick={toggleStatus}
                 style={{ 
                   padding:'8px 16px', borderRadius:'30px', fontSize:'13px', fontWeight:'600',
                   background: detail.status === 'active' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)',
                   color: detail.status === 'active' ? '#30d158' : '#ff453a',
                   cursor: 'pointer', border: detail.status === 'active' ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid rgba(255, 69, 58, 0.3)',
                   transition: 'all 0.2s ease',
                   display:'flex', alignItems:'center', gap:'6px',
                   whiteSpace: 'nowrap', marginLeft: '12px'
                 }}
              >
                 <div style={{width:'8px', height:'8px', borderRadius:'50%', background: detail.status === 'active' ? '#30d158' : '#ff453a'}}></div>
                 {detail.status === 'active' ? '근무중' : (detail.status === 'issued' ? '가입 대기' : '퇴사됨')}
              </div>
            </div>
            
            <div style={styles.appleBody}>
              
              {/* Personal Info */}
              <div style={styles.appleSection}>
                <div style={{...styles.sectionLabel, color:'#0a84ff'}}>📝 기본 정보</div>
                <div style={styles.grid2}>
                    <div style={styles.inputGroup}><small>전화번호</small><input value={detail.phone || detail.phoneLast4 || ''} onChange={e => handleDetailChange('phone', e.target.value)} style={styles.input} /></div>
                    <div style={styles.inputGroup}><small>이메일</small><input value={detail.email || ''} onChange={e => handleDetailChange('email', e.target.value)} style={styles.input} /></div>
                    
                    {/* ✅ 주민등록번호 매핑된 값 표시 */}
                    <div style={styles.inputGroup}><small>주민등록번호</small><input value={detail.residentNumber || ''} onChange={e => handleDetailChange('residentNumber', e.target.value)} style={styles.input} placeholder="000000-0000000" /></div>
                    <div style={styles.inputGroup}>
                        <small>신분증 사본</small>
                        <button 
                            onClick={() => setIsIdVisible(!isIdVisible)}
                            style={{
                                ...styles.btnCheckId,
                                background: isIdVisible ? '#30d158' : 'rgba(255,255,255,0.1)',
                                color: isIdVisible ? '#000' : '#fff'
                            }}
                        >
                            {isIdVisible ? '사진 접기 ▲' : '사진 확인 ▼'}
                        </button>
                    </div>
                </div>
                
                {isIdVisible && (
                    <div style={{marginTop:'16px', animation:'fadeIn 0.3s ease'}}>
                        <div style={styles.idCardBox}>
                            {detail.idCardImage ? (
                                <img src={detail.idCardImage} alt="ID Card" style={{maxWidth:'100%', maxHeight:'300px', borderRadius:'8px'}} />
                            ) : (
                                <span style={{color:'#555', fontSize:'13px'}}>등록된 이미지가 없습니다.</span>
                            )}
                        </div>
                    </div>
                )}
              </div>

              {/* Work Info & Contract */}
              <div style={styles.appleSection}>
                <div style={{...styles.sectionLabel, color:'#0a84ff'}}>📅 근무 및 계약</div>
                
                <div style={{marginBottom:'16px'}}>
                    <small style={{display:'block', marginBottom:'8px', color:'#86868b', fontSize:'12px', fontWeight:'500'}}>담당 시간대 (중복 선택 가능)</small>
                    
                    <div style={{
                        display:'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap:'8px'
                    }}>
                        {WORK_SHIFTS.map(shift => {
                            const isSelected = detail.workTimeSlot?.includes(shift);
                            return (
                                <button 
                                    key={shift}
                                    onClick={() => toggleShift(shift)}
                                    style={{
                                        padding:'10px 0',
                                        borderRadius:'12px', 
                                        border:'1px solid',
                                        fontSize:'13px', cursor:'pointer', transition:'all 0.2s',
                                        background: isSelected ? '#007aff' : 'rgba(255,255,255,0.05)',
                                        borderColor: isSelected ? '#007aff' : 'rgba(255,255,255,0.1)',
                                        color: isSelected ? '#fff' : '#aaa',
                                        fontWeight: isSelected ? '600' : '400'
                                    }}
                                >
                                    {shift}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div style={{marginTop:'12px', ...styles.inputGroup}}>
                    <small>급여 계좌 (은행 / 계좌번호)</small>
                    <div style={{display:'flex', gap:'8px'}}>
                        <input 
                            value={detail.bankName || ''} 
                            onChange={e => handleDetailChange('bankName', e.target.value)} 
                            style={{...styles.input, flex:'0.35'}} 
                            placeholder="은행명"
                        />
                        <input 
                            value={detail.accountNumber || ''} 
                            onChange={e => handleDetailChange('accountNumber', e.target.value)} 
                            style={{...styles.input, flex:'1'}} 
                            placeholder="계좌번호"
                        />
                    </div>
                </div>
              </div>

              {/* Admin Pay Settings */}
              {!detail.isInvite && (
                <div style={styles.appleSection}>
                   <div style={{...styles.sectionLabel, color:'#0a84ff'}}>💰 인사 및 급여 설정</div>
                   <div style={styles.grid2}>
                      <div style={styles.inputGroup}><small>정식 입사일</small><input type="date" value={detail.hireDate || ''} onChange={e => handleDetailChange('hireDate', e.target.value)} style={styles.input} /></div>
                      <div style={styles.inputGroup}><small>직급</small><input value={detail.position || '크루'} disabled style={styles.input} /></div>
                   </div>
                   <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'10px', marginTop:'12px'}}>
                      <div style={styles.inputGroup}><small>기본급</small><input type="number" value={detail.basePay || 0} onChange={e => handleDetailChange('basePay', e.target.value)} style={styles.input} /></div>
                      <div style={styles.inputGroup}><small>책임수당</small><input type="number" value={detail.dutyAllowance || 0} onChange={e => handleDetailChange('dutyAllowance', e.target.value)} style={styles.input} /></div>
                      <div style={styles.inputGroup}><small>장려수당</small><input type="number" value={detail.incentiveAllowance || 0} onChange={e => handleDetailChange('incentiveAllowance', e.target.value)} style={styles.input} /></div>
                      <div style={styles.inputGroup}><small>특별수당</small><input type="number" value={detail.specialAllowance || 0} onChange={e => handleDetailChange('specialAllowance', e.target.value)} style={styles.input} /></div>
                   </div>
                   <div style={styles.totalPayRow}>
                      <span>최종 시급 합계</span>
                      <span style={{fontSize:'20px', fontWeight:'700', color:'#fff'}}>₩ {detail.totalHourly?.toLocaleString()}</span>
                   </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={styles.appleFooter}>
              <button style={styles.btnApplePrimary} onClick={saveDetail}>변경사항 저장</button>
              
              {detail.status === 'issued' && (
                  <button style={{...styles.btnAppleSecondary, color:'#ff453a'}} onClick={toggleStatus}>초대 취소</button>
              )}
              {(detail.status === 'terminated' || detail.status === 'expired') && (
                  <>
                    <button style={{...styles.btnAppleSecondary, color:'#30d158'}} onClick={restoreCrew}>복원</button>
                    <button style={{...styles.btnAppleSecondary, color:'#ff453a'}} onClick={deleteCrewPermanently}>영구 삭제</button>
                  </>
              )}
              
              <button style={styles.btnAppleClose} onClick={() => setDetail(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- [Apple Design System Styles] ---
const styles: { [key: string]: CSSProperties } = {
  pageWrapper: { background: '#000', minHeight: '100vh', padding: '40px', color: '#f5f5f7', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif' },
  
  // Navigation
  topNav: { display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'center' },
  btnBack: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '20px', cursor: 'pointer', fontSize:'14px', fontWeight:'500', backdropFilter:'blur(10px)' },
  btnSetting: { background: '#1c1c1e', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '20px', cursor: 'pointer', fontWeight: '500', fontSize:'14px' },
  btnCreate: { background: '#007aff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize:'14px' },

  // Layout
  contentLayout: { maxWidth: '1000px', margin: '0 auto' },
  sectionCard: { background: '#1c1c1e', borderRadius: '24px', padding: '32px' },
  
  // Header
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
  searchInput: { background: 'rgba(118, 118, 128, 0.24)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '14px', outline: 'none', width:'160px' },
  sortSelect: { background: 'rgba(118, 118, 128, 0.24)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '14px', outline: 'none', cursor: 'pointer' },

  // Tabs
  tabRow: { display: 'flex', gap: '10px', marginBottom: '24px' },
  tabItem: { border: 'none', padding: '8px 16px', borderRadius: '18px', fontSize: '13px', cursor: 'pointer', transition:'all 0.2s' },

  // Table (헤더 컬럼 변경)
  tableWrapper: { borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' },
  tableHeader: { display: 'grid', gridTemplateColumns: '0.6fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr', padding: '16px 20px', background: 'rgba(255,255,255,0.05)', fontSize: '12px', color: '#86868b', fontWeight:'600' },
  tableRow: { display: 'grid', gridTemplateColumns: '0.6fr 0.8fr 1fr 0.8fr 0.8fr 0.6fr', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '14px', cursor: 'pointer', alignItems:'center', transition:'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } } as any,

  // Common Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#1c1c1e', width: '90%', maxWidth: '400px', borderRadius: '24px', padding: '30px', boxShadow:'0 20px 40px rgba(0,0,0,0.5)' },
  
  // Apple Style Detail Modal
  appleModal: { 
    background: 'rgba(28, 28, 30, 0.95)', 
    width: '90%', maxWidth: '560px', borderRadius: '24px', padding: '0', 
    boxShadow:'0 40px 80px rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.1)',
    display:'flex', flexDirection:'column', maxHeight:'85vh', overflowY:'auto'
  },
  appleHeader: { padding:'32px', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  appleBody: { padding:'32px', display:'flex', flexDirection:'column', gap:'24px' },
  
  // Sections
  appleSection: { background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px' },
  sectionLabel: { fontSize:'12px', color:'#86868b', fontWeight:'600', marginBottom:'16px', textTransform:'uppercase' },
  
  // Inputs & Grid
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  labelSmall: { fontSize:'12px', color:'#86868b', fontWeight:'500', marginLeft:'4px' },
  input: { 
    background: 'rgba(118, 118, 128, 0.24)', border: 'none', borderRadius: '10px', 
    padding: '10px 12px', color: '#fff', fontSize:'15px', outline: 'none', width:'100%', boxSizing:'border-box',
    transition: 'background 0.2s' 
  },
  
  // ID Card Button & Box
  btnCheckId: { 
    width:'100%', height:'38px',
    border:'1px solid rgba(255,255,255,0.2)', borderRadius:'10px', 
    cursor:'pointer', fontSize:'13px', fontWeight:'600', transition:'0.2s' 
  },
  idCardBox: { 
    width: '100%', minHeight:'100px', background:'rgba(0,0,0,0.3)', borderRadius:'10px', 
    display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed rgba(255,255,255,0.2)',
    padding:'10px', boxSizing:'border-box'
  },

  // iOS Toggle
  toggleRow: { display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(118, 118, 128, 0.24)', padding:'8px 12px', borderRadius:'10px', cursor:'pointer' },
  toggleTrack: { width:'40px', height:'24px', borderRadius:'12px', position:'relative', transition:'0.3s' },
  toggleThumb: { width:'20px', height:'20px', background:'#fff', borderRadius:'50%', position:'absolute', top:'2px', left:'2px', transition:'0.3s', boxShadow:'0 2px 4px rgba(0,0,0,0.2)' },

  // Pay Row
  totalPayRow: { marginTop:'16px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', color:'#86868b', fontSize:'13px' },

  // Footer
  appleFooter: { padding:'24px 32px', borderTop:'1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px', background:'rgba(28, 28, 30, 0.5)' },
  btnApplePrimary: { flex: 2, background: '#007aff', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '600', fontSize:'15px', cursor: 'pointer' },
  btnAppleSecondary: { flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '500', fontSize:'14px', cursor: 'pointer' },
  btnAppleClose: { flex: 1, background: 'transparent', color: '#86868b', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', fontWeight: '500', fontSize:'14px', cursor: 'pointer' },
  
  // Legacy Styles (유지)
  modalFooter: { display: 'flex', gap: '10px', marginTop: '20px' },
  btnSave: { flex: 2, background: '#007aff', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer' },
  btnClose: { flex: 1, background: '#333', color: '#aaa', border: 'none', padding: '12px', borderRadius: '12px', cursor: 'pointer' },
};