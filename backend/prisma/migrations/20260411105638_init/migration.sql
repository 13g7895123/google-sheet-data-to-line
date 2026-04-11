-- CreateTable
CREATE TABLE "GoogleSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spreadsheetId" TEXT NOT NULL,
    "spreadsheetName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SheetTab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "googleSheetId" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "gid" TEXT NOT NULL,
    CONSTRAINT "SheetTab_googleSheetId_fkey" FOREIGN KEY ("googleSheetId") REFERENCES "GoogleSheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LineFriend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lineUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "pictureUrl" TEXT,
    "statusMessage" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "googleSheetId" TEXT,
    "sheetTabId" TEXT,
    "messageTemplate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Case_googleSheetId_fkey" FOREIGN KEY ("googleSheetId") REFERENCES "GoogleSheet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Case_sheetTabId_fkey" FOREIGN KEY ("sheetTabId") REFERENCES "SheetTab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "lineFriendId" TEXT NOT NULL,
    CONSTRAINT "CaseRecipient_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseRecipient_lineFriendId_fkey" FOREIGN KEY ("lineFriendId") REFERENCES "LineFriend" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "cronExpression" TEXT,
    "scheduledAt" DATETIME,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Schedule_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SendLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "lineUserId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL DEFAULT '',
    "messageContent" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SendLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SendLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "googleServiceAccountEmail" TEXT NOT NULL DEFAULT '',
    "googlePrivateKey" TEXT NOT NULL DEFAULT '',
    "lineChannelAccessToken" TEXT NOT NULL DEFAULT '',
    "lineChannelSecret" TEXT NOT NULL DEFAULT ''
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleSheet_spreadsheetId_key" ON "GoogleSheet"("spreadsheetId");

-- CreateIndex
CREATE UNIQUE INDEX "LineFriend_lineUserId_key" ON "LineFriend"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseRecipient_caseId_lineFriendId_key" ON "CaseRecipient"("caseId", "lineFriendId");
