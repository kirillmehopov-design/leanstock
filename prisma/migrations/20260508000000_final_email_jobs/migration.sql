-- AlterTable: add email verification and password reset fields to User
ALTER TABLE "User"
  ADD COLUMN "emailVerified"          BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "emailVerifyToken"       TEXT,
  ADD COLUMN "emailVerifyExpiresAt"   TIMESTAMP(3),
  ADD COLUMN "passwordResetToken"     TEXT,
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailVerifyToken_key"    ON "User"("emailVerifyToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key"  ON "User"("passwordResetToken");
CREATE INDEX "User_emailVerifyToken_idx"           ON "User"("emailVerifyToken");
CREATE INDEX "User_passwordResetToken_idx"         ON "User"("passwordResetToken");
