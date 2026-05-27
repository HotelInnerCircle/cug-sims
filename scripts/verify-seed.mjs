import { MongoClient } from 'mongodb'

const URI = 'mongodb+srv://broaddcast_db_user:GnMViBSKzGXgu1aP@cug-sims.scmotzt.mongodb.net/?appName=Cug-sims'
const client = new MongoClient(URI)
await client.connect()
const coll = client.db('test').collection('connections')

const total = await coll.countDocuments()
console.log('Total connections:', total)

const counts = await coll.aggregate([{ $group: { _id: '$company', count: { $sum: 1 }, totalBilling: { $sum: '$billing_amount' } } }]).toArray()
console.log('\nBy company:')
counts.forEach(c => console.log(`  ${c._id}: ${c.count} SIMs, ₹${c.totalBilling}/month`))

console.log('\nSample SAZ:')
const saz = await coll.find({ company: 'SAZ' }).limit(2).toArray()
saz.forEach(s => console.log(`  ${s.name} | ₹${s.billing_amount} | ${s.plan_start_date?.toISOString()?.slice(0,10)} → ${s.plan_expiry_date?.toISOString()?.slice(0,10)}`))

console.log('\nSample RKS:')
const rks = await coll.find({ company: 'RKS' }).limit(2).toArray()
rks.forEach(s => console.log(`  ${s.name} | ₹${s.billing_amount} | ${s.plan_start_date?.toISOString()?.slice(0,10)} → ${s.plan_expiry_date?.toISOString()?.slice(0,10)}`))

console.log('\nSample HIC:')
const hic = await coll.find({ company: 'HIC' }).limit(2).toArray()
hic.forEach(s => console.log(`  ${s.name} | ₹${s.billing_amount} | ${s.plan_start_date?.toISOString()?.slice(0,10)} → ${s.plan_expiry_date?.toISOString()?.slice(0,10)}`))

console.log('\nSample BAC:')
const bac = await coll.find({ company: 'BAC' }).limit(2).toArray()
bac.forEach(s => console.log(`  ${s.name} | ₹${s.billing_amount} | ${s.plan_start_date?.toISOString()?.slice(0,10)} → ${s.plan_expiry_date?.toISOString()?.slice(0,10)}`))

await client.close()
