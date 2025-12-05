-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "claimId" TEXT,
    "decision" TEXT,
    "hookName" TEXT,
    "details" TEXT,
    "source" TEXT NOT NULL DEFAULT 'agent'
);
