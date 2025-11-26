-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyNumber" TEXT NOT NULL,
    "claimantName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "damageType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dateOfLoss" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "decision" TEXT,
    "fraudRisk" TEXT,
    "aiReasoning" TEXT,
    "weatherEvent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
