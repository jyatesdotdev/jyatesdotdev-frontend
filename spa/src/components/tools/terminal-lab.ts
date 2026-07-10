export interface OnCallSession {
  status: 'idle' | 'active' | 'resolved';
  attempts: number;
  hints: number;
}

export const INITIAL_ONCALL_SESSION: OnCallSession = {
  status: 'idle',
  attempts: 0,
  hints: 0,
};

export const INCIDENT_FILES: Record<string, string[]> = {
  'incident/README.md': [
    '# INC-2026-0710: checkout-targeting elevated errors',
    '',
    'Severity: SEV-2',
    'Alerted: 2026-07-10 02:14 UTC',
    'Service: checkout-targeting-api',
    '',
    'Symptoms:',
    '- HTTP 5xx above 18%',
    '- p99 latency above 2 seconds',
    '- DynamoDB throttling on one partition',
    '',
    'Identify the failure mode from app.log, metrics.json, deploys.log, and runbook.md.',
    'Submit the cause with: oncall resolve <cause>',
  ],
  'incident/app.log': [
    '2026-07-10T02:12:58Z INFO  version=8f3c1d7 boot complete region=us-west-2',
    '2026-07-10T02:13:04Z INFO  config retry_max_attempts=12 retry_jitter_ms=0',
    '2026-07-10T02:13:41Z WARN  dependency=dynamodb attempt=4 latency_ms=188',
    '2026-07-10T02:13:42Z WARN  dependency=dynamodb attempt=8 latency_ms=406',
    '2026-07-10T02:13:44Z ERROR request=7bf2 dependency=dynamodb error=ProvisionedThroughputExceeded attempts=12',
    '2026-07-10T02:13:45Z WARN  queue_depth=1842 retry_rate=8.7',
    '2026-07-10T02:13:47Z ERROR request=2d91 status=503 latency_ms=2118 attempts=12',
    '2026-07-10T02:14:02Z WARN  partition=campaign#prime-day consumed_capacity_pct=100',
    '2026-07-10T02:14:05Z ERROR request=93aa status=503 latency_ms=2374 attempts=12',
    '2026-07-10T02:14:09Z WARN  circuit_breaker=closed retry_rate=11.4',
    '2026-07-10T02:14:12Z ERROR request=c482 status=503 latency_ms=2481 attempts=12',
  ],
  'incident/metrics.json': [
    '{',
    '  "service": "checkout-targeting-api",',
    '  "window": "02:10-02:20 UTC",',
    '  "before": { "error_rate": 0.002, "p99_ms": 37, "retries_per_request": 0.04 },',
    '  "after":  { "error_rate": 0.184, "p99_ms": 2481, "retries_per_request": 11.4 },',
    '  "dynamodb": {',
    '    "table_capacity_pct": 41,',
    '    "hottest_partition_capacity_pct": 100,',
    '    "throttled_requests": 13822',
    '  }',
    '}',
  ],
  'incident/deploys.log': [
    '2026-07-09T18:22:10Z  91b782a  success  dependency refresh',
    '2026-07-10T02:12:31Z  8f3c1d7  success  retry-policy rollout',
    '  RETRY_MAX_ATTEMPTS: 3 -> 12',
    '  RETRY_JITTER_MS:   250 -> 0',
    '  CIRCUIT_BREAKER:    enabled -> disabled',
  ],
  'incident/runbook.md': [
    '# Dependency saturation',
    '',
    '1. Compare the first error with recent deploys.',
    '2. Distinguish table-wide exhaustion from a hot partition.',
    '3. Check whether client retries amplify throttling.',
    '4. Restore bounded exponential backoff with jitter before scaling capacity.',
  ],
};

const HINTS = [
  'The table is only at 41% overall capacity. Look for a client-side amplifier.',
  'Compare retry settings immediately before and after deploy 8f3c1d7.',
  "The expected cause is named 'retry-storm'.",
];

export function runOnCall(
  args: string[],
  session: OnCallSession,
  update: (session: OnCallSession) => void
): string[] {
  const action = args[0] || 'status';

  if (action === 'start') {
    if (session.status === 'active') return ['INC-2026-0710 is already active. Evidence: ~/incident'];
    if (session.status === 'resolved') return ['INC-2026-0710 is resolved. Run oncall reset to replay.'];
    update({ status: 'active', attempts: 0, hints: 0 });
    return [
      'PAGE: INC-2026-0710 / SEV-2',
      'checkout-targeting-api: error rate 18.4%, p99 2481 ms',
      'Evidence mounted read-only at ~/incident',
      "Resolve with: oncall resolve <cause>  (use 'oncall hint' if needed)",
    ];
  }

  if (action === 'status') {
    if (session.status === 'idle') return ["No active page. Run 'oncall start' to begin."];
    if (session.status === 'resolved') return ['INC-2026-0710: resolved', 'Root cause: retry-storm'];
    return [
      'INC-2026-0710: ACTIVE / SEV-2',
      `Attempts: ${session.attempts}  Hints: ${session.hints}`,
      'Evidence: ~/incident',
    ];
  }

  if (action === 'hint') {
    if (session.status !== 'active') return ['oncall: start the incident before requesting a hint'];
    const hintIndex = Math.min(session.hints, HINTS.length - 1);
    update({ ...session, hints: Math.min(session.hints + 1, HINTS.length) });
    return [`Hint ${hintIndex + 1}: ${HINTS[hintIndex]}`];
  }

  if (action === 'resolve') {
    if (session.status !== 'active') return ['oncall: there is no active incident'];
    const cause = args.slice(1).join('-').toLowerCase();
    if (!cause) return ['oncall: provide a cause (oncall resolve <cause>)'];
    if (cause !== 'retry-storm') {
      update({ ...session, attempts: session.attempts + 1 });
      return [
        `Resolution rejected: '${cause}' does not explain the retry amplification.`,
        'Keep correlating the deploy, app log, and capacity metrics.',
      ];
    }
    const score = Math.max(0, 100 - session.attempts * 15 - session.hints * 10);
    update({ ...session, status: 'resolved' });
    return [
      'INC-2026-0710 RESOLVED',
      'Root cause: deploy 8f3c1d7 removed jitter and raised retries from 3 to 12,',
      'creating a retry storm against one hot DynamoDB partition.',
      'Mitigation: rolled back retry policy; restored jitter and circuit breaker.',
      `Incident score: ${score}/100`,
    ];
  }

  if (action === 'reset') {
    update(INITIAL_ONCALL_SESSION);
    return ['On-call lab reset.'];
  }

  return [`oncall: unknown action: ${action} (start, status, hint, resolve, reset)`];
}

export function runSmartctl(args: string[]): string[] {
  if (args.includes('--scan')) {
    return ['/dev/mybook -d sat # simulated WD My Book 25EE'];
  }

  const device = args.find((value) => value.startsWith('/dev/'));
  if (!device) return ['smartctl: specify /dev/mybook (or use --scan)'];
  if (device !== '/dev/mybook') return [`smartctl: cannot open ${device}: no such simulated device`];
  const unknown = args.find(
    (value) => value.startsWith('-') && !['-a', '--all', '-H', '--health'].includes(value)
  );
  if (unknown) return [`smartctl: unknown option: ${unknown}`];

  const health = [
    '=== START OF READ SMART DATA SECTION ===',
    'SMART overall-health self-assessment test result: PASSED',
  ];
  if (args.includes('-H') || args.includes('--health')) return health;
  return [
    'smartctl 7.4 (jsh simulated device)',
    '=== START OF INFORMATION SECTION ===',
    'Device Model:     WDC WD80EDAZ-11TA3A0 (My Book)',
    'Serial Number:    REDACTED-JYATES-DEV',
    'User Capacity:    8,001,563,222,016 bytes [8.00 TB]',
    'Transport:        simulated SAT bridge',
    '',
    ...health,
    'ID# ATTRIBUTE_NAME          VALUE WORST THRESH RAW_VALUE',
    '  5 Reallocated_Sector_Ct   200   200   140   0',
    '  9 Power_On_Hours          097   097   000   2841',
    '194 Temperature_Celsius     113   105   000   34',
    '197 Current_Pending_Sector  200   200   000   0',
    '198 Offline_Uncorrectable   200   200   000   0',
    '',
    'No Errors Logged',
    'Real macOS setup: open blog/wd-smart-reader',
  ];
}
