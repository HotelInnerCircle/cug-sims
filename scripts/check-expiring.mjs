import { MongoClient } from 'mongodb'
const client = new MongoClient('mongodb+srv://broaddcast_db_user:GnMViBSKzGXgu1aP@cug-sims.scmotzt.mongodb.net/?appName=Cug-sims')
await client.connect()
const coll = client.db('test').collection('connections')

const now = new Date(); now.setHours(0, 0, 0, 0)
const in4 = new Date(now); in4.setDate(in4.getDate() + 4)

const expiring = await coll.find({ plan_expiry_date: { $ne: null, $lte: in4 } }).toArray()
const byCompany = {}
expiring.forEach(c => {
  const days = Math.ceil((new Date(c.plan_expiry_date) - now) / 86400000)
  if (!byCompany[c.company]) byCompany[c.company] = []
  byCompany[c.company].push({ name: c.name, mobile: c.mobile, days })
})

console.log('=== Connections expiring within 4 days (will trigger emails) ===\n')
let total = 0
Object.entries(byCompany).forEach(([co, list]) => {
  console.log(`${co}: ${list.length} connections`)
  list.forEach(x => console.log(`  ${x.days <= 0 ? 'EXPIRED' : x.days + 'd left'} | ${x.name || '(unnamed)'} | ${x.mobile}`))
  total += list.length
  console.log()
})
console.log('Total expiring:', total)
console.log('Active (will NOT be emailed):', (await coll.countDocuments()) - total)
await client.close()
