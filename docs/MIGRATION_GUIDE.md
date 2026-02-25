# 업무 관리 시스템 구조 업그레이드 마이그레이션 가이드

## 변경 사항 요약

- **Task**: `completed` 제거 → `status` (todo | in_progress | done | on_hold | cancelled), `description`, `createdBy`, `updatedBy`, `creator` relation 추가
- **TaskComment**: 신규 모델 (댓글)
- **TaskHistory**: 신규 모델 (상태/담당자/우선순위 변경 이력)
- **User.role**: `TEAM_LEADER` 추가 (CEO | TEAM_LEADER | TEAM_MEMBER)

---

## 1. Prisma 마이그레이션 실행

### 방법 A: DB Push (개발/스키마 동기화)

```bash
npx prisma db push
```

- 기존 DB에 새 컬럼/테이블 추가, 제거된 컬럼(`Task.completed`) 삭제됨
- **주의**: 기존 Task 행의 `completed` 값은 사라지며, `status`는 기본값 `todo`로 설정됩니다. 완료였던 항목을 `done`으로 옮기려면 아래 데이터 마이그레이션 스크립트를 실행하세요.

### 방법 B: 마이그레이션 생성 및 적용 (운영 권장)

```bash
npx prisma migrate dev --name task_status_and_comments
```

- 마이그레이션 파일이 생성되고 적용됩니다.
- **기존 Task 데이터가 있는 경우**: Prisma가 생성한 마이그레이션은 `completed` 컬럼을 제거하고 `status`를 추가합니다. 기존 “완료” 상태를 보존하려면, 생성된 마이그레이션 SQL 파일을 연 다음, `ALTER TABLE "Task" DROP COLUMN "completed"` 전에 아래 SQL을 삽입하세요.

```sql
-- status 컬럼 추가 후, completed 제거 전에 실행되도록 삽입
UPDATE "Task" SET status = 'done' WHERE "completed" = true;
```

- 새로 설치한 DB이거나 Task 데이터를 유지할 필요가 없으면 그대로 `migrate dev`만 실행하면 됩니다.

---

## 2. Prisma Client 재생성

마이그레이션 또는 `db push` 후 반드시 실행:

```bash
npx prisma generate
```

---

## 3. 서버 재시작

- Next.js 개발 서버를 사용 중이었다면 한 번 종료 후 다시 실행하세요.
- `npm run dev`는 직접 실행하지 말고, 사용자가 로컬에서 실행하시면 됩니다.

---

## 4. 테스트 체크리스트

### 인증 / 역할

- [ ] CEO 로그인 → 대시보드, 전체 팀/할 일 조회 가능
- [ ] TEAM_LEADER 로그인 → 본인 팀 할 일만 조회 가능
- [ ] TEAM_MEMBER 로그인 → 본인 할 일만 조회 가능

### Task

- [ ] 할 일 목록: 날짜/상태/팀(CEO)/우선순위/제목 검색 필터 동작
- [ ] 할 일 추가: 제목, 마감일, 우선순위, 설명(선택) 저장
- [ ] 할 일 클릭 → 상세 모달 열림
- [ ] 상세 모달에서 상태 드롭다운 변경 시 즉시 반영 및 히스토리 기록
- [ ] 상세 모달에서 댓글 등록/목록 표시
- [ ] 변경 히스토리 타임라인 표시 (상태/담당자/우선순위 변경)

### 대시보드 (대표)

- [ ] 이번 주 신규 업무 수 표시
- [ ] 진행중 / 완료 업무 수 표시
- [ ] 지연 업무 목록 (마감일 &lt; 오늘, status ≠ done)
- [ ] 팀별 업무 진행률(%) 표시

### 기타

- [ ] 캘린더 일정 CRUD 정상 동작
- [ ] 회원가입/승인 플로우 정상 동작

---

## 5. 롤백이 필요한 경우

- `prisma migrate dev`로 적용한 마이그레이션은 `prisma migrate resolve --rolled-back <마이그레이션명>` 등으로 롤백할 수 있으나, 이미 스키마가 변경된 상태이므로 데이터 백업 후 진행하는 것이 안전합니다.
- `db push`는 롤백 명령이 없으므로, 운영 환경에서는 가급적 `migrate`를 사용하는 것을 권장합니다.

---

## 6. 역할별 접근 권한 정리

| 기능           | CEO   | TEAM_LEADER | TEAM_MEMBER |
|----------------|-------|-------------|-------------|
| 전체 할 일 조회 | ✅    | ❌ (본인 팀만) | ❌ (본인만)   |
| 팀 필터        | ✅    | ❌          | ❌          |
| 대시보드 요약  | ✅    | ❌          | ❌          |
| 할 일 승인/관리 | 본인+타인 | 본인 팀 범위 | 본인만       |
| 댓글/히스토리  | ✅    | ✅ (접근 가능한 Task만) | ✅ (본인 Task만) |

이 가이드를 기준으로 마이그레이션을 진행하시면 됩니다.
