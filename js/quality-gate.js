import { runRegressionSuite } from './test-runner.js';
import { runCoverage } from './coverage.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());

function pushIssue(target, code, detail, extra = {}) {
  target.push({ code, detail, ...extra });
}

function clusterCounts(sourceItems) {
  const counts = new Map();
  for (const item of sourceItems) {
    const cluster = item.cluster ?? '(none)';
    counts.set(cluster, (counts.get(cluster) ?? 0) + 1);
  }
  return counts;
}

export function evaluateQualityGate(regression, coverage) {
  const hardFailures = [];
  const warnings = [];

  if (!regression.passed) {
    pushIssue(hardFailures, 'regression.failed', `Regression suite reported ${regression.failures.length} captured failure(s).`);
  }

  const schemaErrors = coverage.validation?.errors ?? [];
  if (schemaErrors.length > 0) {
    pushIssue(hardFailures, 'schema.errors', `Dataset has ${schemaErrors.length} schema validation error(s).`);
  }

  if ((coverage.deadItems ?? []).length > 0) {
    pushIssue(hardFailures, 'coverage.dead_items', `Dead items: ${coverage.deadItems.join(', ')}`);
  }
  if ((coverage.neverSelected ?? []).length > 0) {
    pushIssue(hardFailures, 'coverage.never_selected', `Never-selected items: ${coverage.neverSelected.join(', ')}`);
  }

  for (const [name, config] of Object.entries(coverage.byConfig ?? {})) {
    if ((config.anchorsFound ?? 0) < (config.runs ?? 0)) {
      pushIssue(hardFailures, 'coverage.no_anchor_runs', `${name}: anchors found ${config.anchorsFound}/${config.runs}.`, { config: name });
    }
    if ((config.emptyRate ?? 0) >= 0.15) {
      pushIssue(hardFailures, 'coverage.empty_rate', `${name}: emptyRate ${(config.emptyRate * 100).toFixed(1)}% >= 15%.`, { config: name, value: config.emptyRate });
    }

    const stagePools = config.avgEligiblePoolByStage ?? {};
    for (const stage of ['1', '2', '3']) {
      const pool = Number(stagePools[stage] ?? 0);
      if (pool < 4) {
        pushIssue(warnings, 'coverage.stage_pool_narrow', `${name}: Stage ${stage} avgEligiblePool ${pool.toFixed(2)} < 4.`, { config: name, stage: Number(stage), value: pool });
      }
    }

    const s1 = Number(stagePools['1'] ?? 0);
    const s3 = Number(stagePools['3'] ?? 0);
    if (s1 > 0 && s3 / s1 < 0.5) {
      pushIssue(warnings, 'coverage.stage3_ratio', `${name}: S3/S1 ${(s3 / s1).toFixed(2)} < 0.50.`, { config: name, value: s3 / s1 });
    }

    if ((config.mobilityRunRatio ?? 0) > 0 && (config.preservationRejections ?? 0) === 0) {
      pushIssue(warnings, 'mobility.observed_without_preservation', `${name}: mobility changes occur, but preservationRejections is 0; verify the state change has structural effect.`, { config: name, mobilityRunRatio: config.mobilityRunRatio });
    }
  }

  for (const [cluster, count] of clusterCounts(items)) {
    if (cluster !== '(none)' && count === 1) {
      pushIssue(warnings, 'fixture.singleton_cluster', `Cluster '${cluster}' contains only one item.`, { cluster });
    }
  }

  const mobilityChangingItemRatio = coverage.totals?.mobilityChangingItemRatio ?? 0;
  if (mobilityChangingItemRatio < 0.10) {
    pushIssue(warnings, 'mobility.item_ratio_low', `mobilityChangingItemRatio ${(mobilityChangingItemRatio * 100).toFixed(1)}% < 10%.`, { value: mobilityChangingItemRatio });
  }

  return {
    passed: hardFailures.length === 0,
    status: hardFailures.length > 0 ? 'fail' : warnings.length > 0 ? 'pass_with_warnings' : 'pass',
    hardFailures,
    warnings,
    summary: {
      hardFailureCount: hardFailures.length,
      warningCount: warnings.length,
      regressionPassed: regression.passed,
      items: coverage.totals?.items ?? items.length,
      configs: coverage.totals?.configs ?? 0
    }
  };
}

export function runQualityGate() {
  const regression = runRegressionSuite();
  const coverage = runCoverage();
  return {
    gate: evaluateQualityGate(regression, coverage),
    regression: {
      passed: regression.passed,
      summary: regression.summary,
      failures: regression.failures
    },
    coverage
  };
}

const button = document.querySelector('#run-quality-gate');
if (button) {
  button.addEventListener('click', () => {
    const output = document.querySelector('#quality-output');
    try {
      output.textContent = JSON.stringify(runQualityGate(), null, 2);
    } catch (error) {
      output.textContent = JSON.stringify({ gate: { passed: false, status: 'fatal' }, fatal: String(error?.stack ?? error) }, null, 2);
    }
  });
}
