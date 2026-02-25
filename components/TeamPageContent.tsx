"use client";

import { useState } from "react";
import ProjectCards from "./ProjectCards";
import CreateProjectModal from "./CreateProjectModal";
import TeamScheduleCard from "./TeamScheduleCard";
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
    <div className="space-y-8">
      {/* 이번 주 일정 블록 (같은 페이지 내 상단) */}
      <section>
        <TeamScheduleCard teamId={teamId} topTasks={5} />
      </section>

      <section>
        <ProjectCards
          teamId={teamId}
          canCreate={canCreateProject}
          onCreateClick={() => setCreateProjectOpen(true)}
          refreshKey={projectRefreshKey}
        />
      </section>

      <section>
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
