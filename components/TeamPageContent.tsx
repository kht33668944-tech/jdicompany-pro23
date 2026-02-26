"use client";

import { useState } from "react";
import ProjectCards from "./ProjectCards";
import CreateProjectModal from "./CreateProjectModal";
import TeamTimeline from "./TeamTimeline";
import TeamKanban from "./TeamKanban";

export default function TeamPageContent({
  teamId,
  teamName,
  canCreateProject,
}: {
  teamId: string;
  teamName: string;
  canCreateProject: boolean;
}) {
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* 1. 상단: 팀 일정·연차 타임라인 (Simplified Calendar List) */}
      <section className="w-full min-w-0">
        <TeamTimeline teamId={teamId} />
      </section>

      {/* 2. 중앙: 프로젝트 및 업무 현황 */}
      <section className="w-full min-w-0">
        <ProjectCards
          teamId={teamId}
          canCreate={canCreateProject}
          onCreateClick={() => setCreateProjectOpen(true)}
          refreshKey={projectRefreshKey}
        />
      </section>

      <section className="w-full min-w-0">
        <TeamKanban teamId={teamId} teamName={teamName} />
      </section>

      {createProjectOpen && (
        <CreateProjectModal
          teamId={teamId}
          teamName={teamName}
          onClose={() => setCreateProjectOpen(false)}
          onCreated={() => {
            setProjectRefreshKey((k) => k + 1);
            setCreateProjectOpen(false);
          }}
        />
      )}
    </div>
  );
}
