export function makeInvitePin4(): string {
    // 4자리 숫자
    return String(Math.floor(1000 + Math.random() * 9000));
  }
  
  export function makeClockPin5(): string {
    // 5자리 영문+숫자 (대문자)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0,O,1,I 제외
    let out = "";
    for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }
  
  export function nowMs() {
    return Date.now();
  }
  
  export const DAY_24H_MS = 24 * 60 * 60 * 1000;