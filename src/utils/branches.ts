import type { Branch } from "../types";

export const BRANCHES: Branch[] = [
  {
    code: "GDXC",
    label: "엑스케이프",
    allowedIp: "1.2.3.4", // 실제 매장 공인 IP로 수정 필요
    mapUrl: "https://naver.me/52Rwiewa",
    phone: "02-463-9366",
    brandName: "엑스케이프",
    address: "서울특별시 광진구 동일로 112",
    company: "엑스케이프",
    bizNo: "851-70-00056",
  },
  {
    code: "GDXR",
    label: "엑스크라임",
    allowedIp: "1.2.3.4", 
    mapUrl: "https://naver.me/xs3G1j9E",
    phone: "02-464-8788",
    brandName: "엑스크라임",
    address: "서울 광진구 아차산로29길 38",
    company: "엑스크라임",
    bizNo: "350-34-00424",
  },
  {
    code: "NWXC",
    label: "뉴케이스",
    allowedIp: "1.2.3.4",
    mapUrl: "https://naver.me/5PVaHcw4",
    phone: "02-498-1999",
    brandName: "뉴케이스",
    address: "서울 광진구 아차산로 191",
    company: "뉴케이스",
    bizNo: "851-70-00056",
  },
  {
    code: "GNXC",
    label: "강남점",
    allowedIp: "1.2.3.4",
    mapUrl: "https://naver.me/FMcgAHck",
    phone: "02-555-9366",
    brandName: "엑스케이프 강남점",
    address: "서울특별시 광진구 동일로 112",
    company: "시냅스",
    bizNo: "829-43-00621",
  },
  {
    code: "SWXC",
    label: "수원점",
    allowedIp: "1.2.3.4",
    mapUrl: "https://naver.me/FdCfMPnc",
    phone: "031-234-3350",
    brandName: "엑스케이프",
    address: "경기 수원시 팔달구 효원로265번길 40",
    company: "리브레나",
    bizNo: "422-11-00263",
  },
];

export function getBranch(code: string) {
  return BRANCHES.find((b) => b.code === code);
}