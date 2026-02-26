# PWA · Web Push 설정 (직접 해야 할 것)

앱을 닫아도 휴대폰/PC에 알림이 오려면 **VAPID 키**를 생성해 `.env`에 넣어야 합니다.

## 1. VAPID 키 생성 및 .env 설정

1. 터미널에서 실행:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. 출력된 **Public Key**와 **Private Key**를 복사합니다.
3. `.env`에 다음 변수를 추가/수정합니다 (Public Key는 두 곳에 동일하게):

   ```env
   VAPID_PUBLIC_KEY="<위에서 복사한 Public Key>"
   VAPID_PRIVATE_KEY="<위에서 복사한 Private Key>"
   NEXT_PUBLIC_VAPID_PUBLIC_KEY="<위와 동일한 Public Key>"
   ```

   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: 서버에서 푸시 발송 시 사용  
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: 브라우저에서 구독 시 사용 (없으면 클라이언트가 `/api/push/vapid`에서 받아옴)

4. (선택) 발신자 식별용 이메일:
   ```env
   VAPID_SUBJECT="mailto:your@email.com"
   ```

설정 후 서버를 재시작하세요.

## 2. PWA 아이콘 (선택)

`public/icon-192.png`, `public/icon-512.png`를 넣으면 앱 설치·알림 아이콘으로 사용됩니다. 없어도 푸시는 동작합니다.

## 3. 동작 요약

- **대시보드**에 로그인한 사용자가 **알림 허용**을 하면 해당 기기 구독이 DB에 저장됩니다.
- 작업/댓글/휴가 승인 등으로 `createNotification`이 호출될 때마다 해당 사용자에게 **Web Push**가 발송됩니다.
- 앱을 닫아도 **Service Worker**가 푸시를 받아 기기 알림으로 띄우고, 알림 클릭 시 `url`로 이동합니다.
