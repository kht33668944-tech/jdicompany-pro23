# 업무 관리 시스템 API 명세

## 공통 사항

### 기본 정보
- **Base URL**: `https://api.example.com/v1` (또는 `/api/v1`)
- **인증**: Bearer JWT (Header: `Authorization: Bearer <token>`)
- **Content-Type**: `application/json`
- **응답 형식**: JSON

### 공통 응답 구조

**성공 (200, 201)**
```json
{
  "success": true,
  "data": { ... }
}
```

**목록 + 페이징**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**에러 (4xx, 5xx)**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "로그인이 필요합니다."
  }
}
```

### 공통 HTTP 상태 코드
| 코드 | 설명 |
|------|------|
| 200 | 성공 (조회, 수정, 삭제) |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (유효성 실패) |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

---

## 1. 인증 (Auth)

### 1.1 로그인
**POST** `/auth/login`

**Request**
```json
{
  "username": "hong@company.com",
  "password": "plainPassword"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "id": "user-uuid",
      "username": "hong@company.com",
      "name": "홍길동",
      "email": "hong@company.com",
      "teamId": "team-uuid",
      "teamName": "마케팅팀",
      "role": "member"
    }
  }
}
```

**에러**
- 401: 아이디/비밀번호 불일치

---

### 1.2 로그아웃
**POST** `/auth/logout`

**Headers**: `Authorization: Bearer <token>`

**Response (200)**
```json
{
  "success": true,
  "data": { "message": "로그아웃되었습니다." }
}
```

---

### 1.3 토큰 갱신
**POST** `/auth/refresh`

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

---

### 1.4 비밀번호 변경 (로그인 후)
**PUT** `/auth/me/password`

**Request**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": { "message": "비밀번호가 변경되었습니다." }
}
```

---

### 1.5 비밀번호 초기화 (대표 전용, 직원 계정 대상)
**POST** `/auth/users/:userId/reset-password`

**Request**
```json
{
  "newPassword": "temporaryPassword"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "message": "비밀번호가 초기화되었습니다.",
    "temporaryPassword": "temporaryPassword"
  }
}
```

---

### 1.6 내 정보 조회
**GET** `/auth/me`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "hong@company.com",
    "name": "홍길동",
    "email": "hong@company.com",
    "teamId": "team-uuid",
    "teamName": "마케팅팀",
    "role": "member",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 2. 팀 (Teams) — 대표 전용

### 2.1 팀 목록 조회
**GET** `/teams`

**Query**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | number | N | 페이지 (기본 1) |
| limit | number | N | 개수 (기본 50) |

**Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": "team-uuid",
      "name": "마케팅팀",
      "description": "마케팅 캠페인, 광고, SNS",
      "memberCount": 3,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 4, "totalPages": 1 }
}
```

---

### 2.2 팀 단건 조회
**GET** `/teams/:teamId`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "team-uuid",
    "name": "마케팅팀",
    "description": "마케팅 캠페인, 광고, SNS",
    "memberCount": 3,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2.3 팀 생성
**POST** `/teams`

**Request**
```json
{
  "name": "마케팅팀",
  "description": "마케팅 캠페인, 광고, SNS"
}
```

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "team-uuid",
    "name": "마케팅팀",
    "description": "마케팅 캠페인, 광고, SNS",
    "memberCount": 0,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2.4 팀 수정
**PUT** `/teams/:teamId`

**Request**
```json
{
  "name": "마케팅팀",
  "description": "마케팅·광고·SNS 담당"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "team-uuid",
    "name": "마케팅팀",
    "description": "마케팅·광고·SNS 담당",
    "memberCount": 3,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 2.5 팀 삭제
**DELETE** `/teams/:teamId`

**Response (200)**
```json
{
  "success": true,
  "data": { "message": "팀이 삭제되었습니다." }
}
```

---

## 3. 사용자 (Users) — 대표 전용

### 3.1 직원 목록 조회
**GET** `/users`

**Query**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| teamId | string | N | 팀 필터 |
| role | string | N | admin / member |
| page | number | N | 페이지 |
| limit | number | N | 개수 |
| q | string | N | 이름/이메일 검색 |

**Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "username": "hong@company.com",
      "name": "홍길동",
      "email": "hong@company.com",
      "teamId": "team-uuid",
      "teamName": "마케팅팀",
      "role": "member",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 11, "totalPages": 1 }
}
```

---

### 3.2 직원 단건 조회
**GET** `/users/:userId`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "hong@company.com",
    "name": "홍길동",
    "email": "hong@company.com",
    "teamId": "team-uuid",
    "teamName": "마케팅팀",
    "role": "member",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 3.3 직원 생성 (계정 발급)
**POST** `/users`

**Request**
```json
{
  "username": "hong@company.com",
  "password": "initialPassword",
  "name": "홍길동",
  "email": "hong@company.com",
  "teamId": "team-uuid",
  "role": "member"
}
```

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "hong@company.com",
    "name": "홍길동",
    "email": "hong@company.com",
    "teamId": "team-uuid",
    "teamName": "마케팅팀",
    "role": "member",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 3.4 직원 수정
**PUT** `/users/:userId`

**Request** (일부 필드만 보내도 됨)
```json
{
  "name": "홍길동",
  "email": "hong@company.com",
  "teamId": "team-uuid",
  "role": "member"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "username": "hong@company.com",
    "name": "홍길동",
    "email": "hong@company.com",
    "teamId": "team-uuid",
    "teamName": "마케팅팀",
    "role": "member",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 3.5 직원 삭제 (계정 비활성화)
**DELETE** `/users/:userId`

**Response (200)**
```json
{
  "success": true,
  "data": { "message": "직원 계정이 비활성화되었습니다." }
}
```

---

## 4. 일정/업무 (Events)

### 4.1 일정 목록 조회 (캘린더용)

**GET** `/events`

**권한**
- 대표: `userId`, `teamId` 없으면 전체; 있으면 해당 직원/팀만
- 팀원: 본인 일정만 (userId 무시)

**Query**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| start | string (ISO date) | Y | 조회 시작일 (예: 2025-02-01) |
| end | string (ISO date) | Y | 조회 종료일 (예: 2025-02-28) |
| userId | string | N | 담당자 필터 (대표만) |
| teamId | string | N | 팀 필터 (대표만) |
| includeAnnouncements | boolean | N | true 시 공지/회사일정 포함 (기본 true) |

**Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": "event-uuid",
      "title": "주간 마케팅 회의",
      "description": "주간 마케팅 일정 점검",
      "start": "2025-02-23T09:00:00.000Z",
      "end": "2025-02-23T10:00:00.000Z",
      "assigneeId": "user-uuid",
      "assigneeName": "홍길동",
      "teamId": "team-uuid",
      "teamName": "마케팅팀",
      "status": "in_progress",
      "priority": "normal",
      "recurrence": null,
      "remindAt": "2025-02-23T08:50:00.000Z",
      "isAnnouncement": false,
      "createdBy": "user-uuid",
      "createdAt": "2025-02-20T00:00:00.000Z"
    }
  ]
}
```

---

### 4.2 일정 단건 조회
**GET** `/events/:eventId`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "title": "주간 마케팅 회의",
    "description": "주간 마케팅 일정 점검",
    "start": "2025-02-23T09:00:00.000Z",
    "end": "2025-02-23T10:00:00.000Z",
    "assigneeId": "user-uuid",
    "assigneeName": "홍길동",
    "teamId": "team-uuid",
    "teamName": "마케팅팀",
    "status": "in_progress",
    "priority": "normal",
    "recurrence": null,
    "remindAt": "2025-02-23T08:50:00.000Z",
    "isAnnouncement": false,
    "createdBy": "user-uuid",
    "createdAt": "2025-02-20T00:00:00.000Z"
  }
}
```

---

### 4.3 일정 생성
**POST** `/events`

**Request**
```json
{
  "title": "주간 마케팅 회의",
  "description": "주간 마케팅 일정 점검",
  "start": "2025-02-23T09:00:00.000Z",
  "end": "2025-02-23T10:00:00.000Z",
  "assigneeId": "user-uuid",
  "teamId": "team-uuid",
  "status": "scheduled",
  "priority": "normal",
  "recurrence": null,
  "remindMinutesBefore": 10
}
```

- 팀원: `assigneeId`는 본인만 가능. `teamId`는 본인 팀.
- 대표: `assigneeId`/`teamId` 자유.

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "title": "주간 마케팅 회의",
    "start": "2025-02-23T09:00:00.000Z",
    "end": "2025-02-23T10:00:00.000Z",
    "assigneeId": "user-uuid",
    "teamId": "team-uuid",
    "status": "scheduled",
    "priority": "normal",
    "createdAt": "2025-02-20T00:00:00.000Z"
  }
}
```

---

### 4.4 일정 수정
**PUT** `/events/:eventId`

**Request** (수정할 필드만)
```json
{
  "title": "주간 마케팅 회의 (변경)",
  "start": "2025-02-23T10:00:00.000Z",
  "end": "2025-02-23T11:00:00.000Z",
  "status": "in_progress"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "title": "주간 마케팅 회의 (변경)",
    "start": "2025-02-23T10:00:00.000Z",
    "end": "2025-02-23T11:00:00.000Z",
    "status": "in_progress",
    "updatedAt": "2025-02-22T00:00:00.000Z"
  }
}
```

---

### 4.5 일정 삭제
**DELETE** `/events/:eventId`

**Response (200)**
```json
{
  "success": true,
  "data": { "message": "일정이 삭제되었습니다." }
}
```

---

### 4.6 일정 드래그(일시 변경)
**PATCH** `/events/:eventId/schedule`

**Request**
```json
{
  "start": "2025-02-24T09:00:00.000Z",
  "end": "2025-02-24T10:00:00.000Z"
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "start": "2025-02-24T09:00:00.000Z",
    "end": "2025-02-24T10:00:00.000Z"
  }
}
```

---

## 5. 할 일 (Tasks) — 일과 체크리스트

### 5.1 할 일 목록 조회
**GET** `/tasks`

**Query**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| date | string (ISO date) | Y | 해당 날짜 (예: 2025-02-23) |
| userId | string | N | 담당자 (대표만, 없으면 본인) |
| completed | boolean | N | true: 완료만, false: 미완료만 |

**Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-uuid",
      "title": "보고서 제출 마감",
      "dueDate": "2025-02-23",
      "completed": false,
      "assigneeId": "user-uuid",
      "assigneeName": "홍길동",
      "teamId": "team-uuid",
      "teamName": "마케팅팀",
      "createdAt": "2025-02-22T00:00:00.000Z"
    }
  ]
}
```

---

### 5.2 할 일 생성
**POST** `/tasks`

**Request**
```json
{
  "title": "보고서 제출 마감",
  "dueDate": "2025-02-23",
  "assigneeId": "user-uuid"
}
```
- 팀원: `assigneeId` 생략 시 본인.

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "title": "보고서 제출 마감",
    "dueDate": "2025-02-23",
    "completed": false,
    "assigneeId": "user-uuid",
    "createdAt": "2025-02-22T00:00:00.000Z"
  }
}
```

---

### 5.3 할 일 수정 (완료 토글 포함)
**PUT** `/tasks/:taskId`

**Request**
```json
{
  "title": "보고서 제출 마감 (수정)",
  "dueDate": "2025-02-24",
  "completed": true
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "title": "보고서 제출 마감 (수정)",
    "dueDate": "2025-02-24",
    "completed": true,
    "updatedAt": "2025-02-23T00:00:00.000Z"
  }
}
```

---

### 5.4 할 일 완료 토글
**PATCH** `/tasks/:taskId/complete`

**Request**
```json
{
  "completed": true
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "completed": true
  }
}
```

---

### 5.5 할 일 삭제
**DELETE** `/tasks/:taskId`

**Response (200)**
```json
{
  "success": true,
  "data": { "message": "할 일이 삭제되었습니다." }
}
```

---

## 6. 공지 / 회사 일정 (Announcements) — 대표 전용

### 6.1 공지 목록 조회
**GET** `/announcements`

**Query**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| start | string (ISO date) | N | 기간 시작 |
| end | string (ISO date) | N | 기간 끝 |
| type | string | N | notice / company_event |
| teamId | string | N | 대상 팀 |

**Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": "announcement-uuid",
      "type": "notice",
      "title": "2월 말 휴무일 안내",
      "content": "2/28(금) 임시 휴무입니다.",
      "targetType": "all",
      "targetTeamId": null,
      "eventDate": null,
      "createdBy": "user-uuid",
      "createdAt": "2025-02-20T00:00:00.000Z"
    },
    {
      "id": "announcement-uuid-2",
      "type": "company_event",
      "title": "전사 주간 회의",
      "content": "",
      "targetType": "all",
      "targetTeamId": null,
      "eventDate": "2025-02-24T10:00:00.000Z",
      "createdBy": "user-uuid",
      "createdAt": "2025-02-18T00:00:00.000Z"
    }
  ]
}
```

---

### 6.2 공지 생성
**POST** `/announcements`

**Request**
```json
{
  "type": "notice",
  "title": "2월 말 휴무일 안내",
  "content": "2/28(금) 임시 휴무입니다.",
  "targetType": "all",
  "targetTeamId": null,
  "eventDate": null
}
```
- `type`: `notice` | `company_event`
- `targetType`: `all` | `team`
- `company_event`일 때 `eventDate` 필수.

**Response (201)**
```json
{
  "success": true,
  "data": {
    "id": "announcement-uuid",
    "type": "notice",
    "title": "2월 말 휴무일 안내",
    "targetType": "all",
    "createdAt": "2025-02-20T00:00:00.000Z"
  }
}
```

---

### 6.3 공지 수정
**PUT** `/announcements/:announcementId`

**Request**: 생성과 동일 필드.

**Response (200)**
```json
{
  "success": true,
  "data": {
    "id": "announcement-uuid",
    "type": "notice",
    "title": "2월 말 휴무일 안내 (수정)",
    "updatedAt": "2025-02-21T00:00:00.000Z"
  }
}
```

---

### 6.4 공지 삭제
**DELETE** `/announcements/:announcementId`

**Response (200)**
```json
{
  "success": true,
  "data": { "message": "공지가 삭제되었습니다." }
}
```

---

## 7. 대시보드 (대표 전용)

### 7.1 대시보드 요약
**GET** `/dashboard/summary`

**Query**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| date | string (ISO date) | N | 기준일 (기본: 오늘) |

**Response (200)**
```json
{
  "success": true,
  "data": {
    "todayEventCount": 12,
    "weekEventCount": 45,
    "inProgressTaskCount": 28,
    "completionRate": 72,
    "byTeam": [
      {
        "teamId": "team-uuid",
        "teamName": "마케팅팀",
        "inProgressCount": 8,
        "completedCount": 20
      }
    ],
    "todayEvents": [
      {
        "id": "event-uuid",
        "title": "주간 마케팅 회의",
        "start": "2025-02-23T09:00:00.000Z",
        "assigneeName": "김마케",
        "teamName": "마케팅팀"
      }
    ],
    "recentAnnouncements": [
      {
        "id": "announcement-uuid",
        "title": "2월 말 휴무일 안내",
        "eventDate": "2025-02-28",
        "createdAt": "2025-02-20T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 8. 에러 코드 정리

| code | HTTP | 설명 |
|------|------|------|
| INVALID_REQUEST | 400 | 요청 body/query 유효성 실패 |
| UNAUTHORIZED | 401 | 토큰 없음/만료/잘못됨 |
| FORBIDDEN | 403 | 권한 없음 (팀원이 타인 일정 수정 등) |
| NOT_FOUND | 404 | 리소스 없음 |
| DUPLICATE_USERNAME | 409 | 아이디 중복 (회원가입/직원 생성) |
| INTERNAL_ERROR | 500 | 서버 오류 |

---

## 9. 권한 매트릭스 요약

| API | 대표 | 팀원 |
|-----|------|------|
| POST /auth/login | ○ | ○ |
| GET /auth/me, PUT /auth/me/password | ○ | ○ |
| POST /auth/users/:id/reset-password | ○ | × |
| GET/POST/PUT/DELETE /teams | ○ | × |
| GET/POST/PUT/DELETE /users | ○ | × |
| GET /events (전체/필터) | ○ | 본인만 |
| GET/POST/PUT/DELETE /events, PATCH /events/:id/schedule | ○ (전체) | 본인 일정만 |
| GET/POST/PUT/DELETE,PATCH /tasks | ○ (필터 가능) | 본인만 |
| GET/POST/PUT/DELETE /announcements | ○ | × (조회만 가능 시 별도 GET 공개) |
| GET /dashboard/summary | ○ | × |

팀원이 공지/회사일정을 캘린더에서 보려면, `GET /events`의 `includeAnnouncements=true`로 이미 포함되거나, 공지 전용 조회 API를 “읽기 전용”으로 열어주면 됩니다.
