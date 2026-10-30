import { createCspReportHandler, logCspViolation } from '@/lib/security/csp-report'

// POST only. No GET/HEAD/etc. export, so Next answers every other method with 405 (OPS-001 FW-10 also denies them).
// Always 204 (SEC-001 F-11). Filesystem handlers win over the /api/* rewrite to Railway (ARCH-001 18.2).
// The logic, size cap and PII rules live in lib/security/csp-report.ts; TASK-122 swaps the sink.
export const dynamic = 'force-dynamic'

export const POST = createCspReportHandler(logCspViolation)
