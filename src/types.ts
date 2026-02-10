// 지점 정보 타입 정의
export type Branch = {
  code: string;       // e.g. GDXC
  label: string;      // e.g. 건대 1호점
  allowedIp?: string; // 매장 공인 IP (보안 접속용, 선택)
  mapUrl: string;
  phone: string;
  brandName: string;
  address: string;
  company: string;
  bizNo: string;
};

// 초대 상태: 발급됨 | 사용됨(가입완료) | 만료됨(취소/삭제)
export type InviteStatus = "issued" | "used" | "expired";

// [수정됨] 초대장 데이터 타입
export type CrewInvite = {
  invitePin4: string;      // 관리자 승인 PIN (4자리 숫자)
  branchCode: string;      // 지점코드
  crewName: string;        // 이름
  phoneLast4: string;      // 전화번호 뒤 4자리
  status: InviteStatus;    // 상태
  issuedAt: number;        // 발급 시각
  // expiresAt: number;    // ❌ 삭제됨 (무기한 유효)
};

// [수정됨] 정식 크루 데이터 타입
export type CrewMember = {
  id?: string;             // 고유 ID (선택)
  branchCode: string;      // 소속 지점
  name: string;            // 이름
  phoneLast4: string;      // 전화번호 뒤 4자리
  
  pin: string;             // 출퇴근용 PIN (5자리)
  
  status: "active" | "terminated"; // 현재 상태 (근무중 | 퇴사)
  createdAt: number;       // 등록일
  
  // --- 관리자 페이지용 확장 필드 (선택적) ---
  position?: string;       // 직책 (크루 | 크루장)
  hireDate?: string;       // 입사일
  contractDone?: boolean;  // 근로계약서 작성 여부
  
  // 급여 정보
  basePay?: number;             // 기본급
  dutyAllowance?: number;       // 책임수당
  incentiveAllowance?: number;  // 장려수당
  specialAllowance?: number;    // 특별수당
  totalHourly?: number;         // 최종 시급
  
  // 개인 정보 및 계좌
  workShifts?: string[];   // 담당 시간대
  bankName?: string;       // 은행명
  accountNumber?: string;  // 계좌번호
  rrn?: string;            // 주민등록번호
  email?: string;          // 이메일
  idCardImage?: string;    // 신분증 사본 이미지 경로
  phone?: string;          // 전체 전화번호
};