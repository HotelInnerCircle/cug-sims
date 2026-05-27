// Verify bill cycle date calculations
const TODAY_DAY = 27, CUR_MONTH = 4, CUR_YEAR = 2026  // May 27, 2026

function lastDay(y, m) { return new Date(y, m + 1, 0).getDate() }
function clamp(d, y, m) { return Math.min(d, lastDay(y, m)) }
function fmt(d) { return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }

function activePeriod(startDay, endDay) {
  let sy, sm, ey, em
  if (startDay <= endDay) {
    if (TODAY_DAY <= endDay) { sy = CUR_YEAR; sm = CUR_MONTH;     ey = CUR_YEAR; em = CUR_MONTH }
    else                     { sy = CUR_YEAR; sm = CUR_MONTH + 1; ey = CUR_YEAR; em = CUR_MONTH + 1 }
  } else {
    if (TODAY_DAY >= startDay) { sy = CUR_YEAR; sm = CUR_MONTH;     ey = CUR_YEAR; em = CUR_MONTH + 1 }
    else                       { sy = CUR_YEAR; sm = CUR_MONTH - 1; ey = CUR_YEAR; em = CUR_MONTH }
  }
  const start  = new Date(sy, sm, clamp(startDay, sy, sm))
  const expiry = new Date(ey, em, clamp(endDay,   ey, em))
  const daysLeft = Math.ceil((expiry - new Date(2026, 4, 27)) / 86400000)
  return { start: fmt(start), expiry: fmt(expiry), daysLeft }
}

console.log('Today: 27 May 2026\n')
const cases = [
  ['1-Dec-26 to 31-Dec-26  (SAZ 1→31 every month)',      1,  31],
  ['20-Dec-26 to 10-Jan-26 (SAZ PVSL 20→10 every month)', 20, 10],
  ['01 TO 30TH OF EVERY MONTH (RKS 1→30)',                1,  30],
  ['05 TO 4TH OF EVERY MONTH (HIC/BAC/RKS 5→4)',          5,   4],
]
cases.forEach(([label, s, e]) => {
  const r = activePeriod(s, e)
  console.log(label)
  console.log(`  → ${r.start}  to  ${r.expiry}  (${r.daysLeft} days left)\n`)
})
