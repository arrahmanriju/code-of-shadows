'use client';

import Image from 'next/image';
import './BatMark.css';

/** Use the same supplied SVG as the sky signal, without tracing its paths. */
export default function BatMark({logoUrl}:{logoUrl:string}) {
  return <Image className="brand-mark" src={logoUrl} alt="" width={60} height={60} unoptimized loading="eager" draggable={false}/>;
}
