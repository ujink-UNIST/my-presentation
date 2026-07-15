import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes';
import Highlight from 'reveal.js/plugin/highlight';
import Math from 'reveal.js/plugin/math';

import 'reveal.js/reveal.css';
import 'reveal.js/plugin/highlight/monokai.css';
import './style.css';

import { initVolumeSlide, resizeVolumeSlide } from './slides/volume-render.js';
import { initLatticeSlide, resizeLatticeSlide } from './slides/lattice-render.js';
import { initPlotlySlide, initSeatApsdSlide, initStiffnessHeatmapSlide, resizePlotlySlide } from './slides/plotly-chart.js';

const slideModules = import.meta.glob('./slides-html/*.html', {
  query: '?raw',
  import: 'default',
  eager: true
});

function loadSlides() {
  const slidesRoot = document.querySelector('#slides-root');
  if (!slidesRoot) return;

  Object.keys(slideModules)
    .sort()
    .forEach(path => {
      slidesRoot.insertAdjacentHTML('beforeend', slideModules[path]);
    });
}

loadSlides();
applySlideLayout();

const deck = new Reveal({
  hash: true,
  width: '100%',
  height: '100%',
  margin: 0,
  minScale: 1,
  maxScale: 1,
  transition: 'fade',
  backgroundTransition: 'fade',
  plugins: [Notes, Highlight, Math.KaTeX]
});

function applySlideLayout() {
  document.querySelectorAll('.reveal .slides > section:not(.title-slide)').forEach(slide => {
    if (slide.classList.contains('slide-layout')) return;

    const children = Array.from(slide.childNodes);
    const headerNodes = [];
    const bodyNodes = [];

    children.forEach(node => {
      if (
        headerNodes.length === 0
        && node.nodeType === Node.ELEMENT_NODE
        && ['H1', 'H2'].includes(node.tagName)
      ) {
        headerNodes.push(node);
      } else {
        bodyNodes.push(node);
      }
    });

    const header = document.createElement('header');
    header.className = 'slide-header';
    headerNodes.forEach(node => header.appendChild(node));

    const body = document.createElement('main');
    body.className = 'slide-body';
    bodyNodes.forEach(node => body.appendChild(node));

    const footer = document.createElement('footer');
    footer.className = 'slide-footer';
    footer.innerHTML = '<img class="slide-wordmark" src="./assets/brand/wordmark.png" alt="UNIST" />';

    slide.replaceChildren(header, body, footer);
    slide.classList.add('slide-layout');
  });
}

function initCurrentSlide(slide) {
  if (!slide) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (slide.querySelector('#volume-container')) initVolumeSlide();
      if (slide.querySelector('#lattice-container')) initLatticeSlide();
      if (slide.querySelector('#seat-apsd-container')) initSeatApsdSlide();
      if (slide.querySelector('#plotly-scaling-container, #plotly-exponent-container')) initPlotlySlide();
      if (slide.querySelector('#stiffness-heatmap-container')) initStiffnessHeatmapSlide();
    });
  });
}

await deck.initialize();
initCurrentSlide(deck.getCurrentSlide());

deck.on('slidechanged', event => {
  initCurrentSlide(event.currentSlide);
});

function resizeCurrentVisualizations() {
  resizeVolumeSlide();
  resizeLatticeSlide();
  resizePlotlySlide();
}

window.addEventListener('resize', () => {
  requestAnimationFrame(resizeCurrentVisualizations);
});

const visualizationResizeObserver = new ResizeObserver(() => {
  requestAnimationFrame(resizeCurrentVisualizations);
});

document.querySelectorAll('.visualization-container').forEach(container => {
  visualizationResizeObserver.observe(container);
});
