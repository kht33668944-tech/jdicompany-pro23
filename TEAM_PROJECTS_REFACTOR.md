# 팀 전용 프로젝트 → 세부 업무 구조 확장 – 변경 요약

## 1. Prisma 스키마 수정

**파일: `prisma/schema.prisma`**

- **Project 모델 확장**
  - `description` String? 추가
  - `startDate` DateTime? @map("start_date") @db.Date
  - `endDate` DateTime? @map("end_date") @db.Date
  - `status` String @default("active") // active | archived
  - `updatedAt` DateTime @updatedAt @map("updated_at")
  - `@@unique([teamId, name])` 추가

- **Task**: 변경 없음 (projectId nullable 유지)

- **LeaveRequest**: 변경 없음

---

## 2. 추가/수정된 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/projects?teamId=...&status=active\|archived` | 팀별 프로젝트 목록 + 진행률 요약 |
| POST | `/api/projects` | 프로젝트 생성 (CEO, TEAM_LEADER) |
| GET | `/api/projects/[id]` | 프로젝트 상세 + Task 상태별 요약 |
| PATCH | `/api/projects/[id]` | 프로젝트 수정 (이름/설명/기간/status) |
| GET | `/api/dashboard/items?status=...&teamId=...&projectId=...&teamScope=...&overdueOnly=...` | 대시보드 카드 클릭 시 업무 리스트 |
| GET | `/api/teams/[teamId]/schedule?from=...&to=...` | 팀 스케줄 (Task, Event, LeaveRequest) |

**Tasks API 확장**

- GET `/api/tasks`: 쿼리 `teamScope=true` 시 TEAM_MEMBER도 같은 팀 업무 조회 가능. `overdueOnly=true` 지원.
- POST `/api/tasks`: projectId 있으면 teamId를 프로젝트 팀으로 고정. TEAM_LEADER 담당자 지정 가능.

---

## 3. 추가된 페이지

| 경로 | 설명 |
|------|------|
| `app/(dashboard)/teams/[teamId]/page.tsx` | 팀 페이지 (프로젝트 목록, 스케줄, Kanban) – 기존 수정 |
| `app/(dashboard)/teams/[teamId]/projects/[projectId]/page.tsx` | **신규** 프로젝트 상세 (진행률, Kanban, 새 업무) |
| `app/(dashboard)/teams/page.tsx` | 팀 없을 때 안내 문구 추가 |

---

## 4. 추가/수정된 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `components/TaskListModal.tsx` | **신규** – 대시보드 카드 클릭 시 업무 리스트 (상태/팀/프로젝트 필터) |
| `components/ProjectCards.tsx` | **신규** – 팀별 프로젝트 카드 (진행률, D-day, 클릭 시 프로젝트 상세) |
| `components/CreateProjectModal.tsx` | **신규** – 새 프로젝트 (이름, 설명, 기간) |
| `components/TeamScheduleCard.tsx` | **신규** – 팀 스케줄 (마감 업무, 연차, 일정) |
| `components/TeamPageContent.tsx` | **신규** – 팀 페이지 레이아웃 (ProjectCards, 스케줄, Kanban, 프로젝트 생성) |
| `components/ProjectKanban.tsx` | **신규** – 프로젝트 상세용 Kanban + 새 업무 |
| `components/CompanyDashboard.tsx` | 수정 – 카드 클릭 시 TaskListModal, 팀명 클릭 시 팀 페이지 링크 |
| `components/TeamBoard.tsx` | 수정 – 팀명 링크(teamHref), 업무 제목 2줄+툴팁 |
| `components/TeamKanban.tsx` | 수정 – teamScope 사용, 새 업무 추가 버튼, 카드 제목 2줄+툴팁 |
| `components/CreateTaskModal.tsx` | 수정 – initialProjectId 지원 |

---

## 5. 권한 관련 lib 수정

**파일: `lib/task-auth.ts`**

- `canAccessTask`: TEAM_MEMBER도 **같은 팀** 업무면 READ 허용.
- `canWriteTask`: **신규** – CEO/팀장 팀 전체, TEAM_MEMBER는 본인 담당만 WRITE.
- `buildTaskWhere`: 옵션 `teamScope: true` 시 TEAM_MEMBER가 같은 팀 전체 조회 가능.
- Task PUT/DELETE: `canAccessTask` → `canWriteTask` 사용.

---

## 6. 마이그레이션 (reset 없이)

기존 데이터 유지. Project에 nullable/default 컬럼만 추가.

```bash
npx prisma migrate dev --name team_projects_structure
npx prisma generate
```

이후 서버 재시작:

```bash
npm run dev
```

---

## 7. 사용자 액션 3줄 요약

1. **마이그레이션 실행**: `npx prisma migrate dev --name team_projects_structure`
2. **Prisma 클라이언트 생성**: `npx prisma generate`
3. **개발 서버 실행**: `npm run dev` (직접 실행)
