import Explorer from '@/components/Explorer';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { brandLogoUrl } from '@/lib/brand';

export default function Home() {
  const resumePath = join(process.cwd(), 'public', 'resume.pdf');
  const resumeUrl = existsSync(resumePath) && statSync(resumePath).isFile() ? '/resume.pdf' : null;
  const audioPath = join(process.cwd(), 'public', 'audio', 'background.mp3');
  const audioUrl = existsSync(audioPath) && statSync(audioPath).isFile() ? '/audio/background.mp3' : null;
  return <Explorer resumeUrl={resumeUrl} logoUrl={brandLogoUrl()} audioUrl={audioUrl}/>;
}

