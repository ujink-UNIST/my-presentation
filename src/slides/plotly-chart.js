import Plotly from 'plotly.js-dist-min';

let initialized = false;

function getContainer() {
  return document.querySelector('#plotly-container');
}

export function initPlotlySlide() {
  const container = getContainer();
  if (!container) return;

  const traces = [
    {
      x: [0, 1, 2, 3, 4, 5],
      y: [0, 1.3, 2.1, 3.8, 4.2, 5.1],
      mode: 'lines+markers',
      type: 'scatter',
      name: 'simulation',
      line: { color: '#2563eb', width: 3 },
      marker: { size: 9 }
    },
    {
      x: [0, 1, 2, 3, 4, 5],
      y: [0, 1, 2, 3, 4, 5],
      mode: 'lines',
      type: 'scatter',
      name: 'reference',
      line: { color: '#ef4444', width: 2, dash: 'dash' }
    }
  ];

  const layout = {
    title: { text: '예시 결과 그래프' },
    margin: { l: 60, r: 30, t: 70, b: 55 },
    xaxis: { title: { text: 'Step' } },
    yaxis: { title: { text: 'Value' } },
    legend: { orientation: 'h' },
    autosize: true
  };

  const config = {
    responsive: true,
    displaylogo: false
  };

  if (initialized) {
    Plotly.react(container, traces, layout, config);
  } else {
    Plotly.newPlot(container, traces, layout, config);
    initialized = true;
  }
}

export function resizePlotlySlide() {
  const container = getContainer();
  if (!container || !initialized) return;
  Plotly.Plots.resize(container);
}
