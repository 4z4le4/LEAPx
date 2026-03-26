-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "currentWalkins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walkinCapacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walkinEnabled" BOOLEAN NOT NULL DEFAULT false;
