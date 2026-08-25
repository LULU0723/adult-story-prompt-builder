export const COVERAGE_BASELINE_SCHEMA_VERSION = 1;
export const DEFAULT_POOL_TOLERANCE = 0.15;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function is232(config) {
  const slots = config?.slotsByStage;
  return slots?.['1'] === 2 && slots?.['2'] === 3 && slots?.['3'] === 2;
}

function issue(target, code, detail, extra = {}) {
  target.push({ code, detail, ...extra });
}

export function captureCoverageBaseline(coverage, { dataVersion, itemCount } = {}) {
  const configs = {};
  for (const [name, config] of Object.entries(coverage?.byConfig ?? {})) {
    if (!is232(config)) continue;
    configs[name] = {
      eligibleItems: config.eligibleItems,
      avgEligiblePool: config.avgEligiblePool,
      avgEligiblePoolByStage: {
        '1': config.avgEligiblePoolByStage?.['1'],
        '2': config.avgEligiblePoolByStage?.['2'],
        '3': config.avgEligiblePoolByStage?.['3']
      },
      mobilityObserved: config.mobilityRunRatio > 0,
      preservationObserved: config.preservationRejections > 0
    };
  }

  return {
    schemaVersion: COVERAGE_BASELINE_SCHEMA_VERSION,
    dataVersion: dataVersion ?? null,
    itemCount: itemCount ?? coverage?.totals?.items ?? null,
    tolerance: DEFAULT_POOL_TOLERANCE,
    scope: '232-only',
    configs
  };
}

export function evaluateCoverageBaseline(coverage, baseline, { dataVersion, itemCount } = {}) {
  const hardFailures = [];
  const warnings = [];

  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) {
    issue(hardFailures, 'baseline.malformed', 'Coverage baseline is missing or invalid.');
    return { hardFailures, warnings };
  }
  if (baseline.schemaVersion !== COVERAGE_BASELINE_SCHEMA_VERSION) {
    issue(hardFailures, 'baseline.schema_version', `Unsupported baseline schemaVersion ${baseline.schemaVersion}.`);
  }
  if (!isFiniteNumber(baseline.tolerance) || baseline.tolerance < 0 || baseline.tolerance >= 1) {
    issue(hardFailures, 'baseline.malformed', 'Baseline tolerance must be a finite number in [0, 1).');
  }
  if (baseline.scope !== '232-only') {
    issue(hardFailures, 'baseline.malformed', `Unsupported baseline scope '${baseline.scope}'.`);
  }
  if (!baseline.configs || typeof baseline.configs !== 'object' || Array.isArray(baseline.configs) || Object.keys(baseline.configs).length === 0) {
    issue(hardFailures, 'baseline.malformed', 'Baseline must contain at least one tracked config.');
  }
  if (hardFailures.length > 0) return { hardFailures, warnings };

  const currentItemCount = itemCount ?? coverage?.totals?.items;
  if (isFiniteNumber(baseline.itemCount) && isFiniteNumber(currentItemCount) && baseline.itemCount !== currentItemCount) {
    issue(warnings, 'baseline.item_count_changed', `Fixture count changed from ${baseline.itemCount} to ${currentItemCount}; review and refresh the baseline after validating the content batch.`, { baseline: baseline.itemCount, current: currentItemCount });
  }
  if (baseline.dataVersion != null && dataVersion != null && baseline.dataVersion !== dataVersion) {
    issue(warnings, 'baseline.data_version_changed', `dataVersion changed from ${baseline.dataVersion} to ${dataVersion}; baseline comparability should be reviewed.`, { baseline: baseline.dataVersion, current: dataVersion });
  }

  const tolerance = baseline.tolerance;
  const currentConfigs = coverage?.byConfig ?? {};

  for (const [name, expected] of Object.entries(baseline.configs)) {
    const current = currentConfigs[name];
    if (!current) {
      issue(hardFailures, 'baseline.config_missing', `${name}: tracked canonical config is missing from current coverage.`, { config: name });
      continue;
    }
    if (!is232(current)) {
      issue(hardFailures, 'baseline.config_shape_changed', `${name}: tracked config is no longer a 2/3/2 configuration.`, { config: name });
      continue;
    }

    if (!isFiniteNumber(expected.eligibleItems) || !isFiniteNumber(current.eligibleItems)) {
      issue(hardFailures, 'baseline.malformed_metric', `${name}: eligibleItems baseline/current value is invalid.`, { config: name, metric: 'eligibleItems' });
    } else if (current.eligibleItems < expected.eligibleItems) {
      issue(hardFailures, 'baseline.eligible_items_regressed', `${name}: eligibleItems fell from ${expected.eligibleItems} to ${current.eligibleItems}.`, { config: name, baseline: expected.eligibleItems, current: current.eligibleItems });
    }

    const comparePool = (metric, currentValue, baselineValue, stage = null) => {
      if (!isFiniteNumber(currentValue) || !isFiniteNumber(baselineValue) || baselineValue < 0) {
        issue(hardFailures, 'baseline.malformed_metric', `${name}: ${metric} baseline/current value is invalid.`, { config: name, metric, stage });
        return;
      }
      const minimum = baselineValue * (1 - tolerance);
      if (currentValue < minimum) {
        issue(hardFailures, 'baseline.pool_regression', `${name}: ${metric}${stage ? ` Stage ${stage}` : ''} ${currentValue.toFixed(2)} is more than ${(tolerance * 100).toFixed(0)}% below baseline ${baselineValue.toFixed(2)}.`, { config: name, metric, stage, baseline: baselineValue, current: currentValue, minimum });
      }
    };

    comparePool('avgEligiblePool', current.avgEligiblePool, expected.avgEligiblePool);
    for (const stage of ['1', '2', '3']) {
      comparePool('avgEligiblePoolByStage', current.avgEligiblePoolByStage?.[stage], expected.avgEligiblePoolByStage?.[stage], stage);
    }

    if (expected.mobilityObserved === true && !(current.mobilityRunRatio > 0)) {
      issue(warnings, 'baseline.mobility_observation_lost', `${name}: mobility was observed in the baseline but is now absent.`, { config: name });
    }
    if (expected.preservationObserved === true && !(current.preservationRejections > 0)) {
      issue(warnings, 'baseline.preservation_observation_lost', `${name}: preservation rejections were observed in the baseline but are now absent.`, { config: name });
    }
  }

  return { hardFailures, warnings };
}
