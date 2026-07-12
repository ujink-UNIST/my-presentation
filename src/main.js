import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes';
import Highlight from 'reveal.js/plugin/highlight';
import Math from 'reveal.js/plugin/math';
import Markdown from 'reveal.js/plugin/markdown';

import 'reveal.js/reveal.css';
import 'reveal.js/plugin/highlight/monokai.css';
import './style.css';

import { initVolumeSlide, resizeVolumeSlide } from './slides/volume-render.js';
import { initPlotlySlide, resizePlotlySlide } from './slides/plotly-chart.js';

const deck = new Reveal({
  hash: true,
  width: '100%',
  height: '100%',
  margin: 0,
  minScale: 1,
  maxScale: 1,
  transition: 'fade',
  backgroundTransition: 'fade',
  plugins: [Markdown, Notes, Highlight, Math.KaTeX]
});

function injectSlideWordmarks() {
  document.querySelectorAll('.reveal .slides section:not(.title-slide)').forEach(slide => {
    if (slide.querySelector(':scope > .slide-wordmark')) return;

    const wordmark = document.createElement('img');
    wordmark.className = 'slide-wordmark';
    wordmark.src = '/assets/brand/wordmark.png';
    wordmark.alt = 'UNIST';
    wordmark.setAttribute('aria-hidden', 'true');
    slide.appendChild(wordmark);
  });
}

function initCurrentSlide(slide) {
  if (!slide) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (slide.id === 'volume-slide') initVolumeSlide();
      if (slide.id === 'plotly-slide') initPlotlySlide();
    });
  });
}

await deck.initialize();
injectSlideWordmarks();
initCurrentSlide(deck.getCurrentSlide());

deck.on('slidechanged', event => {
  initCurrentSlide(event.currentSlide);
});

window.addEventListener('resize', () => {
  resizeVolumeSlide();
  resizePlotlySlide();
});
