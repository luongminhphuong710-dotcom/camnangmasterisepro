import Link from "next/link";
import { projects, stores, type Project } from "@/lib/data";
import { regionLabel } from "@/lib/helpers";

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const projectStores = stores.filter((store) => store.projectId === project.id);

  return (
    <article className="project-card">
      <figure>
        <img src={project.image} alt={project.name} loading="lazy" />
      </figure>
      <div className="project-body">
        <div>
          <span className="eyebrow mb-1 block">
            {regionLabel(project.region)} / {project.city}
          </span>
          <h3 className="h3">{project.name}</h3>
        </div>
        <p className="body-text text-sm">{project.summary}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="tag">{project.segment}</span>
          <span className="tag">{project.status}</span>
          <span className="tag">{projectStores.length} gian hàng</span>
        </div>
        <div className="action-row">
          <Link className="primary-button" href={`/projects/${project.id}`}>
            Thông tin
          </Link>
          <Link className="secondary-button" href={`/stores?project=${project.id}`}>
            Gian hàng
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProjectPreviewGrid() {
  return (
    <div className="project-grid">
      {projects.slice(0, 6).map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
