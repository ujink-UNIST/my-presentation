import Plotly from 'plotly.js-dist-min';

const initializedContainers = new WeakSet();
let homogenizationDataPromise;
let stiffnessDataPromise;

const unitCellOrder = [
  'sc',
  'bcc',
  'diamond',
  'fcc',
  'kelvin',
  'octahedron',
  'octet',
  'rhombic'
];

const unitCellColors = {
  sc: '#636EFA',
  bcc: '#EF553B',
  diamond: '#00CC96',
  fcc: '#AB63FA',
  kelvin: '#FFA15A',
  octahedron: '#19D3F3',
  octet: '#FF6692',
  rhombic: '#B6E880'
};

const modelSymbols = {
  beam: 'circle',
  solid: 'x'
};

const modelDashes = {
  beam: 'dot',
  solid: 'solid'
};

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getThemeColors() {
  return {
    navy: getCssVar('--unist-navy'),
    cyan: getCssVar('--unist-cyan'),
    teal: getCssVar('--unist-teal'),
    muted: getCssVar('--muted'),
    surface: getCssVar('--surface'),
    line: getCssVar('--line')
  };
}

function getPlotlyScalingContainer() {
  return document.querySelector('#plotly-scaling-container');
}

function getPlotlyExponentContainer() {
  return document.querySelector('#plotly-exponent-container');
}

function getSeatApsdContainer() {
  return document.querySelector('#seat-apsd-container');
}

function getStiffnessHeatmapContainer() {
  return document.querySelector('#stiffness-heatmap-container');
}

function renderPlot(container, traces, layout, config) {
  if (initializedContainers.has(container)) {
    Plotly.react(container, traces, layout, config);
    return;
  }

  Plotly.newPlot(container, traces, layout, config);
  initializedContainers.add(container);
}

function gaussianPeak(frequency, center, width, amplitude) {
  const exponent = -0.5 * ((frequency - center) / width) ** 2;
  return amplitude * Math.exp(exponent);
}

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map(header => header.trim());

  return lines
    .map(line => {
      const values = line.split(',').map(value => value.trim());
      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    })
    .map(row => ({
      unit_cell: row.unit_cell,
      model: row.model,
      radius: Number(row.radius),
      volume_fraction: Number(row.volume_fraction),
      effective_modulus_ratio: Number(row.effective_modulus_ratio)
    }))
    .filter(row => (
      unitCellOrder.includes(row.unit_cell)
      && ['beam', 'solid'].includes(row.model)
      && Number.isFinite(row.radius)
      && Number.isFinite(row.volume_fraction)
      && Number.isFinite(row.effective_modulus_ratio)
    ));
}

function loadHomogenizationData() {
  if (!homogenizationDataPromise) {
    homogenizationDataPromise = fetch('./assets/data/beam_solid_lattice_homogenization_benchmark.csv')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load homogenization CSV: ${response.status}`);
        return response.text();
      })
      .then(parseCsv);
  }

  return homogenizationDataPromise;
}

function parseStiffnessCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const labels = headerLine.split(',').slice(1).map(label => label.trim());
  const rows = [];
  const z = lines.map(line => {
    const [rowLabel, ...values] = line.split(',');
    rows.push(rowLabel.trim());
    return values.map(Number);
  });

  return { labels, rows, z };
}

function loadStiffnessData() {
  if (!stiffnessDataPromise) {
    stiffnessDataPromise = fetch('./assets/data/bcc_component_normalized_stiffness.csv')
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load stiffness CSV: ${response.status}`);
        return response.text();
      })
      .then(parseStiffnessCsv);
  }

  return stiffnessDataPromise;
}

function fitPowerLaw(group) {
  const valid = group.filter(row => row.volume_fraction > 0 && row.effective_modulus_ratio > 0);
  const nPoints = valid.length;

  const logVf = valid.map(row => Math.log(row.volume_fraction));
  const logE = valid.map(row => Math.log(row.effective_modulus_ratio));
  const sumX = logVf.reduce((sum, value) => sum + value, 0);
  const sumY = logE.reduce((sum, value) => sum + value, 0);
  const sumXX = logVf.reduce((sum, value) => sum + value * value, 0);
  const sumXY = logVf.reduce((sum, value, index) => sum + value * logE[index], 0);
  const denominator = nPoints * sumXX - sumX * sumX;
  const n = denominator === 0 ? 0 : (nPoints * sumXY - sumX * sumY) / denominator;
  const logC = (sumY - n * sumX) / nPoints;

  return { c: Math.exp(logC), n };
}

function makeSlopeData(rows, physicalOnly = true) {
  const fitRows = physicalOnly ? rows.filter(row => row.volume_fraction < 1) : rows;

  return unitCellOrder.flatMap(unitCell => ['beam', 'solid'].map(model => {
    const group = fitRows.filter(row => row.unit_cell === unitCell && row.model === model);
    if (group.length < 2) return null;
    const { c, n } = fitPowerLaw(group);
    return { unit_cell: unitCell, model, c, n };
  })).filter(Boolean);
}

function makeSeatApsdData() {
  const frequencies = Array.from({ length: 180 }, (_, index) => {
    const min = Math.log10(0.5);
    const max = Math.log10(80);
    return 10 ** (min + ((max - min) * index) / 179);
  });

  const apsd = frequencies.map(frequency => {
    const roadNoise = 0.018 / (frequency ** 0.72);
    const bodyMode = gaussianPeak(frequency, 1.3, 0.28, 0.045);
    const seatMode = gaussianPeak(frequency, 4.6, 0.75, 0.18);
    const cushionMode = gaussianPeak(frequency, 11.5, 2.0, 0.055);
    const highFrequency = gaussianPeak(frequency, 27, 6.5, 0.014);
    return roadNoise + bodyMode + seatMode + cushionMode + highFrequency;
  });

  return { frequencies, apsd };
}

export function initSeatApsdSlide() {
  const container = getSeatApsdContainer();
  if (!container) return;

  const colors = getThemeColors();
  const { frequencies, apsd } = makeSeatApsdData();

  const traces = [
    {
      x: frequencies,
      y: apsd,
      mode: 'lines',
      type: 'scatter',
      name: 'Synthetic seat APSD',
      line: { color: colors.cyan, width: 4 },
      hovertemplate: 'Frequency: %{x:.2f} Hz<br>APSD: %{y:.4f} (m/s²)²/Hz<extra></extra>'
    }
  ];

  const layout = {
    paper_bgcolor: colors.surface,
    plot_bgcolor: colors.surface,
    margin: { l: 86, r: 34, t: 24, b: 72 },
    xaxis: {
      title: { text: 'Frequency (Hz)', font: { color: colors.navy } },
      type: 'log',
      range: [Math.log10(0.5), Math.log10(80)],
      gridcolor: colors.line,
      zeroline: false,
      tickfont: { color: colors.muted }
    },
    yaxis: {
      title: { text: 'APSD ((m/s²)²/Hz)', font: { color: colors.navy } },
      gridcolor: colors.line,
      zeroline: false,
      tickfont: { color: colors.muted }
    },
    showlegend: false,
    autosize: true
  };

  const config = {
    responsive: true,
    displaylogo: false
  };

  renderPlot(container, traces, layout, config);
}

export async function initStiffnessHeatmapSlide() {
  const container = getStiffnessHeatmapContainer();
  if (!container) return;

  const { labels, rows, z } = await loadStiffnessData();
  const colors = getThemeColors();
  const values = z.flat();
  const zMax = Math.max(...values);
  const zMin = Math.min(...values);
  const annotations = z.flatMap((row, rowIndex) => row.map((value, colIndex) => ({
    x: labels[colIndex],
    y: rows[rowIndex],
    text: Math.abs(value) >= 0.01 ? value.toFixed(3) : value.toExponential(2),
    showarrow: false,
    font: {
      color: value > zMax * 0.55 ? '#ffffff' : colors.navy,
      size: 10
    }
  })));

  const trace = {
    x: labels,
    y: rows,
    z,
    type: 'heatmap',
    colorscale: [
      [0, '#f7fbff'],
      [0.35, '#bfe7f3'],
      [0.7, '#43c1c3'],
      [1, '#002856']
    ],
    zmin: zMin,
    zmax: zMax,
    colorbar: {
      title: { text: 'component normalized', side: 'right' },
      thickness: 14,
      len: 0.82
    },
    hovertemplate: '%{y}, %{x}<br>normalized: %{z:.6e}<extra></extra>'
  };

  const layout = {
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    title: { text: 'Component-wise normalized BCC stiffness matrix', x: 0.5, font: { size: 18, color: colors.navy } },
    margin: { l: 62, r: 72, t: 54, b: 48 },
    xaxis: { side: 'top', tickfont: { size: 13 }, fixedrange: true },
    yaxis: { autorange: 'reversed', tickfont: { size: 13 }, fixedrange: true },
    annotations,
    autosize: true
  };

  renderPlot(container, [trace], layout, {
    responsive: true,
    displaylogo: false,
    displayModeBar: false
  });
}

export async function initPlotlySlide() {
  const scalingContainer = getPlotlyScalingContainer();
  const exponentContainer = getPlotlyExponentContainer();
  if (!scalingContainer || !exponentContainer) return;

  const rows = await loadHomogenizationData();
  const slopes = makeSlopeData(rows, true);
  const maxVf = Math.max(...rows.map(row => row.volume_fraction));
  const xMax = Math.max(1.5, maxVf * 1.03);
  const yMax = Math.max(...rows.map(row => row.effective_modulus_ratio)) * 1.10;

  const scalingTraces = unitCellOrder.flatMap(unitCell => ['beam', 'solid'].map(model => {
    const group = rows
      .filter(row => row.unit_cell === unitCell && row.model === model)
      .sort((a, b) => a.volume_fraction - b.volume_fraction);

    if (!group.length) return null;

    return {
      x: group.map(row => row.volume_fraction),
      y: group.map(row => row.effective_modulus_ratio),
      mode: 'lines+markers',
      type: 'scatter',
      name: `${unitCell} — ${model}`,
      legendgroup: unitCell,
      showlegend: model === 'solid',
      line: {
        color: unitCellColors[unitCell],
        dash: modelDashes[model],
        width: model === 'solid' ? 4 : 3
      },
      marker: {
        color: unitCellColors[unitCell],
        symbol: modelSymbols[model],
        size: model === 'solid' ? 10 : 8,
        line: { width: 1.2, color: '#243447' }
      },
      customdata: group.map(row => [row.radius, model]),
      hovertemplate: [
        `<b>${unitCell}</b>`,
        'Model: %{customdata[1]}',
        'Radius: %{customdata[0]:.2f}',
        'Volume fraction: %{x:.4f}',
        'Eeff / Es: %{y:.4f}',
        '<extra></extra>'
      ].join('<br>')
    };
  })).filter(Boolean);

  const exponentTraces = ['beam', 'solid'].map(model => {
    const group = slopes.filter(row => row.model === model);

    return {
      x: group.map(row => row.unit_cell),
      y: group.map(row => row.n),
      mode: 'markers',
      type: 'scatter',
      name: model[0].toUpperCase() + model.slice(1),
      legendgroup: `slope-${model}`,
      marker: {
        symbol: modelSymbols[model],
        size: 15,
        color: model === 'beam' ? '#1F77B4' : '#FF7F0E',
        line: { width: 1.5, color: '#243447' }
      },
      customdata: group.map(row => [row.c]),
      hovertemplate: [
        '<b>%{x}</b>',
        `Model: ${model}`,
        'n: %{y:.3f}',
        'C: %{customdata[0]:.4f}',
        '<extra></extra>'
      ].join('<br>')
    };
  });

  const commonLayout = {
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    autosize: true,
    font: { family: 'Arial, sans-serif', size: 14, color: '#1f2d3d' },
    hovermode: 'closest'
  };

  const scalingLayout = {
    ...commonLayout,
    title: { text: 'Effective Modulus Scaling', x: 0.5, font: { size: 18 } },
    margin: { l: 84, r: 28, t: 54, b: 118 },
    showlegend: true,
    xaxis: {
      title: { text: 'Volume Fraction' },
      range: [0, xMax],
      dtick: 0.25,
      gridcolor: '#dce7f2',
      zeroline: false,
      tickfont: { size: 13 }
    },
    yaxis: {
      title: { text: 'E<sub>eff</sub>/E<sub>s</sub>' },
      range: [0, yMax],
      gridcolor: '#dce7f2',
      zeroline: false,
      tickfont: { size: 13 }
    },
    legend: {
      title: { text: 'Unit cell color' },
      orientation: 'h',
      yanchor: 'top',
      y: -0.18,
      xanchor: 'center',
      x: 0.5,
      font: { size: 11 },
      itemsizing: 'constant'
    },
    annotations: [
      { text: 'Solid: solid line + × marker<br>Beam: dotted line + ○ marker', x: 0.02, y: 0.98, xref: 'paper', yref: 'paper', showarrow: false, xanchor: 'left', yanchor: 'top', align: 'left', bgcolor: 'rgba(255,255,255,0.82)', bordercolor: '#d7e1e9', borderwidth: 1, borderpad: 6, font: { color: '#002856', size: 12 } },
      { text: 'VF ≥ 1', x: 1.01, y: 0.98, xref: 'x', yref: 'paper', showarrow: false, xanchor: 'left', yanchor: 'top', font: { color: '#666', size: 12 } }
    ],
    shapes: [
      { type: 'rect', xref: 'x', yref: 'paper', x0: 1, x1: xMax, y0: 0, y1: 1, fillcolor: 'gray', opacity: 0.10, line: { width: 0 }, layer: 'below' }
    ]
  };

  const exponentLayout = {
    ...commonLayout,
    title: { text: 'Power-Law Exponent', x: 0.5, font: { size: 18 } },
    margin: { l: 74, r: 24, t: 54, b: 104 },
    xaxis: {
      title: { text: '' },
      tickangle: -20,
      categoryorder: 'array',
      categoryarray: unitCellOrder,
      gridcolor: '#dce7f2',
      tickfont: { size: 12 }
    },
    yaxis: {
      title: { text: 'Exponent, n' },
      gridcolor: '#dce7f2',
      zeroline: false,
      tickfont: { size: 13 }
    },
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: -0.48,
      xanchor: 'center',
      x: 0.5,
      font: { size: 12 }
    },
    annotations: [
      { text: 'n = 1', x: 0.99, y: 1, xref: 'paper', yref: 'y', showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { size: 10, color: '#111' } },
      { text: 'n = 2', x: 0.99, y: 2, xref: 'paper', yref: 'y', showarrow: false, xanchor: 'right', yanchor: 'top', font: { size: 10, color: '#666' } }
    ],
    shapes: [
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 1, y1: 1, line: { color: 'black', dash: 'dash', width: 1 } },
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 2, y1: 2, line: { color: 'gray', dash: 'dash', width: 1 } }
    ]
  };

  const config = {
    responsive: true,
    displaylogo: false,
    displayModeBar: false
  };

  renderPlot(scalingContainer, scalingTraces, scalingLayout, config);
  renderPlot(exponentContainer, exponentTraces, exponentLayout, config);
}

export function resizePlotlySlide() {
  [getPlotlyScalingContainer(), getPlotlyExponentContainer(), getSeatApsdContainer(), getStiffnessHeatmapContainer()].forEach(container => {
    if (!container || !initializedContainers.has(container)) return;
    Plotly.Plots.resize(container);
  });
}
