-- CreateTable
CREATE TABLE "UserFCMToken" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "token" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFCMToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFCMToken_token_key" ON "UserFCMToken"("token");

-- CreateIndex
CREATE INDEX "UserFCMToken_user_id_idx" ON "UserFCMToken"("user_id");

-- CreateIndex
CREATE INDEX "UserFCMToken_isActive_idx" ON "UserFCMToken"("isActive");

-- AddForeignKey
ALTER TABLE "UserFCMToken" ADD CONSTRAINT "UserFCMToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
