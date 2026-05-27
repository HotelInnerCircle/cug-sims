/**
 * Reads SABOO CUG LIST.xlsx from Downloads, clears the DB,
 * and inserts all rows with correct billing data.
 * Run: node scripts/seed-from-excel.mjs
 */

import xlsx from 'xlsx'
import { MongoClient } from 'mongodb'
import path from 'path'
import os from 'os'

const MONGO_URI = 'mongodb+srv://broaddcast_db_user:GnMViBSKzGXgu1aP@cug-sims.scmotzt.mongodb.net/?appName=Cug-sims'
const DB_NAME = 'test' // default MongoDB Atlas database
const COLLECTION = 'connections'

// Bill plan dates — current active billing cycle
const PLAN_START = new Date('2026-06-05')
const PLAN_EXPIRY = new Date('2026-07-05')

// Map full company name → short code used in the app
const COMPANY_MAP = {
  'SABOO AUTOZONE': 'SAZ',
  'SABOO AUTO ZONE': 'SAZ',
  'SAZ': 'SAZ',
  'SABOO GROUP': 'RKS',  // Department column confirms these are RKS members
  'PVSL': 'RKS',
  'RKS': 'RKS',
  'HOTEL INNER CIRCLE': 'HIC',
  'HIC': 'HIC',
  'BROADCAST': 'BAC',
  'BROADDCAST': 'BAC',
  'BAC': 'BAC',
  'VERA VITA': 'BAC',    // Under BROADDCAST umbrella
}

function normalizeCompany(raw, dept, numberUnder) {
  const upper = String(raw || '').trim().toUpperCase()
  const nu    = String(numberUnder || '').trim().toUpperCase()
  const dep   = String(dept || '').trim().toUpperCase()

  // "-" means unassigned — derive from "Number Under"
  if (!upper || upper === '-') {
    if (nu === 'PVSL' || nu === 'SABOO AUTOZONE') return 'SAZ'
    if (nu === 'BROADDCAST')                       return 'BAC'
    return 'SAZ' // default
  }

  if (upper === 'NOT ASSIGNED') {
    if (dep === 'RKS')     return 'RKS'
    if (nu === 'BROADDCAST') return 'BAC'
    return 'BAC'
  }

  return COMPANY_MAP[upper] || upper
}

function getFancyTier(num) {
  const s = String(num || '').trim()
  if (s.length !== 10 || !/^\d{10}$/.test(s)) return null
  if (new Set(s.split('')).size === 1) return 1
  if (s === s.split('').reverse().join('')) return 1
  const diffs = Array.from({ length: s.length - 1 }, (_, i) => +s[i + 1] - +s[i])
  if (new Set(diffs).size === 1) return 1
  if (new Set(s.slice(-4).split('')).size === 1) return 1
  if (new Set(s.slice(-3).split('')).size === 1) return 2
  const pairs = Array.from({ length: Math.floor(s.length / 2) }, (_, i) => s[i * 2] === s[i * 2 + 1])
  if (pairs.filter(Boolean).length >= 3) return 2
  const endings = ['00','11','22','33','44','55','66','77','88','99']
  if (endings.includes(s.slice(-2))) return 3
  if (s.slice(0, 2) === s.slice(2, 4)) return 3
  if (s.slice(4, 6) === s.slice(6, 8)) return 3
  return null
}

const NOW = new Date()
NOW.setHours(0, 0, 0, 0)
const TODAY_DAY = NOW.getDate()      // e.g. 27
const CUR_YEAR  = NOW.getFullYear()  // e.g. 2026
const CUR_MONTH = NOW.getMonth()     // 0-indexed, e.g. 4 = May

// Last day of a given month (0-indexed)
function lastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

// Clamp day to valid range for that month (handles months with <31 days)
function clampDay(day, year, month) {
  return Math.min(day, lastDayOfMonth(year, month))
}

// Given billing cycle start/end DAY NUMBERS, calculate the current active period.
//
// Rule: the bill cycle repeats every month with the same start/end day.
// We find whichever period contains TODAY.
//
// Same-month cycle (startDay ≤ endDay), e.g. 1→31, 1→30:
//   • today ≤ endDay  →  period is CUR_MONTH startDay → CUR_MONTH endDay
//   • today > endDay  →  period is NEXT_MONTH startDay → NEXT_MONTH endDay
//
// Cross-month cycle (startDay > endDay), e.g. 20→10, 5→4:
//   • today ≥ startDay  →  CUR_MONTH startDay → NEXT_MONTH endDay
//   • today < startDay  →  PREV_MONTH startDay → CUR_MONTH endDay
function activePeriod(startDay, endDay) {
  let sy, sm, ey, em

  if (startDay <= endDay) {
    // Same-month cycle
    if (TODAY_DAY <= endDay) {
      sy = CUR_YEAR; sm = CUR_MONTH
      ey = CUR_YEAR; em = CUR_MONTH
    } else {
      sy = CUR_YEAR; sm = CUR_MONTH + 1  // JS Date handles month overflow
      ey = CUR_YEAR; em = CUR_MONTH + 1
    }
  } else {
    // Cross-month cycle (start > end, e.g. 20th→10th)
    if (TODAY_DAY >= startDay) {
      sy = CUR_YEAR; sm = CUR_MONTH
      ey = CUR_YEAR; em = CUR_MONTH + 1
    } else {
      sy = CUR_YEAR; sm = CUR_MONTH - 1  // JS Date handles negative month
      ey = CUR_YEAR; em = CUR_MONTH
    }
  }

  const start  = new Date(sy, sm, clampDay(startDay, sy, sm))
  const expiry = new Date(ey, em, clampDay(endDay, ey, em))
  return { start, expiry }
}

// Parse Excel bill cycle string into start/end Day numbers, then map to current period.
//
// Handles all formats found in the Excel:
//   "20-Dec-26 to 10-Jan-26"      → startDay=20, endDay=10 (cross-month)
//   "1-Dec-26 to 31-Dec-26"       → startDay=1,  endDay=31 (same-month)
//   "01 TO 30TH OF EVERY MONTH"   → startDay=1,  endDay=30
//   "05 TO 4TH OF EVERY MONTH"    → startDay=5,  endDay=4
function parseBillCycle(val) {
  if (!val || String(val).trim() === '-') return { start: PLAN_START, expiry: PLAN_EXPIRY }
  const s = String(val).trim().toUpperCase()

  // "NN TO NNTH OF EVERY MONTH"  (already day-based)
  const everyMonthMatch = s.match(/^(\d+)\s+TO\s+(\d+)/)
  if (everyMonthMatch) {
    return activePeriod(parseInt(everyMonthMatch[1]), parseInt(everyMonthMatch[2]))
  }

  // "DD-Mon-YY to DD-Mon-YY" — extract ONLY the day numbers, ignore month/year
  const rangeMatch = s.match(/^(\d+)[-\s]+[A-Za-z]+[-\s]?\d{2}\s+TO\s+(\d+)[-\s]+[A-Za-z]+[-\s]?\d{2}/)
  if (rangeMatch) {
    return activePeriod(parseInt(rangeMatch[1]), parseInt(rangeMatch[2]))
  }

  return { start: PLAN_START, expiry: PLAN_EXPIRY }
}

async function main() {
  // Find the Excel file
  const downloads = path.join(os.homedir(), 'Downloads')
  const excelPath = path.join(downloads, 'SABOO CUG LIST (1).xlsx')
  const fallbackPath = path.join(downloads, 'SABOO CUG LIST.xlsx')

  let wb
  try {
    wb = xlsx.readFile(excelPath)
    console.log('Reading:', excelPath)
  } catch {
    wb = xlsx.readFile(fallbackPath)
    console.log('Reading:', fallbackPath)
  }

  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' })

  console.log(`Found ${rows.length} rows in sheet "${sheetName}"`)
  console.log('Column headers detected:', Object.keys(rows[0] || {}))

  // Show first row to understand column names
  if (rows.length > 0) {
    console.log('\nFirst row sample:', JSON.stringify(rows[0], null, 2))
  }

  // Auto-detect column names (case-insensitive)
  function col(row, ...candidates) {
    for (const c of candidates) {
      const key = Object.keys(row).find(k => k.toLowerCase().replace(/[\s_-]/g, '') === c.toLowerCase().replace(/[\s_-]/g, ''))
      if (key && row[key] !== '' && row[key] !== undefined) return String(row[key]).trim()
    }
    return ''
  }

  // Use a Map keyed by mobile to deduplicate (last row wins)
  const docMap = new Map()
  for (const row of rows) {
    const mobile = col(row, 'mobilenumber', 'mobile', 'mobileno', 'phone', 'number')
    if (!mobile || mobile === 'Mobile Number') continue // skip header/empty rows
    const cleanMobile = String(mobile).replace(/\s/g, '')
    if (!/^\d{10}$/.test(cleanMobile)) continue // skip invalid mobiles

    const companyRaw  = col(row, 'company')
    const deptRaw     = col(row, 'department')
    const numberUnder = col(row, 'numberunder', 'number under', 'paidby', 'paid by')
    const company     = normalizeCompany(companyRaw, deptRaw, numberUnder)

    // Bill plan — treat "-" or missing as null (empty billing)
    const billPlanRaw = col(row, 'billplan', 'bill plan', 'plan', 'amount')
    const billAmount  = (billPlanRaw && billPlanRaw !== '-') ? (parseInt(billPlanRaw) || null) : null

    // Bill cycle — treat "-" or missing as null dates (empty billing)
    const billCycleRaw = col(row, 'billcycle', 'bill cycle', 'cycle', 'billingcycle')
    const { start, expiry } = (billCycleRaw && billCycleRaw !== '-')
      ? parseBillCycle(billCycleRaw)
      : { start: null, expiry: null }

    // Normalise name/designation — treat "-" as empty string
    const clean = (v) => { const s = String(v||'').trim(); return s === '-' ? '' : s }

    const doc = {
      mobile: cleanMobile,
      name: clean(col(row, 'employeename', 'employee name', 'name')),
      company,
      designation: clean(col(row, 'designation')),
      department: clean(col(row, 'department')),
      network: clean(col(row, 'simprovider', 'sim provider', 'network', 'provider')),
      plan_type: clean(col(row, 'connectiontype', 'connection type', 'plantype', 'plan type')),
      paid_by: clean(numberUnder),
      location: clean(col(row, 'location')),
      fancy_tier: getFancyTier(cleanMobile),
      billing_amount: billAmount,
      plan_start_date: start,
      plan_expiry_date: expiry,
      billing_status: 'active',
      billing_email_log: [],
      remark: { assignedTo: '', note: '', updatedAt: null, updatedBy: '' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    docMap.set(cleanMobile, doc)
  }
  const docs = Array.from(docMap.values())

  console.log(`\nParsed ${docs.length} valid connection records`)

  if (docs.length === 0) {
    console.error('No valid records found. Check column names above.')
    process.exit(1)
  }

  // Connect to MongoDB
  const client = new MongoClient(MONGO_URI)
  try {
    await client.connect()
    console.log('Connected to MongoDB')

    // Try to find the correct database
    const adminDb = client.db('admin')
    const dbList = await adminDb.admin().listDatabases()
    console.log('Available databases:', dbList.databases.map(d => d.name).join(', '))

    // Use the first non-system database, or 'test'
    const userDbs = dbList.databases.filter(d => !['admin', 'local', 'config'].includes(d.name))
    const targetDb = userDbs.length > 0 ? userDbs[0].name : 'test'
    console.log('Using database:', targetDb)

    const db = client.db(targetDb)
    const coll = db.collection(COLLECTION)

    // Clear existing
    const deleted = await coll.deleteMany({})
    console.log(`Deleted ${deleted.deletedCount} existing connections`)

    // Insert new (ordered:false skips remaining duplicates gracefully)
    const result = await coll.insertMany(docs, { ordered: false })
    console.log(`\n✅ Inserted ${result.insertedCount} connections successfully!`)

    // Summary by company
    const summary = {}
    docs.forEach(d => {
      summary[d.company] = (summary[d.company] || 0) + 1
    })
    console.log('\nBy company:')
    Object.entries(summary).forEach(([co, count]) => console.log(`  ${co}: ${count}`))

  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
