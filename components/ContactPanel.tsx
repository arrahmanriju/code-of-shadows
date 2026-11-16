import { ArrowUpRight, Code2, Github, Linkedin, Mail } from 'lucide-react';
import { contactEmail, socials } from '@/data/profile';
import ResumeAction from './ResumeAction';

export default function ContactPanel({ resumeUrl }: { resumeUrl: string | null }) {
  return <>
    <p className="lead">Let’s build<br/>something meaningful.</p>
    <p>Have an opportunity or a project in mind? Send me an email or connect through my profiles.</p>
    <a className="contact-email" href={`mailto:${contactEmail}`}><Mail size={18} aria-hidden="true"/>{contactEmail}</a>
    <a className="action-button email-button" href={`mailto:${contactEmail}`}><Mail size={16} aria-hidden="true"/> Send Email <ArrowUpRight size={15} aria-hidden="true"/></a>
    <div className="contact-socials">
      {socials.map(social => {
        const Icon = social.name === 'GitHub' ? Github : social.name === 'LinkedIn' ? Linkedin : Code2;
        return <a className="social-link" key={social.name} href={social.url} target="_blank" rel="noopener noreferrer">
          <span><Icon size={18} aria-hidden="true"/>{social.name}</span><ArrowUpRight size={18} aria-hidden="true"/>
        </a>;
      })}
    </div>
    <ResumeAction url={resumeUrl}/>
    {!resumeUrl && <p className="resume-status">Résumé PDF is not available yet. Place your actual PDF at <code>public/resume.pdf</code> and rebuild the site to enable viewing and downloading.</p>}
    <div className="callout">Dhaka, Bangladesh · AI/ML & Software Development</div>
  </>;
}
