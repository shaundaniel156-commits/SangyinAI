-- Sign-up by a code sent to the email OR by text message, as the person chooses (one code, not two).

-- When an account's email address and phone number were proven (by typing in a code sent there).
-- Empty for every existing account: not known.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- TEMPORARY (testing-period sign-up): one code and one count of tries, and where the code went.
-- Sign-ups still waiting from before keep their row but have no code that can match, so they are started again.
ALTER TABLE "PendingSignup" DROP COLUMN "emailCodeHash",
DROP COLUMN "phoneCodeHash",
DROP COLUMN "emailAttempts",
DROP COLUMN "phoneAttempts",
ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN "codeHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- TEMPORARY (testing-period sign-up): how each code was sent, to limit text messages apart from emails.
-- "onceKey" is set on a record that may exist only once (a notice to one address on one day).
ALTER TABLE "SignupSend" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'email',
ADD COLUMN "onceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SignupSend_onceKey_key" ON "SignupSend"("onceKey");

-- CreateIndex
CREATE INDEX "SignupSend_channel_createdAt_idx" ON "SignupSend"("channel", "createdAt");
