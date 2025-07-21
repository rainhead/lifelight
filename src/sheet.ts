import { html, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { FeatureLike } from "ol/Feature";
import { HydratedObservation } from "./db";

const handle = document.getElementById('handle') as HTMLDivElement;
const summary = document.querySelector('summary') as HTMLElement;
const info = document.querySelector('.collapsible') as HTMLElement;

export function handleSheet() {
  let initialY = 0;
  setFeatures([]);
  const onMove = (move: PointerEvent) => {
    const offset = initialY - move.clientY;
    if (offset >= 0)
      info.style.height = `${offset}px`;
  };
  const onUp = (_up: PointerEvent) => {
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
  };
  handle.addEventListener('pointerdown', (down: PointerEvent) => {
    if (down.button !== 0)
      return;
    handle.setPointerCapture(down.pointerId);
    initialY = info.getBoundingClientRect().height + down.clientY;
    handle.addEventListener('pointermove', onMove, false);
    handle.addEventListener('pointerup', onUp, false);
  }, false);
}

export function setFeatures(features: FeatureLike[]) {
  summary.innerText = `${features.length} observations.`;

  const template = repeat(features, f => f.getId(), f => {
    const props = f.getProperties() as HydratedObservation;
    return html`
      <li><a href=${props.uri} target="_new">${props.taxon?.scientificName ?? 'Unknown'}</a></li>
    `;
  });
  render(template, info);
}

export function ensureExpanded() {
  if (info.getBoundingClientRect().height < 20)
    info.style.height = '100px';
}
