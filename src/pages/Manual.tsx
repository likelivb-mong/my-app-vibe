import type { CSSProperties } from "react";

export default function Manual() {
  const goBack = () => {
    window.location.hash = "#dashboard"; // 대시보드로 돌아가기
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <button onClick={goBack} style={backBtnStyle}>← 뒤로가기</button>
        <h1 style={{ fontSize: 24, margin: 0 }}>매뉴얼</h1>
      </header>
      
      <div style={contentStyle}>
        <h3>📌 크루 이용 가이드</h3>
        <p>1. 출근 시 PIN 번호를 입력하세요.</p>
        <p>2. 공지사항을 반드시 확인해 주세요.</p>
        {/* 추가 내용을 여기에 작성하세요 */}
      </div>
    </div>
  );
}

// 간단한 스타일 예시
const containerStyle: CSSProperties = { padding: 24, background: "#111", color: "#fff", minHeight: "100vh" };
const headerStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 };
const backBtnStyle: CSSProperties = { background: "none", border: "1px solid #444", color: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" };
const contentStyle: CSSProperties = { lineHeight: 1.6, opacity: 0.9 };