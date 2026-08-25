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

function hasOwn(value, key) {
  return value != null && Object.prototype.hasOwnProperty.call(value, key);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function evaluateQualityGate(regression, coverage, sourceItems = null) {
  const hardFailures = [];
  const warnings = [];

  if (!regression || typeof regression.passed !== 'boolean' || !Array.isArray(regression.failures)) {
    pushIssue(hardFailures, 'gate.malformed_regression', 'Regression result is missing required fields.');
  } else if (!regression.passed) {
    pushIssue(hardFailures, 'regression.failed', `Regression suite reported ${regression.failures.length} captured failure(s).`);
  }

  const requiredCoverageFields = ['validation', 'totals', 'byConfig', 'deadItems', 'neverSelected'];
  for (const field of requiredCoverageFields) {
    if (!hasOwn(coverage, field)) {
      pushIssue(hardFailures, 'gate.malformed_coverage', `coverage.${field} missing.`, { field });
    }
  }

  if (!Array.isArray(coverage?.validation?.errors)) {
    pushIssue(hardFailures, 'gate.malformed_coverage', 'coverage.validation.errors missing or invalid.', { field: 'validation.errors' });
  }
  if (!Array.isArray(coverage?.deadItems)) {
    pushIssue(hardFailures, 'gate.malformed_coverage', 'coverage.deadItems missing or invalid.', { field: 'deadItems' });
  }
  if (!Array.isArray(coverage?.neverSelected)) {
    pushIssue(hardFailures, 'gate.malformed_coverage', 'coverage.neverSelected missing or invalid.', { field: 'neverSelected' });
  }
  if (!Array.isArray(sourceItems) || sourceItems.length === 0) {
    pushIssue(hardFailures, 'gate.malformed_items', 'Fixture data is missing or empty.');
  }

  const configs = coverage?.byConfig && typeof coverage.byConfig === 'object' && !Array.isArray(coverage.byConfig) ? coverage.byConfig : {};
  if (Object.keys(configs).length === 0) {
    pushIssue(hardFailures, 'gate.no_configs', 'Coverage produced no canonical configs.');
  }

  const schemaErrors = Array.isArray(coverage?.validation?.errors) ? coverage.validation.errors : [];
  if (schemaErrors.length > 0) {
    pushIssue(hardFailures, 'schema.errors', `Dataset has ${schemaErrors.length} schema validation error(s).`);
  }

  if (Array.isArray(coverage?.deadItems) && coverage.deadItems.length > 0) {
    pushIssue(hardFailures, 'coverage.dead_items', `Dead items: ${coverage.deadItems.join(', ')}`);
  }
  if (Array.isArray(coverage?.neverSelected) && coverage.neverSelected.length > 0) {
    pushIssue(hardFailures, 'coverage.never_selected', `Never-selected items: ${coverage.neverSelected.join(', ')}`);
  }

  const requiredConfigFields = ['runs', 'anchorsFound', 'emptyRate', 'avgEligiblePoolByStage', 'mobilityRunRatio', 'preservationRejections'];

  for (const [name, config] of Object.entries(configs)) {
    let malformed = false;
    for (const field of requiredConfigFields) {
      if (!hasOwn(config, field)) {
        pushIssue(hardFailures, 'gate.malformed_config', `${name}: ${field} missing.`, { config: name, field });
        malformed = true;
      }
    }
    if (malformed) continue;

    const numericFields = ['runs', 'anchorsFound', 'emptyRate', 'mobilityRunRatio', 'preservationRejections'];
    for (const field of numericFields) {
      if (!isFiniteNumber(config[field])) {
        pushIssue(hardFailures, 'gate.malformed_config', `${name}: ${field} is not a finite number.`, { config: name, field });
        malformed = true;
      }
    }
    if (malformed) continue;

    if (config.runs <= 0) {
      pushIssue(hardFailures, 'gate.malformed_config', `${name}: runs must be greater than 0.`, { config: name, field: 'runs', value: config.runs });
      continue;
    }
    if (config.anchorsFound < 0 || config.anchorsFound > config.runs) {
      pushIssue(hardFailures, 'gate.malformed_config', `${name}: anchorsFound ${config.anchorsFound} is outside 0..${config.runs}.`, { config: name, field: 'anchorsFound', value: config.anchorsFound });
      continue;
    }
    if (config.emptyRate < 0 || config.emptyRate > 1 || config.mobilityRunRatio < 0 || config.mobilityRunRatio > 1 || config.preservationRejections < 0) {
      pushIssue(hardFailures, 'gate.malformed_config', `${name}: one or more numeric metrics are outside their valid range.`, { config: name });
      continue;
    }

    if (config.anchorsFound < config.runs) {
      pushIssue(hardFailures, 'coverage.no_anchor_runs', `${name}: anchors found ${config.anchorsFound}/${config.runs}.`, { config: name });
    }
    if (config.emptyRate >= 0.15) {
      pushIssue(hardFailures, 'coverage.empty_rate', `${name}: emptyRate ${(config.emptyRate * 100).toFixed(1)}% >= 15%.`, { config: name, value: config.emptyRate });
    }

    const stagePools = config.avgEligiblePoolByStage;
    for (const stage of ['1', '2', '3']) {
      if (!hasOwn(stagePools, stage)) {
        pushIssue(hardFailures, 'gate.malformed_config', `${name}: avgEligiblePoolByStage.${stage} missing.`, { config: name, field: `avgEligiblePoolByStage.${stage}` });
        continue;
      }
      const pool = stagePools[stage];
      if (!isFiniteNumber(pool)) {
        pushIssue(hardFailures, 'gate.malformed_config', `${name}: avgEligiblePoolByStage.${stage} is not a finite number.`, { config: name, field: `avgEligiblePoolByStage.${stage}` });
      } else if (pool < 0) {
        pushIssue(hardFailures, 'gate.malformed_config', `${name}: avgEligiblePoolByStage.${stage} must not be negative.`, { config: name, field: `avgEligiblePoolByStage.${stage}`, value: pool });
      } else if (pool < 4) {
        pushIssue(warnings, 'coverage.stage_pool_narrow', `${name}: Stage ${stage} avgEligiblePool ${pool.toFixed(2)} < 4.`, { config: name, stage: Number(stage), value: pool });
      }
    }

    const s1 = stagePools?.['1'];
    const s3 = stagePools?.['3'];
    if (isFiniteNumber(s1) && isFiniteNumber(s3) && s1 > 0 && s3 / s1 < 0.5) {
      pushIssue(warnings, 'coverage.stage3_ratio', `${name}: S3/S1 ${(s3 / s1).toFixed(2)} < 0.50.`, { config: name, value: s3 / s1 });
    }

    if (config.mobilityRunRatio > 0 && config.preservationRejections === 0) {
      pushIssue(warnings, 'mobility.observed_without_preservation', `${name}: mobility changes occur, but preservationRejections is 0; verify the state change has structural effect.`, { config: name, mobilityRunRatio: config.mobilityRunRatio });
    }
  }

  if (Array.isArray(sourceItems)) {
    for (const [cluster, count] of clusterCounts(sourceItems)) {
      if (cluster !== '(none)' && count === 1) {
        pushIssue(warnings, 'fixture.singleton_cluster', `Cluster '${cluster}' contains only one item.`, { cluster });
      }
    }
  }

  if (!hasOwn(coverage?.totals, 'mobilityChangingItemRatio')) {
    pushIssue(hardFailures, 'gate.malformed_coverage', 'coverage.totals.mobilityChangingItemRatio missing.', { field: 'totals.mobilityChangingItemRatio' });
  } else if (!isFiniteNumber(coverage.totals.mobilityChangingItemRatio) || coverage.totals.mobilityChangingItemRatio < 0 || coverage.totals.mobilityChangingItemRatio > 1) {
    pushIssue(hardFailures, 'gate.malformed_coverage', 'coverage.totals.mobilityChangingItemRatio is invalid.', { field: 'totals.mobilityChangingItemRatio' });
  } else if (coverage.totals.mobilityChangingItemRatio < 0.10) {
    pushIssue(warnings, 'mobility.item_ratio_low', `mobilityChangingItemRatio ${(coverage.totals.mobilityChangingItemRatio * 100).toFixed(1)}% < 10%.`, { value: coverage.totals.mobilityChangingItemRatio });
  }

  return {
    passed: hardFailures.length === 0,
    status: hardFailures.length > 0 ? 'fail' : warnings.length > 0 ? 'pass_with_warnings' : 'pass',
    hardFailures,
    warnings,
    summary: {
      hardFailureCount: hardFailures.length,
      warningCount: warnings.length,
      regressionPassed: regression?.passed === true,
      items: coverage?.totals?.items ?? (Array.isArray(sourceItems) ? sourceItems.length : 0),
      configs: coverage?.totals?.configs ?? 0
    }
  };
}

export function runQualityGate() {
  const regression = runRegressionSuite();
  const coverage = runCoverage();
  return {
    gate: evaluateQualityGate(regression, coverage, items),
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
