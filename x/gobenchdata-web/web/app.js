'use strict';

// Generate one chart per suite
export async function generateCharts({
  div,  // div to populate with charts 
  json, // path to JSON database
}) {
  let runs = [];
  try {
    runs = await readJSON(json);
  } catch (e) {
    const err = document.createElement('div');
    div.appendChild(err);
    err.innerText = e;
  }

  const labels = runs.sort((a, b) => a.Date - b.Date).map(r => label(r));
  const charts = {};
  let len = 0;
  // runs should start from the most recent run
  runs.forEach(run => {
    len++;

    // add data from each suite
    run.Suites.forEach(suite => {
      if (charts[suite.Pkg+'-'+chartsTypes[0]]) {
        // if the chart div was already set up, append data to chart.
        // if the dataset is isn't in the datasets, then it no longer exists,
        // and we'll ignore it.
        suite.Benchmarks.forEach(bench => {
          chartsTypes.forEach(c => {
            const { data: { datasets } } = charts[suite.Pkg + '-' + c];
            const dataset = datasets.find(e => (e.label === bench.Name))
            if (dataset) {
              switch (c) {
                case chartsTypes[0]: {
                  dataset.data.push(newPoint(run, bench.NsPerOp));
                  break;
                }
                case chartsTypes[1]: {
                  dataset.data.push(newPoint(run, bench.Mem.BytesPerOp));
                  break;
                }
                case chartsTypes[2]: {
                  dataset.data.push(newPoint(run, bench.Mem.AllocsPerOp));
                  break;
                }
              }
            }
          })
        });
      } else {
        // group benchmarks for a package under a div
        const group = document.createElement('div');
        group.id = suite.Pkg;
        const title = document.createElement('h3');
        group.appendChild(title);
        title.innerText = `package ${suite.Pkg}`;

        // chart for each benchmark type
        let seedColor = randomInt();
        const { Benchmarks: benchmarks } = suite;
        chartsTypes.forEach(c => {
          const chartName = suite.Pkg + '-' + c;

          // create elements
          const canvas = document.createElement('canvas');
          canvas.id = chartName;
          const ctx = canvas.getContext('2d');

          // create chart
          let i = seedColor;
          charts[chartName] = new Chart(ctx, {
            type: 'line',
            data: {
              labels,
              datasets: benchmarks.map(bench => {
                let p;
                switch (c) {
                case chartsTypes[0]: {
                  p = newPoint(run, bench.NsPerOp);
                  break;
                }
                case chartsTypes[1]: {
                  p = newPoint(run, bench.Mem.BytesPerOp);
                  break;
                }
                case chartsTypes[2]: {
                  p = newPoint(run, bench.Mem.AllocsPerOp);
                  break;
                }
                }
                i += 3;
                return {
                  label: bench.Name,
                  data: [p],

                  fill: false,
                  backgroundColor: getColor(i),
                  borderColor: getColor(i),
                  pointRadius: 4,
                }
              }),
            },
            options: chartOptions(c),
          });

          // attach to dom
          const canvasDiv = document.createElement('div');
          canvasDiv.setAttribute('class', 'canvaswrapper');
          canvasDiv.appendChild(canvas);
          group.appendChild(canvasDiv);
        });

        // attach group to parent
        group.appendChild(document.createElement('hr'));
        group.appendChild(document.createElement('br'));
        div.appendChild(group);
      }
    });

    // fill missing data from datasets
    Object.values(charts).forEach(c => {
      const { data: { datasets } } = c;
      datasets.forEach(d => {
        const { data } = d;
        if (data.length < len) data.unshift(newPoint(run, NaN));
      });
    })
  })
}

const chartOptions = (c) => ({
  responsive: true,
  title: {
    display: true,
    text: c,
  },
  tooltips: {
    mode: 'index',
    intersect: false,
  },
  hover: {
    mode: 'nearest',
    intersect: true
  },
  scales: {
    yAxes: [{
      display: true,
      scaleLabel: { display: true, labelString: c },
      ticks: { beginAtZero: true },
    }],
  },
})

const newPoint = (run, val) => ({
  t: new Date(run.Date*1000),
  y: val,
})

const chartsTypes = [
  'ns/op',
  'bytes/op',
  'allocs/op',
]

const chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

const chartColorsList = Object.values(chartColors);

function randomInt() {
  return Math.floor(Math.random() * (chartColorsList.length + 1));
}

function getColor(i) {
  return chartColorsList[i % chartColorsList.length];
}

async function readJSON(path) {
  return (await fetch(path)).json();
}

function label(run) {
  const d = new Date(run.Date*1000);
  let month = d.getMonth();
  return `${run.Version.substring(0, 7)} (${++month}/${d.getDate()})`;
}
