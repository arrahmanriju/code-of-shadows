import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

// Exercise actual TSX components without adding a second application bundler.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const modules = new Map();
function loadSource(filename) {
  if (!modules.has(filename)) {
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    function localRequire(specifier) {
      if(specifier.endsWith('.css')) return {};
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return require(specifier);
      const base = specifier.startsWith('@/') ? resolve(root, specifier.slice(2)) : resolve(dirname(filename), specifier);
      const path = ['.tsx', '.ts'].map(ext => base + ext).find(existsSync);
      if (!path) throw new Error(`Cannot resolve ${specifier}`);
      return loadSource(path);
    }
    new Function('require', 'module', 'exports', outputText)(localRequire, loadedModule, loadedModule.exports);
  }
  return modules.get(filename).exports;
}
const ProjectCards = loadSource(resolve(root, 'components/ProjectCards.tsx')).default;
const ContactPanel = loadSource(resolve(root, 'components/ContactPanel.tsx')).default;
const ResumeAction = loadSource(resolve(root, 'components/ResumeAction.tsx')).default;
const BatMark = loadSource(resolve(root, 'components/BatMark.tsx')).default;
const AudioControl = loadSource(resolve(root, 'components/AudioControl.tsx')).default;
const WeatherControl = loadSource(resolve(root, 'components/WeatherControl.tsx')).default;
const {brandLogoUrl,brandVersion,readBrandSvg}=loadSource(resolve(root,'lib/brand.ts'));
const {GET:getFavicon}=loadSource(resolve(root,'app/favicon.svg/route.ts'));
const { projects } = loadSource(resolve(root, 'data/projects.ts'));
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test('all projects have details and only verified code/demo actions are rendered', () => {
  const html = render(ProjectCards, { type: 'software' }) + render(ProjectCards, { type: 'research' });
  assert.equal([...html.matchAll(/<summary\b/g)].length, projects.length);
  assert.equal([...html.matchAll(/aria-label="View code for /g)].length, 4);
  assert.equal([...html.matchAll(/aria-label="Live demo of /g)].length, 2);
  for (const anchor of html.matchAll(/<a\b[^>]*>/g)) {
    assert.match(anchor[0], /target="_blank"/);
    assert.match(anchor[0], /rel="noopener noreferrer"/);
    assert.doesNotMatch(anchor[0], /href="https:\/\/github.com\/arrahmanriju"/);
  }
  const research = render(ProjectCards, { type: 'research' });
  assert.doesNotMatch(research, /aria-label="View code for Mental Health Prediction/);
  assert.doesNotMatch(research, /aria-label="View code for Tiredness and Alertness Dataset/);
});

test('project button clicks and pointer presses cannot bubble to the city', () => {
  let stopped = 0;
  const event = { stopPropagation() { stopped++; } };
  for (const card of ProjectCards({ type: 'software' })) {
    card.props.onClick(event);
    card.props.onPointerDown(event);
  }
  assert.equal(stopped, 6);
});

test('contact has the correct email action and all four supplied profiles', () => {
  const html = render(ContactPanel, { resumeUrl: null });
  assert.match(html, /href="mailto:arrahman152004@gmail.com"/);
  assert.match(html, /Send Email/);
  for (const host of ['github.com', 'linkedin.com', 'codeforces.com', 'leetcode.com']) {
    assert.ok(html.includes(host));
  }
  assert.match(html, /Résumé PDF is not available yet/);
  assert.doesNotMatch(html, /href="\/resume(?:\.pdf)?"/);
});

test('both résumé actions are disabled when the PDF is unavailable', () => {
  const unavailable = render(ResumeAction, { url: null });
  assert.equal([...unavailable.matchAll(/<button[^>]*disabled/g)].length, 2);
  assert.match(unavailable, /View Résumé/);
  assert.match(unavailable, /Download Résumé/);
  assert.match(unavailable, /public\/resume.pdf/);
  assert.doesNotMatch(unavailable, /<a\b/);
});

test('view opens a protected new tab and download uses a separate download link', () => {
  const available = render(ResumeAction, { url: '/resume.pdf' });
  const anchors = [...available.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
  assert.equal(anchors.length, 2);
  const [view, download] = anchors;
  assert.match(view, /href="\/resume.pdf"/);
  assert.match(view, /target="_blank"/);
  assert.match(view, /rel="noopener noreferrer"/);
  assert.doesNotMatch(view, /\sdownload(?:=|\s|>)/);
  assert.match(download, /href="\/resume.pdf"/);
  assert.match(download, /download="Azizur-Rahman-Resume.pdf"/);
  assert.doesNotMatch(download, /target=/);
});

test('the building contact panel renders both actions and keeps the compact header shortcut', () => {
  const contact = render(ContactPanel, { resumeUrl: '/resume.pdf' });
  assert.match(contact, /View Résumé/);
  assert.match(contact, /Download Résumé/);
  assert.doesNotMatch(contact, /PDF is not available yet/);
  const compact = render(ResumeAction, { url: '/resume.pdf', compact: true });
  assert.equal([...compact.matchAll(/<a\b/g)].length, 1);
  assert.match(compact, /download="Azizur-Rahman-Resume.pdf"/);
});

test('header uses the versioned supplied SVG and favicon preserves its paths', async () => {
  const url=brandLogoUrl();
  assert.equal(url,`/bat-logo.svg?v=${brandVersion()}`);
  const header=render(BatMark,{logoUrl:url});
  assert.ok(header.includes(`src="${url}"`));
  assert.match(header,/<img\b/);
  assert.doesNotMatch(header,/<svg\b|<circle\b|<path\b|<image\b/);
  assert.doesNotMatch(header,/_next\/image/);
  const response=getFavicon();
  assert.equal(response.headers.get('content-type'),'image/svg+xml');
  const favicon=await response.text();
  assert.deepEqual(favicon.match(/<path\b[^>]*>/g),readBrandSvg().match(/<path\b[^>]*>/g));
  assert.match(favicon,/<rect[^>]*fill="#e8bf69"/);
});

test('missing background audio renders a helpful disabled controller', () => {
  const html=render(AudioControl,{url:null});
  assert.match(html,/Background music unavailable/);
  assert.match(html,/public\/audio\/background\.mp3/);
  assert.match(html,/<button[^>]*disabled/);
  assert.match(html,/<input[^>]*disabled/);
  assert.doesNotMatch(html,/<audio\b/);
});

test('available background audio is paused by default and configured to loop', () => {
  const html=render(AudioControl,{url:'/audio/background.mp3'});
  const audio=html.match(/<audio[^>]*>/)?.[0]??'';
  assert.match(audio,/loop=""/);
  assert.match(audio,/src="\/audio\/background\.mp3"/);
  assert.doesNotMatch(html,/autoplay/);
  assert.match(html,/aria-label="Play background music"/);
  assert.match(html,/type="range"/);
  assert.doesNotMatch(html,/<button[^>]*disabled/);
});

test('tower numbering is absent from every presentation layer', () => {
  const city=readFileSync(resolve(root,'components/City.tsx'),'utf8');
  const explorer=readFileSync(resolve(root,'components/Explorer.tsx'),'utf8');
  const labels=readFileSync(resolve(root,'components/CityLabels.css'),'utf8');
  assert.doesNotMatch(city,/<span>0\{index\+1\}<\/span>/);
  assert.doesNotMatch(explorer,/0\{i\+1\}|DISTRICT 0\{/);
  assert.match(explorer,/CODE OF SHADOWS \/ \{active\.name\.toUpperCase\(\)\}/);
  assert.match(labels,/text-align:\s*center/);
});

test('weather controller exposes all modes and accessible effect toggles', () => {
  const html=render(WeatherControl,{settings:{mode:'rainy',fog:true,lightning:true},onChange(){}});
  for(const label of ['Rainy Night','Thunderstorm','Clear Night'])assert.match(html,new RegExp(label));
  assert.match(html,/aria-label="Weather controls\. Current mode: Rainy Night"/);
  assert.match(html,/>Fog</);
  assert.match(html,/>Lightning</);
  assert.equal([...html.matchAll(/aria-pressed=/g)].length,3);
});
