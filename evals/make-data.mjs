// Generates the synthetic data for the evaluation briefs. Deterministic: the
// same seed gives the same files. Every dataset has a real story in it, noted
// beside the code that plants it. All names and figures are fictional.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const r = rng(20261010);
const jitter = (v, pct) => v * (1 + (r() * 2 - 1) * pct);
const round = (v, d = 0) => Number(v.toFixed(d));
const csv = rows => {
  const cols = Object.keys(rows[0]);
  const cell = v => (typeof v === 'string' && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v ?? ''));
  return [cols.join(','), ...rows.map(row => cols.map(c => cell(row[c])).join(','))].join('\n') + '\n';
};
const write = (brief, file, body) => {
  const path = join(here, 'briefs', brief, 'data', file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof body === 'string' ? body : JSON.stringify(body, null, 2) + '\n');
};
const months = (startY, startM, n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.UTC(startY, startM - 1 + i, 1));
  return d.toISOString().slice(0, 7);
});

// ---- 01 customer quarterly review -----------------------------------------
// Story: active users jump after an onboarding programme in May 2026; two teams
// lag; support first response time falls from ~9h to ~3h; seats underused.
{
  const ms = months(2025, 10, 12);
  write('01-customer-quarterly-review', 'usage_monthly.csv', csv(ms.map((month, i) => {
    const boosted = i >= 7;                               // May 2026 onward
    const active = boosted ? 412 + (i - 7) * 31 : 300 + i * 6;
    return { month, licensed_seats: 650, active_users: round(jitter(active, 0.02)), sessions: round(jitter(active * (boosted ? 21 : 17), 0.04)), api_calls: round(jitter(180000 + i * 14000, 0.06)) };
  })));
  const teams = [['Dispatch', 140, 0.91, 0.78], ['Fleet Planning', 96, 0.84, 0.71], ['Customer Service', 120, 0.79, 0.52], ['Warehouse Ops', 150, 0.41, 0.18], ['Finance', 64, 0.38, 0.11], ['Procurement', 48, 0.73, 0.44], ['Management', 32, 0.88, 0.35]];
  write('01-customer-quarterly-review', 'adoption_by_team.csv', csv(teams.map(([team, seats, active, planner]) => ({ team, seats, weekly_active_users: round(seats * active), route_planner_adoption_pct: round(planner * 100) }))));
  write('01-customer-quarterly-review', 'support_tickets.csv', csv(ms.map((month, i) => ({
    month, tickets_opened: round(jitter(i >= 7 ? 64 : 48, 0.12)), tickets_resolved: round(jitter(i >= 7 ? 66 : 45, 0.12)),
    median_first_response_hours: round(i < 6 ? jitter(9.2, 0.08) : Math.max(2.6, 9 - (i - 5) * 1.3), 1), csat_pct: round(i < 6 ? jitter(84, 0.02) : Math.min(95, 85 + (i - 5) * 1.6)),
  }))));
}

// ---- 02 incident review -----------------------------------------------------
// Story: 47-minute checkout outage on 17 Sep 2026. A cache config change at
// 13:52 evicts the fraud feature cache; fraud latency climbs; the payments
// connection pool is exhausted at 14:06; checkout errors peak at 94%.
{
  const rows = [];
  for (let m = 0; m <= 120; m++) {
    const t = new Date(Date.UTC(2026, 8, 17, 13, 30 + m));
    const hhmm = t.toISOString().slice(11, 16);
    let err = 0.4, p95 = 310, fraud = 45;
    if (m >= 22 && m < 36) { fraud = 45 + (m - 22) * 95; p95 = 310 + (m - 22) * 160; err = 0.4 + (m - 22) * 0.5; }
    if (m >= 36 && m < 83) { fraud = 1400 + Math.sin(m) * 150; p95 = 9800; err = m < 40 ? 30 + (m - 36) * 16 : 94 - (m > 76 ? (m - 76) * 9 : 0); }
    if (m >= 83) { fraud = Math.max(45, 600 - (m - 83) * 60); p95 = Math.max(310, 2400 - (m - 83) * 300); err = Math.max(0.4, 20 - (m - 83) * 5); }
    rows.push({ time_utc: hhmm, checkout_error_rate_pct: round(Math.max(0, jitter(err, 0.06)), 1), checkout_p95_latency_ms: round(jitter(p95, 0.05)), fraud_score_p95_latency_ms: round(jitter(fraud, 0.07)) });
  }
  write('02-incident-review', 'metrics_by_minute.csv', csv(rows));
  write('02-incident-review', 'timeline.csv', csv([
    { time_utc: '13:52', system: 'Feature cache', event: 'Config change deployed: max memory lowered from 24 GB to 8 GB (change CHG-4471)' },
    { time_utc: '13:53', system: 'Feature cache', event: 'Mass eviction begins; hit rate falls from 97% to 12%' },
    { time_utc: '13:55', system: 'Fraud service', event: 'p95 latency climbs as features are recomputed from the feature store' },
    { time_utc: '14:06', system: 'Payments service', event: 'Connection pool to Fraud service exhausted (200 of 200 in use)' },
    { time_utc: '14:06', system: 'Checkout service', event: 'Checkout error rate passes 30%; first customer reports' },
    { time_utc: '14:09', system: 'On-call', event: 'Page fires on checkout error rate; incident declared SEV-1' },
    { time_utc: '14:21', system: 'On-call', event: 'Payments restarted; no effect, pool exhausts again within 90 seconds' },
    { time_utc: '14:38', system: 'On-call', event: 'Fraud latency identified as the cause; cache config change found' },
    { time_utc: '14:46', system: 'Feature cache', event: 'Config rolled back to 24 GB; cache begins to warm' },
    { time_utc: '14:53', system: 'Checkout service', event: 'Error rate below 5%; incident mitigated after 47 minutes' },
    { time_utc: '15:10', system: 'Checkout service', event: 'Error rate back to baseline; incident closed' },
  ]));
  write('02-incident-review', 'systems.json', {
    note: 'Request path for a card checkout. "failed" marks the hop that failed first; "degraded" marks hops that slowed or errored as a result.',
    systems: [
      { id: 'web', name: 'Web and mobile apps', type: 'client', zone: 'Customers' },
      { id: 'gateway', name: 'API gateway', type: 'gateway', zone: 'Edge' },
      { id: 'checkout', name: 'Checkout service', type: 'service', zone: 'Application' },
      { id: 'payments', name: 'Payments service', type: 'service', zone: 'Application' },
      { id: 'fraud', name: 'Fraud service', type: 'service', zone: 'Application' },
      { id: 'cache', name: 'Feature cache', type: 'cache', zone: 'Data' },
      { id: 'features', name: 'Feature store', type: 'database', zone: 'Data' },
      { id: 'orders', name: 'Orders database', type: 'database', zone: 'Data' },
      { id: 'vault', name: 'Token vault', type: 'database', zone: 'Data' },
      { id: 'processor', name: 'Card processor', type: 'external', zone: 'Third party' },
    ],
    calls: [
      { from: 'web', to: 'gateway', what: 'POST /checkout', during_incident: 'degraded' },
      { from: 'gateway', to: 'checkout', what: 'routes request', during_incident: 'degraded' },
      { from: 'checkout', to: 'orders', what: 'writes order', during_incident: 'normal' },
      { from: 'checkout', to: 'payments', what: 'authorise payment', during_incident: 'degraded' },
      { from: 'payments', to: 'fraud', what: 'score transaction (pool of 200 connections)', during_incident: 'degraded' },
      { from: 'fraud', to: 'cache', what: 'reads features', during_incident: 'failed' },
      { from: 'fraud', to: 'features', what: 'recomputes on cache miss', during_incident: 'degraded' },
      { from: 'payments', to: 'vault', what: 'reads card token', during_incident: 'normal' },
      { from: 'payments', to: 'processor', what: 'charges card', during_incident: 'normal' },
    ],
    impact: { duration_minutes: 47, failed_checkouts: 18420, estimated_lost_revenue_eur: 412000, customers_affected: 15890, sla_credit_eur: 38000 },
    actions: [
      { action: 'Add a circuit breaker and 300 ms timeout on Payments to Fraud; fall back to rules-based scoring', owner: 'Payments team', due: '2026-10-09' },
      { action: 'Require a canary and automatic rollback for cache configuration changes', owner: 'Platform team', due: '2026-10-23' },
      { action: 'Alert on fraud scoring latency and cache hit rate, not only on checkout errors', owner: 'SRE', due: '2026-10-02' },
      { action: 'Load-test the checkout path with a cold feature cache each quarter', owner: 'SRE', due: '2026-11-13' },
    ],
  });
}

// ---- 03 survey results ------------------------------------------------------
// Story: engagement up 3 points overall, but career growth fell 9 points, worst
// in Engineering and Customer Support. Manager quality is the top theme.
{
  const themes = [
    ['My manager', 'My manager gives me useful feedback', 86, 84], ['My manager', 'My manager cares about my wellbeing', 88, 85],
    ['Purpose', 'I understand how my work contributes to company goals', 82, 78], ['Purpose', 'I am proud to work here', 84, 80],
    ['Teamwork', 'My team collaborates well', 85, 83], ['Teamwork', 'Other teams are easy to work with', 61, 58],
    ['Career growth', 'I see a path to advance my career here', 48, 59], ['Career growth', 'I have had a meaningful development conversation in the last 6 months', 52, 60], ['Career growth', 'Promotions here are fair', 44, 52],
    ['Workload', 'My workload is manageable', 63, 57], ['Workload', 'I can switch off outside working hours', 66, 62],
    ['Leadership', 'Senior leaders communicate a clear direction', 71, 64], ['Leadership', 'I trust the decisions of senior leadership', 68, 63],
    ['Tools', 'I have the tools I need to do my job well', 74, 70], ['Pay and recognition', 'I am paid fairly for the work I do', 55, 53], ['Pay and recognition', 'Good work is recognised here', 70, 66],
  ];
  write('03-survey-results', 'questions.csv', csv(themes.map(([theme, question, y26, y25]) => {
    const unf = round((100 - y26) * 0.45);
    return { theme, question, favourable_pct_2026: y26, favourable_pct_2025: y25, neutral_pct_2026: 100 - y26 - unf, unfavourable_pct_2026: unf };
  })));
  const depts = [['Engineering', 312, 0], ['Customer Support', 228, -2], ['Sales', 196, 3], ['Operations', 284, 1], ['Marketing', 88, 2], ['Finance and Legal', 72, 1], ['People', 44, 5], ['Product and Design', 60, 2]];
  const base = { 'My manager': 87, 'Purpose': 83, 'Teamwork': 73, 'Career growth': 48, 'Workload': 65, 'Leadership': 70, 'Tools': 74, 'Pay and recognition': 62 };
  const special = { 'Engineering|Career growth': 34, 'Customer Support|Career growth': 31, 'Customer Support|Workload': 49, 'Sales|Pay and recognition': 74, 'Engineering|Tools': 81, 'Operations|Tools': 62 };
  const rows = [];
  for (const [department, n, shift] of depts) for (const [theme, v] of Object.entries(base)) {
    rows.push({ department, respondents: n, theme, favourable_pct: special[`${department}|${theme}`] ?? round(jitter(v + shift, 0.04)) });
  }
  write('03-survey-results', 'by_department.csv', csv(rows));
  write('03-survey-results', 'summary.json', { survey: 'Employee engagement survey 2026', field_dates: '2026-09-01 to 2026-09-19', invited: 1585, responded: 1284, response_rate_pct: 81, engagement_index_2026: 74, engagement_index_2025: 71, enps_2026: 24, enps_2025: 19, method: 'Favourable = agree or strongly agree on a five-point scale. Results for groups under 10 respondents are suppressed.' });
}

// ---- 04 experiment readout --------------------------------------------------
// Story: the new checkout lifts conversion about 6% overall, but it is flat to
// negative on mobile, and the first-week lift is inflated by novelty.
{
  const rows = [];
  for (let d = 0; d < 28; d++) {
    const date = new Date(Date.UTC(2026, 7, 31 + d)).toISOString().slice(0, 10);
    const weekend = [0, 6].includes(new Date(date).getUTCDay());
    const visitors = round(jitter(weekend ? 16500 : 21800, 0.05));
    const baseCr = jitter(weekend ? 0.0338 : 0.0312, 0.03);
    const lift = d < 7 ? 0.115 - d * 0.008 : 0.055 + (r() - 0.5) * 0.02;
    for (const [variant, cr, aov] of [['control', baseCr, 71.4], ['new_checkout', baseCr * (1 + lift), 70.1]]) {
      const v = round(visitors / 2 * jitter(1, 0.01));
      const conv = round(v * cr);
      rows.push({ date, variant, visitors: v, orders: conv, revenue_eur: round(conv * jitter(aov, 0.02), 2) });
    }
  }
  write('04-experiment-readout', 'daily.csv', csv(rows));
  const seg = [['Desktop', 'New', 98000, 0.0261, 0.118], ['Desktop', 'Returning', 74000, 0.0495, 0.102], ['Mobile web', 'New', 142000, 0.0188, -0.012], ['Mobile web', 'Returning', 81000, 0.0352, -0.031], ['Tablet', 'New', 21000, 0.0224, 0.061], ['Tablet', 'Returning', 13000, 0.0418, 0.048]];
  const srows = [];
  for (const [device, customer, n, cr, lift] of seg) for (const [variant, rate] of [['control', cr], ['new_checkout', cr * (1 + lift)]]) {
    const v = round(n * jitter(1, 0.01));
    srows.push({ device, customer_type: customer, variant, visitors: v, orders: round(v * rate) });
  }
  write('04-experiment-readout', 'segments.csv', csv(srows));
  write('04-experiment-readout', 'design.json', { experiment: 'CHK-212 single-page checkout', hypothesis: 'Collapsing the three-step checkout into one page raises order conversion.', primary_metric: 'orders / visitors', guardrails: ['revenue per visitor', 'payment error rate', 'refund rate'], allocation: '50/50 by visitor', start: '2026-08-31', end: '2026-09-27', minimum_detectable_effect_relative_pct: 3, significance_level: 0.05, payment_error_rate_pct: { control: 1.9, new_checkout: 2.0 }, refund_rate_pct: { control: 3.1, new_checkout: 3.0 }, known_issue: 'On mobile web the single page pushes the pay button below the fold on screens under 700 px tall.' });
}

// ---- 05 sales pipeline ------------------------------------------------------
// Story: the Proposal to Negotiation step is the big leak this quarter (38%
// against 52% last quarter); EMEA beats target, North America misses; two reps
// carry 45% of bookings.
{
  write('05-sales-pipeline', 'stage_flow_q3.csv', csv([
    ['Lead', 'Qualified', 412, 18.6], ['Lead', 'Disqualified', 596, 21.4],
    ['Qualified', 'Proposal', 268, 14.1], ['Qualified', 'Lost', 144, 4.5],
    ['Proposal', 'Negotiation', 102, 6.3], ['Proposal', 'Lost', 131, 6.1], ['Proposal', 'Stalled over 60 days', 35, 1.7],
    ['Negotiation', 'Won', 71, 4.6], ['Negotiation', 'Lost', 31, 1.7],
  ].map(([from_stage, to_stage, deals, value_eur_m]) => ({ from_stage, to_stage, deals, value_eur_m }))));
  write('05-sales-pipeline', 'stage_conversion_by_quarter.csv', csv([
    ['2025-Q4', 40, 64, 51, 68], ['2026-Q1', 41, 66, 53, 70], ['2026-Q2', 42, 65, 52, 69], ['2026-Q3', 41, 65, 38, 70],
  ].map(([quarter, a, b, c, d]) => ({ quarter, lead_to_qualified_pct: a, qualified_to_proposal_pct: b, proposal_to_negotiation_pct: c, negotiation_to_won_pct: d }))));
  const reps = [['A. Okafor', 'EMEA', 520, 812, 41], ['L. Brandt', 'EMEA', 520, 1268, 36], ['S. Marchetti', 'EMEA', 480, 505, 52], ['J. Castillo', 'North America', 600, 356, 71], ['M. Reyes', 'North America', 600, 298, 68], ['T. Nguyen', 'North America', 560, 471, 59], ['P. Iyer', 'APAC', 420, 388, 49], ['K. Tanaka', 'APAC', 420, 402, 47], ['D. Hughes', 'EMEA', 480, 100, 44]];
  write('05-sales-pipeline', 'by_rep_q3.csv', csv(reps.map(([rep, region, quota, won, cycle]) => ({ rep, region, quota_eur_k: quota, closed_won_eur_k: won, open_pipeline_eur_k: round(jitter(quota * 2.4, 0.2)), win_rate_pct: round(Math.min(48, Math.max(14, won / quota * 30)), 0), avg_sales_cycle_days: cycle }))));
  const ms = months(2025, 10, 12);
  write('05-sales-pipeline', 'monthly_bookings.csv', csv(ms.map((month, i) => ({ month, target_eur_k: 1500 + i * 20, closed_won_eur_k: round(jitter(i >= 9 ? 1530 : 1460 + i * 28, 0.07)), new_pipeline_eur_k: round(jitter(5200 + i * 90, 0.08)) }))));
  write('05-sales-pipeline', 'loss_reasons_proposal_stage_q3.csv', csv([['Price above approved budget', 47], ['No decision / went quiet', 38], ['Lost to competitor (Corvid)', 21], ['Security review not passed in time', 14], ['Champion left the company', 7], ['Other', 4]].map(([reason, deals]) => ({ reason, deals }))));
}

// ---- 06 security data flows -------------------------------------------------
// Story: every flow is encrypted in transit except one legacy nightly export;
// personal data reaches only a handful of systems; one processor gets emails.
{
  write('06-security-data-flows', 'systems.csv', csv([
    ['browser', 'Customer browser', 'client', 'Internet', 'Customer', 'Personal data'],
    ['cdn', 'CDN and WAF', 'gateway', 'Edge', 'Platform team', 'None stored'],
    ['lb', 'Load balancer', 'gateway', 'Edge', 'Platform team', 'None stored'],
    ['idp', 'Identity provider (SSO)', 'external', 'Third party', 'Customer or Okta', 'Credentials'],
    ['api', 'API service', 'service', 'Application', 'Core team', 'Personal data in transit'],
    ['web', 'Web application', 'service', 'Application', 'Core team', 'None stored'],
    ['worker', 'Background workers', 'service', 'Application', 'Core team', 'Personal data in transit'],
    ['queue', 'Job queue', 'queue', 'Application', 'Platform team', 'Personal data in transit'],
    ['db', 'Primary database', 'database', 'Data', 'Data team', 'Personal data'],
    ['files', 'Document storage', 'database', 'Data', 'Data team', 'Customer documents'],
    ['search', 'Search index', 'database', 'Data', 'Data team', 'Pseudonymised'],
    ['warehouse', 'Reporting warehouse', 'database', 'Data', 'Analytics team', 'Pseudonymised'],
    ['mail', 'Email provider', 'external', 'Third party', 'Sendwell Inc.', 'Email addresses'],
    ['logs', 'Log platform', 'external', 'Third party', 'Logline Ltd.', 'No personal data (scrubbed)'],
  ].map(([id, name, type, zone, owner, data_held]) => ({ id, name, type, zone, owner, data_held }))));
  write('06-security-data-flows', 'flows.csv', csv([
    ['browser', 'cdn', 'HTTPS', 443, 'Page requests, form data', 'TLS 1.3', 'Session cookie', 2400000],
    ['cdn', 'lb', 'HTTPS', 443, 'Filtered requests', 'TLS 1.3', 'mTLS', 2100000],
    ['lb', 'web', 'HTTPS', 8443, 'Page requests', 'TLS 1.2', 'mTLS', 900000],
    ['lb', 'api', 'HTTPS', 8443, 'API requests', 'TLS 1.2', 'mTLS + JWT', 1200000],
    ['web', 'idp', 'HTTPS', 443, 'SAML / OIDC sign-in', 'TLS 1.3', 'Signed assertions', 42000],
    ['web', 'api', 'HTTPS', 8443, 'API requests', 'TLS 1.2', 'JWT', 760000],
    ['api', 'db', 'PostgreSQL', 5432, 'Customer records', 'TLS 1.2', 'IAM role', 3900000],
    ['api', 'files', 'HTTPS', 443, 'Uploaded documents', 'TLS 1.3', 'IAM role', 61000],
    ['api', 'search', 'HTTPS', 9243, 'Search queries', 'TLS 1.2', 'API key', 540000],
    ['api', 'queue', 'AMQPS', 5671, 'Job messages', 'TLS 1.2', 'Service account', 380000],
    ['queue', 'worker', 'AMQPS', 5671, 'Job messages', 'TLS 1.2', 'Service account', 380000],
    ['worker', 'db', 'PostgreSQL', 5432, 'Customer records', 'TLS 1.2', 'IAM role', 820000],
    ['worker', 'mail', 'HTTPS', 443, 'Recipient email address, message body', 'TLS 1.3', 'API key', 96000],
    ['worker', 'search', 'HTTPS', 9243, 'Index updates (pseudonymised)', 'TLS 1.2', 'API key', 210000],
    ['db', 'warehouse', 'FTP', 21, 'Nightly export (pseudonymised)', 'None', 'Shared password', 1],
    ['api', 'logs', 'HTTPS', 443, 'Application logs (scrubbed)', 'TLS 1.3', 'API key', 5200000],
    ['worker', 'logs', 'HTTPS', 443, 'Application logs (scrubbed)', 'TLS 1.3', 'API key', 1100000],
  ].map(([from, to, protocol, port, data, encryption_in_transit, authentication, requests_per_day]) => ({ from, to, protocol, port, data, encryption_in_transit, authentication, requests_per_day }))));
  write('06-security-data-flows', 'controls.json', {
    encryption_at_rest: 'AES-256 for the primary database, document storage, search index and reporting warehouse; keys in a managed KMS, rotated yearly',
    data_residency: 'All production systems run in the EU (Frankfurt and Dublin). The email provider processes in the EU; the log platform in the EU.',
    known_gap: { flow: 'Primary database to Reporting warehouse', issue: 'Nightly export uses unencrypted FTP inside the private network with a shared password', risk: 'Medium: pseudonymised data, private network only', remediation: 'Replace with TLS-encrypted managed replication', due: '2026-11-30', owner: 'Analytics team' },
    certifications: ['ISO 27001 (2025)', 'SOC 2 Type II (period ending 2026-06-30)'],
    last_penetration_test: '2026-07-14, no critical or high findings open',
    subprocessors: [{ name: 'Sendwell Inc.', purpose: 'Transactional email', data: 'Email address, message body' }, { name: 'Logline Ltd.', purpose: 'Log storage', data: 'Scrubbed application logs' }],
  });
}
console.log('evaluation data written');
