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

const isPrintPdfMode = new URLSearchParams(window.location.search).has('print-pdf');

const deck = new Reveal({
  hash: true,
  width: isPrintPdfMode ? 2560 : '100%',
  height: isPrintPdfMode ? 1440 : '100%',
  margin: 0,
  minScale: 1,
  maxScale: 1,
  transition: 'fade',
  backgroundTransition: 'fade',
  plugins: [Notes, Highlight, Math.KaTeX]
});

function applySlideLayout() {
  const allSlides = Array.from(document.querySelectorAll('.reveal .slides > section'));
  const totalSlides = allSlides.length;

  allSlides.filter(slide => !slide.classList.contains('title-slide')).forEach(slide => {
    if (slide.classList.contains('slide-layout')) return;

    const slideNumber = allSlides.indexOf(slide) + 1;
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
    footer.innerHTML = `<img class="slide-wordmark" src="./assets/brand/wordmark.png" alt="UNIST" /><span class="slide-number">${String(slideNumber).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}</span>`;

    slide.replaceChildren(header, body, footer);
    slide.classList.add('slide-layout');
  });
}

function initSlideVisuals(slide) {
  if (!slide) return Promise.resolve();

  const tasks = [];
  if (slide.querySelector('#volume-container')) tasks.push(initVolumeSlide());
  if (slide.querySelector('#lattice-container')) tasks.push(initLatticeSlide());
  if (slide.querySelector('#seat-apsd-container')) tasks.push(initSeatApsdSlide());
  if (slide.querySelector('#plotly-scaling-container, #plotly-exponent-container')) tasks.push(initPlotlySlide());
  if (slide.querySelector('#stiffness-heatmap-container')) tasks.push(initStiffnessHeatmapSlide());

  return Promise.allSettled(tasks);
}

function initCurrentSlide(slide) {
  if (!slide) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initSlideVisuals(slide);
    });
  });
}

await deck.initialize();
if (isPrintPdfMode) {
  await Promise.allSettled(Array.from(document.querySelectorAll('.reveal .slides > section')).map(initSlideVisuals));
  resizeCurrentVisualizations();
} else {
  initCurrentSlide(deck.getCurrentSlide());
}

window.__presentationReady = true;

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
