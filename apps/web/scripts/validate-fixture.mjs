// Checks the demo fixture is internally consistent. Run: node scripts/validate-fixture.mjs
// A broken fixture means a broken demo, and it fails silently in the UI. This
// catches it in a second.

import { readFileSync } from 'node:fs';

const v = JSON.parse(readFileSync(new URL('../fixtures/demo-pr.json', import.meta.url)));

const errors = [];
const warnings = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };
const warn = (cond, msg) => { if (!cond) warnings.push(msg); };

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const DECISIONS = ['MERGE', 'NEEDS_WORK', 'BLOCK'];
const MODES = ['Code', 'Advanced', 'Ask', 'Orchestrator'];

ok(DECISIONS.includes(v.decision), `decision "${v.decision}" is not a valid Decision`);
ok(v.confidence > 0 && v.confidence <= 1, 'top-level confidence must be in (0,1]');
ok(typeof v.rationale === 'string' && v.rationale.length > 40, 'rationale is too short to be convincing');
ok(v.simulated === true, 'fixture must be flagged simulated:true so the UI can label it');

// --- findings -------------------------------------------------------------
const findings = v.reports.flatMap((r) => r.findings);
const ids = findings.map((f) => f.id);
ok(new Set(ids).size === ids.length, `duplicate finding ids: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`);

for (const r of v.reports) {
  ok(MODES.includes(r.mode), `report ${r.agent} has invalid BOB mode "${r.mode}"`);
  ok(r.status === 'complete', `report ${r.agent} must be complete in the fixture`);
  ok(r.durationMs > 0, `report ${r.agent} needs a durationMs for the timeline`);
  ok(r.findings.length > 0 && r.findings.length <= 3, `report ${r.agent} must have 1-3 findings, has ${r.findings.length}`);

  for (const f of r.findings) {
    ok(f.agent === r.agent, `finding ${f.id} claims agent "${f.agent}" but sits in ${r.agent}'s report`);
    ok(SEVERITIES.includes(f.severity), `finding ${f.id} has invalid severity "${f.severity}"`);
    ok(Number.isInteger(f.line) && f.line > 0, `finding ${f.id} needs a real line number`);
    ok(f.confidence > 0 && f.confidence <= 1, `finding ${f.id} confidence out of range`);
    ok(!!f.evidence && !!f.inference, `finding ${f.id} must have both evidence and inference`);
    ok(f.evidence !== f.inference, `finding ${f.id} evidence and inference are identical — that defeats the whole point`);
    ok(!!f.remediation, `finding ${f.id} has no remediation`);
    warn(f.evidence.length > 60, `finding ${f.id} evidence is thin; judges will read this one`);
  }
}

// --- decision consistency -------------------------------------------------
const hasCritical = findings.some((f) => f.severity === 'critical');
if (v.decision === 'BLOCK') ok(hasCritical, 'BLOCK verdict with no critical finding will not survive a judge question');
if (v.decision === 'MERGE') ok(!hasCritical, 'MERGE verdict alongside a critical finding contradicts the decision rules');

for (const id of v.drivingFindings) {
  ok(ids.includes(id), `drivingFindings references "${id}" which does not exist`);
}
warn(v.disagreements.length > 0, 'no recorded disagreement — the specialist-conflict story is your differentiator');

// --- blast radius ---------------------------------------------------------
const br = v.blastRadius;
const changedPaths = v.context.filesChanged.map((f) => f.path);
ok(changedPaths.includes(br.changedNode), `blastRadius.changedNode "${br.changedNode}" is not among the changed files`);
ok(br.affected.length >= 3, 'blast radius needs at least 3 affected nodes to look like a graph');
warn(br.affected.some((a) => !a.hasTests), 'no uncovered affected file — the "no tests" beat is missing');
warn(br.affected.some((a) => a.isTrustBoundary), 'no trust boundary in the blast radius');

const nodePaths = new Set([br.changedNode, ...br.affected.map((a) => a.path)]);
for (const e of br.edges) {
  ok(nodePaths.has(e.from), `edge from unknown node "${e.from}"`);
  ok(nodePaths.has(e.to), `edge to unknown node "${e.to}"`);
}
for (const a of br.affected) {
  if (a.distance === 1) {
    ok(br.edges.some((e) => e.from === br.changedNode && e.to === a.path),
      `"${a.path}" is distance 1 but has no direct edge from the changed node`);
  }
}

// --- the critical finding must be reachable -------------------------------
const critical = findings.find((f) => f.severity === 'critical');
if (critical) {
  ok(nodePaths.has(critical.file) || changedPaths.includes(critical.file),
    `critical finding sits in "${critical.file}" which is not in the blast radius — reachability is unproven`);
}

// --- report ---------------------------------------------------------------
console.log(`\n  Findings: ${findings.length}   Reports: ${v.reports.length}   Nodes: ${nodePaths.size}   Edges: ${br.edges.length}`);
console.log(`  Verdict:  ${v.decision} @ ${Math.round(v.confidence * 100)}%\n`);

for (const w of warnings) console.log(`  warn   ${w}`);
for (const e of errors) console.log(`  ERROR  ${e}`);

if (errors.length) {
  console.log(`\n  ${errors.length} error(s). Fixture is not demo-ready.\n`);
  process.exit(1);
}
console.log(`  Fixture is consistent.${warnings.length ? ` (${warnings.length} warning(s))` : ''}\n`);
