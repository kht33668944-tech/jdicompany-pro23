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
      <section>
        <ProjectCards
          teamId={teamId}
          canCreate={canCreateProject}
          onCreateClick={() => setCreateProjectOpen(true)}
          refreshKey={projectRefreshKey}
        />
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <TeamScheduleCard teamId={teamId} topTasks={5} />
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
