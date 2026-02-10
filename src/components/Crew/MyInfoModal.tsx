// ✅ 스타일을 여기서 불러오고, 아래쪽에서 다시 const statBox = ... 하지 않습니다.
import { 
  overlay, modal, modalHeader, closeBtn, 
  statBox, statLabel, statValue, 
  formGroup, inputDisabled, payDetailBox, 
  blackInput, textArea, submitBtn 
} from '../../utils/crewStyles';

interface Props {
  user: any;
  currentUser: any;
  statsMonth: string;
  setStatsMonth: (val: string) => void;
  myStats: { lateCount: number; absentCount: number };
  editRequest: any;
  setEditRequest: (val: any) => void;
  onClose: () => void;
  onSendRequest: () => void;
}

export default function MyInfoModal({ user, currentUser, statsMonth, setStatsMonth, myStats, editRequest, setEditRequest, onClose, onSendRequest }: Props) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{...modal, display:'flex', flexDirection:'column', maxHeight:'85vh'}} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <h3>👤 내 정보</h3>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>
        <div style={{flex:1, overflowY:'auto', paddingBottom:'20px'}}>
          
          <div style={{marginBottom:'15px', padding:'10px', background:'#FEFCE8', borderRadius:'8px', border:'1px solid #FEF08A', textAlign:'center'}}>
            <span style={{fontSize:'12px', color:'#854D0E', marginRight:'5px'}}>My PIN:</span>
            <span style={{fontSize:'16px', fontWeight:'bold', fontFamily:'monospace'}}>{currentUser.pin}</span>
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{fontSize:'12px', fontWeight:'bold', display:'block', marginBottom:'5px', color:'#1C1C1E'}}>조회 월 선택</label>
            <input type="month" value={statsMonth} onChange={e => setStatsMonth(e.target.value)} style={{...blackInput, width:'100%'}} />
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px'}}>
            <div style={statBox}><div style={statLabel}>이번 달 지각</div><div style={statValue}>{myStats.lateCount}회</div></div>
            <div style={statBox}><div style={statLabel}>이번 달 결근</div><div style={statValue}>{myStats.absentCount}회</div></div>
          </div>

          <div style={formGroup}><label style={{fontSize:'12px', color:'#8E8E93'}}>이름</label><input value={user.name} disabled style={inputDisabled} /></div>
          <div style={formGroup}><label style={{fontSize:'12px', color:'#8E8E93'}}>직책</label><input value={currentUser.position || '크루'} disabled style={inputDisabled} /></div>
          <div style={formGroup}><label style={{fontSize:'12px', color:'#8E8E93'}}>전화번호</label><input value={currentUser.phone} disabled style={inputDisabled} /></div>
          
          <div style={payDetailBox}>
            <div>기본급: ₩{currentUser.basePay?.toLocaleString() || 0}</div>
            <div>직책수당: ₩{currentUser.dutyAllowance?.toLocaleString() || 0}</div>
            <div>장려수당: ₩{currentUser.incentiveAllowance?.toLocaleString() || 0}</div>
            <div>특별수당: ₩{currentUser.specialAllowance?.toLocaleString() || 0}</div>
            <div style={{borderTop:'1px solid #eee', marginTop:'5px', paddingTop:'5px', fontWeight:'bold', color:'#007AFF'}}>최종 시급: ₩{currentUser.totalHourly?.toLocaleString() || 0}</div>
          </div>
          
          <div style={formGroup}><label style={{fontSize:'12px', color:'#1C1C1E'}}>요청 사항</label><textarea value={editRequest.reason} onChange={e => setEditRequest({...editRequest, reason: e.target.value})} style={{...textArea, color:'#000'}} /></div>
          <button onClick={onSendRequest} style={{...submitBtn, background: editRequest.reason ? '#1C1C1E' : '#C7C7CC', cursor: editRequest.reason ? 'pointer' : 'not-allowed'}} disabled={!editRequest.reason}>SEND</button>
        </div>
      </div>
    </div>
  );
}