-- TEMPORARY: testing-period sign-up. Nothing existing is changed. When sign-up is removed, a later migration can
-- simply drop these two tables.

-- People who have filled in the sign-up form but not yet typed in their codes.
CREATE TABLE "PendingSignup" (
    "id" TEXT NOT NULL,
    "ticketHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "schoolType" "InstitutionType" NOT NULL DEFAULT 'primary',
    "framework" "Framework" NOT NULL DEFAULT 'uganda',
    "passwordHash" TEXT NOT NULL,
    "emailCodeHash" TEXT NOT NULL,
    "phoneCodeHash" TEXT NOT NULL,
    "emailAttempts" INTEGER NOT NULL DEFAULT 0,
    "phoneAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingSignup_ticketHash_key" ON "PendingSignup"("ticketHash");

-- CreateIndex
CREATE INDEX "PendingSignup_email_idx" ON "PendingSignup"("email");

-- Each time sign-up codes were sent, to limit how many go to one phone, one email, and in all.
CREATE TABLE "SignupSend" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignupSend_phone_createdAt_idx" ON "SignupSend"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "SignupSend_email_createdAt_idx" ON "SignupSend"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SignupSend_createdAt_idx" ON "SignupSend"("createdAt");
