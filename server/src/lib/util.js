'use strict';

// decimals omitted → raw mean (unrounded)
function avg(arr, decimals) {
  if (!arr.length) return null;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  if (decimals == null) return mean;
  const f = 10 ** decimals;
  return Math.round(mean * f) / f;
}

// Monday of the week containing dateStr, as 'YYYY-MM-DD'
function getWeekStart(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

module.exports = { avg, getWeekStart };
