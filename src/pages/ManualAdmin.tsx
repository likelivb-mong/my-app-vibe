import { useState, useEffect } from "react";

interface ManualItem {
  id: number;
  title: string;
  content: string;
  date: string;
}

export default function ManualAdmin() {
  const [items, setItems] = useState<ManualItem[]>([]);
  const [form, setForm] = useState({ title: "", content: "" });
  const [editingId, setEditingId] = useState<number | null>(null);

  // 팝업 관련 상태
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewExpandedId, setPreviewExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("company_manual_data");
    if (saved) setItems(JSON.parse(saved));
  }, []);

  const saveToStorage = (newItems: ManualItem[]) => {
    setItems(newItems);
    localStorage.setItem("company_manual_data", JSON.stringify(newItems));
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.content.trim()) return alert("제목과 내용을 입력해주세요.");

    if (editingId) {
      const updated = items.map((item) =>
        item.id === editingId ? { ...item, ...form, date: new Date().toLocaleDateString() + " (수정됨)" } : item
      );
      saveToStorage(updated);
      setEditingId(null);
      alert("수정되었습니다.");
    } else {
      const newItem: ManualItem = {
        id: Date.now(),
        title: form.title,
        content: form.content,
        date: new Date().toLocaleDateString(),
      };
      saveToStorage([newItem, ...items]);
      alert("등록되었습니다.");
    }
    setForm({ title: "", content: "" });
  };

  const handleEdit = (item: ManualItem) => {
    setForm({ title: item.title, content: item.content });
    setEditingId(item.id);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      saveToStorage(items.filter((item) => item.id !== id));
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => window.location.hash = "main-dashboard"} style={navBtn}>
            ← 대시보드
          </button>
          <div style={{ height: "20px", borderRight: "1px solid #333" }}></div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#fff" }}>
            Manual
          </h1>
        </div>
        <button onClick={() => setIsPreviewOpen(true)} style={previewBtn}>
          미리보기
        </button>
      </header>

      <div style={columnContainer}>
        {/* 상단: 새 매뉴얼 작성 폼 */}
        <section style={editorSection}>
          <div style={sectionHeader}>
            <h3 style={{ margin: 0, fontSize: "16px", color: editingId ? "#facc15" : "#fff" }}>
              {editingId ? "✏️ 매뉴얼 수정 중..." : "📝 새 매뉴얼 작성"}
            </h3>
            {editingId && (
              <button 
                onClick={() => { setEditingId(null); setForm({ title: "", content: "" }); }}
                style={resetBtn}
              >
                작성 모드로 전환
              </button>
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <input
              type="text"
              placeholder="제목 (예: 오픈 준비 가이드)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inputStyle}
            />
            <textarea
              placeholder="내용을 상세히 입력하세요..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              style={textareaStyle}
            />
            <button onClick={handleSubmit} style={editingId ? updateBtn : submitBtn}>
              {editingId ? "수정사항 저장" : "새 매뉴얼 등록"}
            </button>
          </div>
        </section>

        {/* 하단: 등록된 목록 */}
        <section style={listSection}>
          <div style={sectionHeader}>
            <h3 style={{ margin: 0, fontSize: "16px" }}>등록된 목록 ({items.length})</h3>
          </div>
          <div style={scrollArea}>
            {items.length === 0 ? (
              <div style={emptyState}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📭</div>
                등록된 매뉴얼이 없습니다.<br />위에서 내용을 작성해주세요.
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} style={editingId === item.id ? activeItemCard : itemCard}>
                  <div style={{ flex: 1 }}>
                    <div style={itemTitle}>{item.title}</div>
                    <div style={itemMeta}>{item.date}</div>
                    <div style={itemPreview}>{item.content.substring(0, 60)}{item.content.length > 60 && "..."}</div>
                  </div>
                  <div style={actionGroup}>
                    <button onClick={() => handleEdit(item)} style={editActionBtn}>수정</button>
                    <button onClick={() => handleDelete(item.id)} style={deleteActionBtn}>삭제</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ✅ 미리보기 팝업 (모달) */}
      {isPreviewOpen && (
        <div style={modalOverlay} onClick={() => setIsPreviewOpen(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <header style={modalHeader}>
              <div style={{width: '60px'}}></div>
              <h2 style={{ fontSize: "18px", margin: 0 }}>📱 사용자 화면 미리보기</h2>
              <button onClick={() => setIsPreviewOpen(false)} style={closeModalBtn}>
                ✕ 닫기
              </button>
            </header>
            
            <div style={modalBody}>
              {/* 실제 사용자 화면(Manual.tsx)과 동일한 렌더링 로직 */}
              {items.length === 0 ? (
                <div style={emptyState}>등록된 매뉴얼이 없습니다.</div>
              ) : (
                items.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setPreviewExpandedId(previewExpandedId === item.id ? null : item.id)}
                    style={{
                      ...previewCardStyle,
                      background: previewExpandedId === item.id ? '#222' : '#151515',
                      borderColor: previewExpandedId === item.id ? '#3b82f6' : '#333'
                    }}
                  >
                    <div style={previewCardHeader}>
                      <div style={{flex:1}}>
                        <div style={previewCardTitle}>{item.title}</div>
                        <div style={previewCardDate}>{item.date}</div>
                      </div>
                      <div style={{fontSize:'12px', color:'#666'}}>
                        {previewExpandedId === item.id ? '접기 ▲' : '보기 ▼'}
                      </div>
                    </div>
                    {previewExpandedId === item.id && (
                      <div style={previewCardBody}>
                        {item.content.split('\n').map((line, i) => (
                          <p key={i} style={{margin:'4px 0', minHeight:'6px'}}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const pageStyle: React.CSSProperties = { background: "#000", minHeight: "100vh", color: "#fff", padding: "30px", boxSizing: "border-box" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", padding: "0 10px" };
const navBtn: React.CSSProperties = { background: "transparent", border: "1px solid #333", color: "#888", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", transition: "0.2s" };
const previewBtn: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #333", color: "#4ade80", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" };

const columnContainer: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "28px", paddingBottom: "24px" };

// Editor Styles
const editorSection: React.CSSProperties = { display: "flex", flexDirection: "column" };
const sectionHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", height: "30px" };
const resetBtn: React.CSSProperties = { background: "none", border: "none", color: "#888", fontSize: "12px", textDecoration: "underline", cursor: "pointer" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#151515", border: "1px solid #333", color: "#fff", padding: "15px", borderRadius: "12px", fontSize: "15px", outline: "none", boxSizing: "border-box" };
const textareaStyle: React.CSSProperties = { width: "100%", minHeight: "140px", background: "#151515", border: "1px solid #333", color: "#fff", padding: "15px", borderRadius: "12px", fontSize: "14px", lineHeight: "1.6", outline: "none", resize: "vertical", boxSizing: "border-box" };
const submitBtn: React.CSSProperties = { background: "#3b82f6", color: "#fff", border: "none", padding: "15px", borderRadius: "12px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginTop: "auto" };
const updateBtn: React.CSSProperties = { background: "#facc15", color: "#000", border: "none", padding: "15px", borderRadius: "12px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", marginTop: "auto" };

// List Styles
const listSection: React.CSSProperties = { display: "flex", flexDirection: "column", background: "#111", borderRadius: "20px", border: "1px solid #222", padding: "20px", overflow: "hidden", minHeight: "200px" };
const scrollArea: React.CSSProperties = { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "5px", minHeight: "120px" };
const emptyState: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#444", textAlign: "center", lineHeight: "1.5", fontSize: "13px" };
const itemCard: React.CSSProperties = { background: "#1a1a1a", padding: "15px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #2a2a2a", transition: "0.2s" };
const activeItemCard: React.CSSProperties = { ...itemCard, border: "1px solid #facc15", background: "#222" };
const itemTitle: React.CSSProperties = { fontWeight: "bold", fontSize: "14px", marginBottom: "4px", color: "#fff" };
const itemMeta: React.CSSProperties = { fontSize: "11px", color: "#666", marginBottom: "6px" };
const itemPreview: React.CSSProperties = { fontSize: "12px", color: "#999", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "250px" };
const actionGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };
const editActionBtn: React.CSSProperties = { background: "#333", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" };
const deleteActionBtn: React.CSSProperties = { background: "rgba(239, 68, 68, 0.2)", color: "#ef4444", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" };

// Modal Styles
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 };
const modalContent: React.CSSProperties = { width: '100%', maxWidth: '600px', height: '90vh', background: '#000', border: '1px solid #333', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const modalHeader: React.CSSProperties = { padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111' };
const closeModalBtn: React.CSSProperties = { background: '#222', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' };
const modalBody: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' };

// Preview Card Styles (Replicated from Manual.tsx)
const previewCardStyle: React.CSSProperties = { borderRadius: "12px", border: "1px solid #333", overflow: "hidden", transition: "all 0.2s" };
const previewCardHeader: React.CSSProperties = { padding: "16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" };
const previewCardTitle: React.CSSProperties = { fontSize: "15px", fontWeight: "bold", marginBottom: "4px", color: "#fff" };
const previewCardDate: React.CSSProperties = { fontSize: "11px", color: "#888" };
const previewCardBody: React.CSSProperties = { padding: "0 16px 16px 16px", color: "#ccc", fontSize: "14px", lineHeight: "1.6", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "-5px", paddingTop: "15px" };