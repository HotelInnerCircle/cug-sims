import nodemailer from 'nodemailer'

const FROM_EMAIL = process.env.GMAIL_USER ?? 'rahulwebdeveloper12@gmail.com'
const TO_EMAIL = 'hotelinnercircle12@gmail.com'

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: FROM_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export interface BillingConnection {
  name: string
  mobile: string
  company: string
  billing_amount: number
  plan_start_date?: string | null
  plan_expiry_date?: string | null
  daysRemaining?: number | null
  billing_status?: string
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

// One consolidated email — all connections, total, expiry warning
export async function sendConsolidatedBillingEmail({
  connections,
  daysRemaining,
  expiryDate,
  subject,
  isExpired = false,
}: {
  connections: BillingConnection[]
  daysRemaining: number
  expiryDate: string
  subject: string
  isExpired?: boolean
}) {
  const totalAmount = connections.reduce((s, c) => s + (c.billing_amount ?? 0), 0)
  const formattedExpiry = formatDate(expiryDate)
  const urgencyColor = isExpired
    ? '#dc2626'
    : daysRemaining <= 1 ? '#dc2626'
    : daysRemaining <= 2 ? '#ea580c'
    : '#d97706'
  const dayText = isExpired ? 'EXPIRED' : `${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} Left`

  // Group by company for summary
  const byCompany: Record<string, { count: number; total: number }> = {}
  connections.forEach((c) => {
    if (!byCompany[c.company]) byCompany[c.company] = { count: 0, total: 0 }
    byCompany[c.company].count++
    byCompany[c.company].total += c.billing_amount ?? 0
  })

  const companyRows = Object.entries(byCompany)
    .map(([co, d]) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#374151;">${co}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#6b7280;text-align:center;">${d.count}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#111827;text-align:right;">${inr(d.total)}</td>
      </tr>
    `).join('')

  // Connection rows — show all (capped at 250 in email body for readability)
  const showConns = connections.slice(0, 250)
  const connectionRows = showConns.map((c, i) => {
    const statusColor = (c.daysRemaining ?? 999) <= 0 ? '#dc2626'
      : (c.daysRemaining ?? 999) <= 4 ? '#d97706'
      : '#16a34a'
    const statusText = (c.daysRemaining ?? 999) <= 0 ? 'Expired'
      : (c.daysRemaining ?? 999) <= 4 ? `${c.daysRemaining}d left`
      : 'Active'
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc'
    return `
      <tr style="background:${rowBg};">
        <td style="padding:8px 12px;font-size:12px;color:#6b7280;">${i + 1}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#111827;">${c.name}</td>
        <td style="padding:8px 12px;font-size:12px;color:#374151;font-family:monospace;">${c.mobile}</td>
        <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#4f46e5;">${c.company}</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#111827;text-align:right;">${inr(c.billing_amount ?? 0)}</td>
        <td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:center;">${formatDate(c.plan_start_date)}</td>
        <td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:center;">${formatDate(c.plan_expiry_date)}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;color:#fff;background:${statusColor};">${statusText}</span>
        </td>
      </tr>
    `
  }).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center">
<table width="780" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);max-width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="background:rgba(255,255,255,0.15);display:inline-block;border-radius:8px;padding:6px 12px;margin-bottom:10px;">
              <span style="color:#fff;font-size:11px;font-weight:800;letter-spacing:2px;">SABOO CUG BILLING</span>
            </div>
            <h1 style="color:#fff;margin:0 0 4px;font-size:20px;font-weight:800;">${isExpired ? '🔴 Plans Expired' : `⚠️ Plans Expiring in ${dayText}`}</h1>
            <p style="color:rgba(255,255,255,0.75);margin:0;font-size:13px;">Billing Date: 5th of every month · ${formattedExpiry}</p>
          </td>
          <td align="right" style="vertical-align:top;">
            <div style="background:${urgencyColor};border-radius:12px;padding:14px 18px;text-align:center;display:inline-block;">
              <div style="color:#fff;font-size:28px;font-weight:900;line-height:1;">${isExpired ? '0' : daysRemaining}</div>
              <div style="color:rgba(255,255,255,0.85);font-size:10px;font-weight:700;letter-spacing:1px;margin-top:2px;">DAYS</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Alert Banner -->
  <tr>
    <td style="background:${urgencyColor};padding:12px 32px;">
      <p style="margin:0;color:#fff;font-size:14px;font-weight:700;text-align:center;">
        ${isExpired
          ? `🔴 ${connections.length} CUG plans have EXPIRED — Immediate renewal required`
          : `⚠️ ${connections.length} CUG plans expire on ${formattedExpiry} — ${dayText}`
        }
      </p>
    </td>
  </tr>

  <!-- Summary Cards -->
  <tr>
    <td style="padding:24px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="padding:0 6px 0 0;">
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;text-align:center;">
              <div style="font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Total Connections</div>
              <div style="font-size:28px;font-weight:900;color:#0c4a6e;">${connections.length}</div>
            </div>
          </td>
          <td width="33%" style="padding:0 3px;">
            <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;text-align:center;">
              <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Monthly Total</div>
              <div style="font-size:22px;font-weight:900;color:#78350f;">${inr(totalAmount)}</div>
            </div>
          </td>
          <td width="33%" style="padding:0 0 0 6px;">
            <div style="background:${isExpired ? '#fef2f2' : '#fff7ed'};border:1px solid ${isExpired ? '#fecaca' : '#fed7aa'};border-radius:10px;padding:16px;text-align:center;">
              <div style="font-size:11px;font-weight:700;color:${urgencyColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Plan Expiry</div>
              <div style="font-size:15px;font-weight:800;color:${urgencyColor};">${formattedExpiry}</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Company Summary -->
  <tr>
    <td style="padding:20px 32px 0;">
      <h2 style="margin:0 0 10px;font-size:13px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:1px;">Company-wise Summary</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <tr style="background:#f8fafc;">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Company</th>
          <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">SIMs</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Monthly Total</th>
        </tr>
        ${companyRows}
        <tr style="background:#4f46e5;">
          <td style="padding:12px 16px;font-weight:800;color:#fff;font-size:13px;">GRAND TOTAL</td>
          <td style="padding:12px 16px;font-weight:800;color:#fff;text-align:center;font-size:13px;">${connections.length}</td>
          <td style="padding:12px 16px;font-weight:800;color:#fff;text-align:right;font-size:15px;">${inr(totalAmount)}</td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Connection Details Table -->
  <tr>
    <td style="padding:20px 32px 0;">
      <h2 style="margin:0 0 10px;font-size:13px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:1px;">
        All Connections (${connections.length})${connections.length > 250 ? ' — showing first 250' : ''}
      </h2>
      <div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:600px;">
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">#</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">Name</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">Mobile</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">Co.</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">Amount</th>
            <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">Start</th>
            <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">Expiry</th>
            <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;white-space:nowrap;">Status</th>
          </tr>
          ${connectionRows}
        </table>
      </div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 32px;margin-top:24px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
        <p style="margin:0 0 6px;color:#374151;font-size:13px;">
          Please ensure all ${connections.length} CUG plans are renewed before <strong>${formattedExpiry}</strong>.
          Total renewal amount: <strong style="color:#4f46e5;">${inr(totalAmount)}/month</strong>.
        </p>
        <p style="margin:0;color:#94a3b8;font-size:11px;">
          Automated notification from Saboo CUG Management System · Billing cycle: 5th of every month · Do not reply to this email.
        </p>
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>
  `

  const transporter = getTransporter()
  await transporter.sendMail({
    from: `"Saboo CUG Billing" <${FROM_EMAIL}>`,
    to: TO_EMAIL,
    subject,
    html,
  })
}
