import Link from "next/link";
import Image from "next/image";
import { Info, Store } from "lucide-react";
import { projects, stores, type Project } from "@/lib/data";
import { regionLabel } from "@/lib/helpers";

type ProjectCardProps = {
  project: Project;
};

export function ProjectCard({ project }: ProjectCardProps) {
  const projectStores = stores.filter((store) => store.projectId === project.id);

  return (
    <article className="project-card relative flex h-full cursor-pointer flex-col transition hover:shadow-masterise">
      <Link
        className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-masterise-primary focus-visible:ring-offset-2"
        href={`/projects/${project.id}`}
        aria-label={`Xem thông tin chi tiết ${project.name}`}
      />
      <figure>
        <Image src={project.image} alt={project.name} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
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
        <div className="action-row mt-auto">
          <Link className="primary-button relative z-20" href={`/projects/${project.id}`}>
            <Info size={18} aria-hidden />
            Thông tin
          </Link>
          <Link className="secondary-button relative z-20" href={`/stores?project=${project.id}`}>
            <Store size={18} aria-hidden />
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
