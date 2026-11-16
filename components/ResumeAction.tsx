import { Download, Eye } from 'lucide-react';

export default function ResumeAction({ url, compact = false }: { url: string | null; compact?: boolean }) {
  const unavailableMessage = 'Résumé PDF unavailable. Place your actual PDF at public/resume.pdf and rebuild the site.';
  if (compact) return url ? (
    <a className="resume" href={url} download="Azizur-Rahman-Resume.pdf">
      <Download size={15} aria-hidden="true"/> Download Résumé
    </a>
  ) : (
    <button className="resume" disabled title={unavailableMessage}>
      <Download size={15} aria-hidden="true"/> RÉSUMÉ UNAVAILABLE
    </button>
  );

  return <div className="resume-actions" role="group" aria-label="Résumé actions">
    {url ? <>
      <a className="action-button resume-view" href={url} target="_blank" rel="noopener noreferrer">
        <Eye size={16} aria-hidden="true"/> View Résumé
      </a>
      <a className="action-button resume-download" href={url} download="Azizur-Rahman-Resume.pdf">
        <Download size={16} aria-hidden="true"/> Download Résumé
      </a>
    </> : <>
      <button className="action-button resume-view" disabled title={unavailableMessage}>
        <Eye size={16} aria-hidden="true"/> View Résumé
      </button>
      <button className="action-button resume-download" disabled title={unavailableMessage}>
        <Download size={16} aria-hidden="true"/> Download Résumé
      </button>
    </>}
  </div>;
}
