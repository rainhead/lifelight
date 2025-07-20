import { html, nothing, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { ObservationFeatureProperties } from "./inaturalist";
import { FeatureLike } from "ol/Feature";

const sheet = document.getElementById('sheet') as HTMLDivElement;
const handle = document.getElementById('handle') as HTMLDivElement;
const info = document.getElementById('info') as HTMLElement;

const resizeBy = (adjustment: number) => {
  const maxHeight = document.documentElement.clientHeight * 0.8;
  const height = Math.min(maxHeight, Math.max(0, info.clientHeight + adjustment));
  console.debug(`resizing to ${height}`);
  if (height > 0)
    info.style.height = `${height}px`;
  else
    info.style.height = '';
}

export function handleSheet() {
  let lastY = 0;
  const handleMove = (mouseMove: MouseEvent) => {
    const offset = lastY - mouseMove.clientY;
    resizeBy(offset);
    lastY = mouseMove.clientY;
  };
  handle.addEventListener('mousedown', (mousedown) => {
    if (mousedown.button !== 0)
      return;
    lastY = mousedown.clientY;
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', handleMove);
    });
  });
}

export function setFeatures(features: FeatureLike[]) {
  if (features.length === 0) {
    info.style.height = '';
    render(nothing, info);
  }

  const template = html`
    <ul>
      ${repeat(features, f => f.getId(), f => {
        const props = f.getProperties() as ObservationFeatureProperties;
        return html`
            <li><a href=${props.uri} target="_new">${props.name ?? props.id}</a></li>
        `;
          })}
    </ul>
  `;
  render(template, info);
}
