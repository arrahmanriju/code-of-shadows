import { readBrandSvg } from '@/lib/brand';

export function GET() {
  // Preserve the source paths; the golden background keeps black artwork
  // legible in both light and dark browser chrome.
  const svg = readBrandSvg().replace(/(<svg\b[^>]*>)/,'$1<rect width="100%" height="100%" fill="#e8bf69"/>');
  return new Response(svg,{headers:{
    'Content-Type':'image/svg+xml',
    'Cache-Control':'public, max-age=0, must-revalidate',
  }});
}
