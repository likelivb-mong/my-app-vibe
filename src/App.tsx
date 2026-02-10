import { useEffect, useState } from "react";
import CrewLogin from "./pages/CrewLogin"; 
import PinSetup from "./pages/PinSetup";
import CrewManager from "./pages/CrewManager";
import MainDashboard from "./pages/MainDashboard";
import PayStub from "./pages/PayStub";
import CrewHome from "./pages/CrewHome";
import Manual from "./pages/Manual";         // 📘 사용자용 매뉴얼
import ManualAdmin from "./pages/ManualAdmin"; // ⚙️ 관리자용 매뉴얼 편집기

// 라우트 타입 정의
type Route = 
  | "login" 
  | "pin-setup" 
  | "crew-manager" 
  | "main-dashboard" 
  | "pay-stub" 
  | "crew-home"
  | "manual"       // 추가
  | "manual-admin"; // 추가

function getRouteFromHash(): Route {
  const h = (window.location.hash || "").replace("#", "").trim();

  // 1️⃣ PIN 발급 페이지 (기존 pin-setup과 CrewManager에서 보낸 admin-issue 모두 처리)
  if (h === "pin-setup" || h === "admin-issue") return "pin-setup";
  
  if (h === "main-dashboard") return "main-dashboard";
  if (h === "pay-stub") return "pay-stub";
  if (h === "crew-home") return "crew-home";
  
  // 📘 매뉴얼 관련 경로
  if (h === "manual") return "manual";
  if (h === "manual-admin") return "manual-admin";
  
  // 관리자 대시보드
  if (h === "crew-manager" || h === "dashboard") return "crew-manager";

  // 기본 화면: 로그인
  return "login";
}

export default function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash());

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#fff" }}>
      {/* 기본 화면 */}
      {route === "login" && <CrewLogin />}
      
      {/* 🟢 관리자: PIN 발급 (PinSetup 컴포넌트 연결) */}
      {route === "pin-setup" && <PinSetup />}
      
      {/* 크루 개인 홈 */}
      {route === "crew-home" && <CrewHome />}
      
      {/* 📘 매뉴얼 페이지 (사용자용) */}
      {route === "manual" && <Manual />}

      {/* ⚙️ 매뉴얼 관리자 페이지 (편집용) */}
      {route === "manual-admin" && <ManualAdmin />}
      
      {/* 급여 명세서 */}
      {route === "pay-stub" && <PayStub />}
      
      {/* 관리자: 통합 관리 */}
      {route === "crew-manager" && <CrewManager />}
      
      {/* (구) 메인 대시보드 */}
      {route === "main-dashboard" && (
        <MainDashboard onLogout={() => window.location.hash = "login"} />
      )}
    </div>
  );
}
