# 스타트업 협업툴 리팩토링 – 마이그레이션 및 안내

## 1. 마이그레이션 필수

스키마에 **Project** 모델과 **Task.projectId** 가 추가되었습니다. 반드시 마이그레이션을 실행하세요.

```bash
npx prisma migrate dev --name add_project_and_task_project_id
```

이미 `Attendance`, `LeaveRequest` 마이그레이션을 적용했다면 위 한 번만 실행하면 됩니다.  
아직 적용하지 않았다면 기존 마이그레이션 이력에 따라 이름을 조정해 실행하세요.

## 2. Prisma Client 재생성

마이그레이션 후 클라이언트가 자동 생성됩니다. 수동으로 하려면:

```bash
npx prisma generate
```

## 3. 서버 재시작

스키마·API 변경 후 개발 서버를 한 번 재시작하는 것을 권장합니다.

```bash
# 실행 중이었다면 Ctrl+C 후
npm run dev
```

---

## 4. 변경 파일 요약

### Prisma
- `prisma/schema.prisma` – Project 모델 추가, Task에 projectId(optional) 추가

### API
- `app/api/projects/route.ts` – **신규** GET/POST (팀별 프로젝트 목록/생성)
- `app/api/tasks/route.ts` – projectId 필터·응답·POST 시 projectId 지원
- `app/api/tasks/[taskId]/route.ts` – project 포함 조회, PUT 시 projectId 수정
- `app/api/teams/route.ts` – GET 시 본인 팀 또는 CEO일 때 전체 팀 목록
- `app/api/teams/[teamId]/route.ts` – GET 시 해당 팀 소속 또는 CEO만 조회 가능

### 페이지
- `app/(dashboard)/me/page.tsx` – 개인 페이지 레이아웃 (MeKanban, 출퇴근, 연차)
- `app/(dashboard)/teams/page.tsx` – **신규** 팀 목록(CEO) 또는 내 팀으로 리다이렉트
- `app/(dashboard)/teams/[teamId]/page.tsx` – **신규** 팀 상세(진행률, Kanban)

### 컴포넌트
- `components/MeKanban.tsx` – **신규** 개인 Kanban (todo/in_progress/done)
- `components/CreateTaskModal.tsx` – **신규** 새 업무 추가 (제목, 설명, 마감일, 우선순위, 프로젝트)
- `components/TeamKanban.tsx` – **신규** 팀 Kanban (게이지, 프로젝트 필터, 카드 클릭 시 TaskDetailModal)
- `components/CalendarView.tsx` – month/year·필터 기준 단일 fetch, 무한 로딩 방지, 오류 시 console.error
- `components/TaskDetailModal.tsx` – 삭제 버튼 추가
- `components/DashboardNav.tsx` – teamId 전달, “팀” 링크 추가
- `app/(dashboard)/layout.tsx` – user에 teamId 포함

### 대시보드
- 전사 대시보드는 기존 구조 유지 (ProgressGauge, 팀별 카드, 지연 업무, ActivityFeed)
- 모든 승인 사용자 동일 노출 (대표 전용 아님)

---

## 5. 상태 컬러 통일 (ProgressGauge)

- **todo** = 회색 (`bg-slate-400`)
- **in_progress** = 파랑 (`bg-blue-500`)
- **done** = 초록 (`bg-emerald-500`)
- **on_hold** = 주황 (`bg-amber-500`)
- **overdue** = 빨강 (`bg-red-500`)

위 값은 `components/ProgressGauge.tsx` 의 `STATUS_COLORS` / `STATUS_LABELS` 에 정의되어 있습니다.

---

## 6. 팀·프로젝트·업무 구조

팀 → 프로젝트 → 업무 라우트 및 네비 구조는 **`STRUCTURE.md`** 에 정리되어 있습니다.  
담당자 지정 UI: **CreateTaskModal**(새 업무 시 담당자 선택), **TaskDetailModal**(담당자 변경)에 반영됨. CEO/팀장만 담당자 지정·변경 가능.
