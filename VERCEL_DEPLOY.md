# Vercel 배포 체크리스트

배포 실패 시 아래를 확인하세요.

## 1. package.json 빌드 스크립트
반드시 **타입 체크 없이** Vite만 실행해야 합니다.
```json
"build": "vite build"
```
❌ `"build": "tsc -b && vite build"` 이면 빌드 로그에서 TypeScript 오류로 실패합니다.

## 2. 이 폴더(my-app) 전체를 배포하는 경우
- Vercel **Root Directory**를 비워 두거나 프로젝트 루트로 두세요.
- 이 폴더 안에 `package.json`, `vercel.json`, `vite.config.ts`가 있어야 합니다.

## 3. 상위 폴더(vibe-app)에서 배포하는 경우
- 상위에 있는 `vibe-app/package.json`이 `"build": "cd my-app && npm ci && npm run build"` 로 되어 있어야 하고,
- `my-app/package.json`의 build는 위와 같이 `"vite build"` 여야 합니다.

## 4. 최신 코드 푸시
지금 이 로컬 프로젝트를 배포하려면, **이 my-app 폴더 내용을 그대로** 배포용 저장소에 푸시해야 합니다.
```bash
cd /Users/yelimryu/vibe-app/my-app
git init
git remote add origin https://github.com/likelivb-mong/my-app-vibe.git
git add .
git commit -m "fix: build script and types for Vercel"
git push -u origin main --force
```
(이미 다른 remote가 있으면 `git push origin main` 만 실행)
