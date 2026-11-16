import records from '@/data/knowledge.json';
import { projects } from '@/data/projects';
import { contactEmail, socials } from '@/data/profile';
import type { KnowledgeDocument } from './types';

// Reuse the same project facts and links displayed by the city panels.
export const knowledge: KnowledgeDocument[] = [
  ...records,
  ...projects.map(project => ({
    id: project.id, title: project.title, category: project.type,
    content: `${project.description} Technologies: ${project.technologies.join(', ')}. ${project.details.join(' ')}`,
    sourceUrl: project.githubUrl ?? project.liveUrl ?? undefined,
    keywords: project.id === 'dhaka-tesla-pool' ? ['ঢাকা', 'টেসলা', 'রাইড'] :
      project.id === 'student-placement-prediction' ? ['প্লেসমেন্ট', 'placement'] :
      project.id === 'mental-health-prediction' ? ['মানসিক', 'mental'] :
      project.id === 'tiredness-alertness' ? ['dataset', 'ডেটাসেট', 'ক্লান্তি'] : [],
  })),
  { id: 'contact', title: 'Contact information', category: 'contact',
    content: `Professional email: ${contactEmail}. Social profiles: ${socials.map(s => `${s.name}: ${s.url}`).join('; ')}.`,
    keywords: ['contact', 'email', 'social', 'github', 'linkedin', 'leetcode', 'যোগাযোগ', 'ইমেইল', 'গিটহাব'],
    sourceUrl: `mailto:${contactEmail}` },
];
