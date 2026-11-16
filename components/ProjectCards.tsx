'use client';

import { ArrowUpRight, ChevronDown, Code2, Globe } from 'lucide-react';
import { projects, type Project } from '@/data/projects';

export default function ProjectCards({ type }: { type: Project['type'] }) {
  return projects.filter(project => project.type === type).map((project, index) => (
    <article className="project" key={project.id} onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
      <span>0{index + 1} / {type === 'software' ? 'SOFTWARE' : 'RESEARCH'}</span>
      <h3>{project.title}</h3>
      <p className="project-description">{project.description}</p>
      <p className="project-technologies">{project.technologies.join(' · ')}</p>
      <details className="project-details">
        <summary className="action-button" aria-label={`View details for ${project.title}`}>View Details <ChevronDown size={15} aria-hidden="true"/></summary>
        <div className="project-detail-content">
          <ul>{project.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
        </div>
      </details>
      {(project.githubUrl || project.liveUrl) && <div className="project-actions">
        {project.githubUrl && <a className="action-button" href={project.githubUrl} target="_blank" rel="noopener noreferrer" aria-label={`View code for ${project.title}`}>
          <Code2 size={15} aria-hidden="true"/> View Code <ArrowUpRight size={13} aria-hidden="true"/>
        </a>}
        {project.liveUrl && <a className="action-button" href={project.liveUrl} target="_blank" rel="noopener noreferrer" aria-label={`Live demo of ${project.title}`}>
          <Globe size={15} aria-hidden="true"/> Live Demo <ArrowUpRight size={13} aria-hidden="true"/>
        </a>}
      </div>}
    </article>
  ));
}
