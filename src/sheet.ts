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
  render(html`${features.length} observations. <button type="button" name="reload">Reload</button>`, summary);

  const template = repeat(features, f => f.getId(), f => {
    const props = f.getProperties() as HydratedObservation;
    const observedAt = props.observedAt ? smartDateFormat(new Date(props.observedAt)) : '';
    return html`
      <li><a href=${props.uri} target="_new">${props.taxon?.scientificName ?? 'Unknown'}</a> ${observedAt}</li>
    `;
  });
  render(template, info);
}

export function ensureExpanded() {
  if (info.getBoundingClientRect().height < 20)
    info.style.height = '100px';
}

function smartDateFormat(date: Date) {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  // Very recent (under 1 hour)
  if (diffInMinutes < 60) {
    if (diffInMinutes < 1) return 'just now';
    return `${diffInMinutes}m ago`;
  }

  // Today (under 24 hours)
  if (diffInHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // This week
  if (diffInDays < 7) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
      .format(-diffInDays, 'day');
  }

  // This year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en', {
      month: 'short',
      day: 'numeric'
    });
  }

  // Previous years
  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
