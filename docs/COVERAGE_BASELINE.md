# Coverage Baseline Policy

This checkpoint adds cross-version regression checks on top of the existing Quality Gate.

## Scope

Only canonical configurations with `slotsByStage = {1:2, 2:3, 3:2}` are eligible for numeric baseline comparison. The 1/1/1 configurations are intentionally excluded because seed-prefix stability testing at 100 runs showed materially higher variance in Stage 2.

The baseline records, per tracked 2/3/2 config:

- `eligibleItems`
- `avgEligiblePool`
- `avgEligiblePoolByStage` for stages 1, 2, and 3
- whether mobility changes were observed at least once
- whether anchor-preservation rejections were observed at least once

## Regression policy

Pool metrics use a 15% downward tolerance. A current pool value that falls below `baseline * 0.85` is a hard failure.

`eligibleItems` may increase as fixture data expands, but a decrease is a hard failure for a tracked canonical configuration.

`emptyRate` remains governed by the existing absolute Quality Gate threshold and is not compared relatively against the baseline.

`mobilityRunRatio` and `preservationRejections` are not frozen as numeric values because seed-stability review showed that event-count metrics are substantially more variable than pool metrics. The baseline stores only observed/not-observed booleans; losing a previously observed behavior produces a warning rather than a hard failure.

## Metadata

`data/COVERAGE_BASELINE.json` includes:

- baseline schema version
- project `dataVersion`
- fixture `itemCount`
- tolerance
- scope

A changed fixture count or `dataVersion` produces a warning so an intentional content/schema change is visible without blocking the batch before review.

## Refresh workflow

The baseline must only be refreshed after a validated content checkpoint.

1. Run `quality.html` from a local static HTTP server.
2. Use **Capture current baseline JSON**.
3. Review the captured output and confirm it contains only 2/3/2 canonical configs.
4. Replace `data/COVERAGE_BASELINE.json` with the captured JSON.
5. Re-run the Quality Gate. The validated checkpoint should have no baseline regression failures.
6. Review the baseline update separately from unrelated engine or fixture changes.

The initial 29-item baseline is intentionally not guessed from partial review notes. The exact JSON must be captured from the canonical `runCoverage()` output and externally smoke-verified before PR #10 is merged.

## Deferred

- anchor HHI baseline thresholds
- numeric mobility/preservation event baselines
- 1/1/1 pool baselines at 100 runs
