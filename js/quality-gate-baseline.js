import { DATA_VERSION } from './schema.js';
import { runRegressionSuite } from './test-runner.js';
import { runCoverage } from './coverage.js';
import { evaluateQualityGate } from './quality-gate.js';
import { captureCoverageBaseline, evaluateCoverageBaseline } from './coverage-baseline.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const baseline = await fetch('./data/COVERAGE_BASELINE.json').then(r => r.json());

export function evaluateBaselineQualityGate(regression, coverage, sourceItems, sourceBaseline, dataVersion = DATA_VERSION) {
  const foundation = evaluateQualityGate(regression, coverage, sourceItems);
  const baselineResult = evaluateCoverageBaseline(coverage, sourceBaseline, {
    dataVersion,
    itemCount: sourceItems?.length
  });
  const hardFailures = [...foundation.hardFailures, ...baselineResult.hardFailures];
  const warnings = [...foundation.warnings, ...baselineResult.warnings];

  return {
    passed: hardFailures.length === 0,
    status: hardFailures.length > 0 ? 'fail' : warnings.length > 0 ? 'pass_with_warnings' : 'pass',
    hardFailures,
    warnings,
    summary: {
      ...foundation.summary,
      hardFailureCount: hardFailures.length,
      warningCount: warnings.length,
      baselineSchemaVersion: sourceBaseline?.schemaVersion ?? null,
      baselineItemCount: sourceBaseline?.itemCount ?? null,
      baselineTrackedConfigs: Object.keys(sourceBaseline?.configs ?? {}).length
    }
  };
}

export function captureCurrentCoverageBaseline() {
  const coverage = runCoverage();
  return captureCoverageBaseline(coverage, {
    dataVersion: DATA_VERSION,
    itemCount: items.length
  });
}

export function runBaselineQualityGate() {
  const regression = runRegressionSuite();
  const coverage = runCoverage();
  return {
    gate: evaluateBaselineQualityGate(regression, coverage, items, baseline, DATA_VERSION),
    regression: {
      passed: regression.passed,
      summary: regression.summary,
      failures: regression.failures
    },
    baseline,
    coverage
  };
}

const runButton = document.querySelector('#run-baseline-quality-gate');
if (runButton) {
  runButton.addEventListener('click', () => {
    const output = document.querySelector('#quality-output');
    try {
      output.textContent = JSON.stringify(runBaselineQualityGate(), null, 2);
    } catch (error) {
      output.textContent = JSON.stringify({ gate: { passed: false, status: 'fatal' }, fatal: String(error?.stack ?? error) }, null, 2);
    }
  });
}

const captureButton = document.querySelector('#capture-baseline');
if (captureButton) {
  captureButton.addEventListener('click', () => {
    const output = document.querySelector('#baseline-output');
    try {
      output.textContent = JSON.stringify(captureCurrentCoverageBaseline(), null, 2);
    } catch (error) {
      output.textContent = JSON.stringify({ error: String(error?.stack ?? error) }, null, 2);
    }
  });
}
