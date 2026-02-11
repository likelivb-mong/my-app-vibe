import { overlay, modal, modalHeader, closeBtn } from '../../utils/crewStyles';

interface Props {
  manuals: string[];
  onClose: () => void;
}

export default function ManualModal({ manuals, onClose }: Props) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{...modal, display:'flex', flexDirection:'column', maxHeight:'85vh'}} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, color: '#0f172a' }}>Manual</h3>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>
        <div style={{flex:1, overflowY:'auto', paddingBottom:'20px'}}>
          {manuals.length === 0 ? (
            <p style={{textAlign:'center', color:'#475569', fontWeight: 600}}>등록된 매뉴얼이 없습니다.</p>
          ) : (
            manuals.map((m, i) => (
              <div key={i} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '10px' }}>
                <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit', fontSize:'13px', color:'#0f172a'}}>{m}</pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}