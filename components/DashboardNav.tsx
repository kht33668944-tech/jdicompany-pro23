"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  Activity,
  Calendar,
  Megaphone,
  User,
  Building2,
  Clock,
  Settings,
  ChevronDown,
  Menu,
  LogOut,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  username: string;
  role: string;
  teamId: string | null;
  teamName: string | null;
};

type NavLinkProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
};

function NavLink({ href, label, icon, onClick, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:text-white hover:bg-white/5"
      }`}
      title={label}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

type SidebarContentProps = {
  onNavigate?: () => void;
};

export default function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const isCEO = user.role === "CEO";

  const closeSidebar = () => setMenuOpen(false);

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    if (path === "/teams" && user.teamId)
      return pathname === `/teams/${user.teamId}`;
    return pathname.startsWith(path);
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  function SidebarContent(props: SidebarContentProps) {
    const onNavigate = props?.onNavigate ?? undefined;

    return (
      <>
        <div className="p-4 border-b border-white/10">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-2 font-semibold text-white text-lg"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              업무
            </span>
            <span className="truncate">JDICOMPANY</span>
          </Link>
        </div>
        <nav className="flex flex-col flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLink
            href="/dashboard"
            label="대시보드"
            icon={<LayoutDashboard className="w-5 h-5" />}
            onClick={onNavigate}
            active={isActive("/dashboard")}
          />
          {(isCEO || user.role === "TEAM_LEADER") && (
            <NavLink
              href="/members"
              label="직원관리"
              icon={<Users className="w-5 h-5" />}
              onClick={onNavigate}
              active={pathname.startsWith("/members")}
            />
          )}
          {isCEO && (
            <>
              <NavLink
                href="/approval"
                label="승인"
                icon={<CheckCircle className="w-5 h-5" />}
                onClick={onNavigate}
                active={pathname.startsWith("/approval")}
              />
              <NavLink
                href="/activity"
                label="활동 로그"
                icon={<Activity className="w-5 h-5" />}
                onClick={onNavigate}
                active={pathname.startsWith("/activity")}
              />
            </>
          )}
          <NavLink
            href="/calendar"
            label="캘린더"
            icon={<Calendar className="w-5 h-5" />}
            onClick={onNavigate}
            active={pathname.startsWith("/calendar")}
          />
          <NavLink
            href="/announcements"
            label="공지"
            icon={<Megaphone className="w-5 h-5" />}
            onClick={onNavigate}
            active={pathname.startsWith("/announcements")}
          />
          <NavLink
            href="/me"
            label="내 업무"
            icon={<User className="w-5 h-5" />}
            onClick={onNavigate}
            active={pathname.startsWith("/me")}
          />
          <NavLink
            href={user.teamId ? `/teams/${user.teamId}` : "/teams"}
            label="팀"
            icon={<Building2 className="w-5 h-5" />}
            onClick={onNavigate}
            active={pathname.startsWith("/teams")}
          />
          {isCEO && (
            <NavLink
              href="/attendance"
              label="출퇴근 현황"
              icon={<Clock className="w-5 h-5" />}
              onClick={onNavigate}
              active={pathname.startsWith("/attendance")}
            />
          )}
          <NavLink
            href="/settings"
            label="설정"
            icon={<Settings className="w-5 h-5" />}
            onClick={onNavigate}
            active={pathname.startsWith("/settings")}
          />
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left"
            >
              <span className="w-8 h-8 rounded-full bg-slate-500 flex-shrink-0 flex items-center justify-center text-white text-sm font-medium">
                {user.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-white truncate block">
                  {user.name}
                </span>
                <span className="text-xs text-slate-400 truncate block">
                  {isCEO
                    ? "대표"
                    : user.role === "TEAM_LEADER"
                      ? "팀장"
                      : (user.teamName ?? "-")}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
            {userDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 bottom-full mb-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl py-1 z-20">
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    설정
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  const sidebarClass = "bg-slate-800 flex flex-col z-20";
  const mobileSidebarClass = "bg-slate-800 flex flex-col z-50";

  return (
    <>
      {/* 모바일: 상단 바 + 햄버거 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-800 border-b border-white/10 z-30 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="p-2 rounded-lg hover:bg-white/10 text-white"
          aria-label="메뉴 열기"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/dashboard" className="font-semibold text-white">
          업무관리
        </Link>
        <div className="w-10" />
      </div>

      {/* 모바일: 사이드바 오버레이 */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeSidebar}
            aria-hidden
          />
          <aside
            className={`fixed top-0 left-0 bottom-0 w-64 ${mobileSidebarClass} md:hidden`}
            role="dialog"
            aria-label="메뉴"
          >
            <SidebarContent onNavigate={closeSidebar} />
          </aside>
        </>
      )}

      {/* 데스크톱: 고정 사이드바 */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 bottom-0 w-64 ${sidebarClass}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
