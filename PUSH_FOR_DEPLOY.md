# 배포용 푸시 방법

Vercel이 연결된 저장소는 **my-app-vibe** (https://github.com/likelivb-mong/my-app-vibe.git) 이고,  
이 **my-app** 폴더가 그 저장소와 연결되어 있습니다.

## 올바른 순서 (반드시 my-app 폴더에서 실행)

```bash
cd /Users/yelimryu/vibe-app/my-app
git add .
git status
git commit -m "fix: ..."   # (이미 커밋했다면 생략)
git push origin main
```

- **vibe-app** 루트(`/Users/yelimryu/vibe-app`)에서 `git push` 하면 **origin이 없어서** 실패합니다.
- **my-app** 폴더로 들어간 뒤 푸시하면 됩니다.
