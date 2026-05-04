document.getElementById('backbtn').addEventListener('click', function() {
  history.back();
});

const QUOTES = [
  "What you resist, persists. What you focus on, grows.",
  "The mind is a tool. You decide what it cuts.",
  "Depth is built in silence.",
  "One hour of deep work outperforms eight of shallow noise.",
  "You are here because you chose to be. Choose again.",
  "The work is the meditation.",
];

const params = new URLSearchParams(window.location.search);
document.getElementById('site-name').textContent = params.get('site') || 'this site';
document.getElementById('rand-quote').textContent =
  '"' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '"';

const urlCount = parseInt(params.get('count') || '0', 10);
const todayEl = document.getElementById('stats-today');
todayEl.textContent = urlCount === 0 ? 'First attempt today'
  : urlCount === 1 ? '1 attempt today'
  : urlCount + ' attempts today';

function todayKey() { return new Date().toISOString().slice(0, 10); }

function last7() {
  var days = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function renderChart(attempts) {
  var today = todayKey();
  if (urlCount > 0) attempts[today] = Math.max(attempts[today] || 0, urlCount);

  var days = last7();
  var counts = days.map(function(d) { return attempts[d] || 0; });
  var max = Math.max.apply(null, counts.concat([1]));
  var DAY = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  var bW = 30, gap = 5, maxH = 36, totalW = 7*bW + 6*gap;
  var svg = '<svg width="' + totalW + '" height="' + (maxH+14) + '" viewBox="0 0 ' + totalW + ' ' + (maxH+14) + '">';

  days.forEach(function(date, i) {
    var c = counts[i];
    var h = c > 0 ? Math.max(4, Math.round((c / max) * maxH)) : 2;
    var x = i * (bW + gap);
    var y = maxH - h;
    var isToday = date === today;
    var fill  = isToday ? '#f2f2f2' : '#48484a';
    var tFill = isToday ? '#ebebf5' : '#636366';
    var d = new Date(date + 'T12:00:00');
    svg += '<rect x="' + x + '" y="' + y + '" width="' + bW + '" height="' + h + '" rx="3" fill="' + fill + '"/>';
    svg += '<text x="' + (x + bW/2) + '" y="' + (maxH+11) + '" text-anchor="middle" fill="' + tFill + '" font-size="9" font-family="-apple-system,sans-serif">' + DAY[d.getDay()] + '</text>';
  });

  svg += '</svg>';
  document.getElementById('stats-chart').innerHTML = svg;
}

renderChart({});

try {
  chrome.storage.local.get(['kairosAttempts'], function(res) {
    renderChart(res.kairosAttempts || {});
  });
} catch(e) {}
