-- CreateEnum
CREATE TYPE "StorageCondition" AS ENUM ('AMBIENTE', 'REFRIGERADO', 'CONGELADO');

-- CreateEnum
CREATE TYPE "DonationAction" AS ENUM ('CRIADA', 'CASADA', 'AGENDADA', 'DESAGENDADA', 'COLETADA', 'CONFIRMADA', 'CANCELADA', 'VENCIDA');

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "storageCondition" "StorageCondition" NOT NULL DEFAULT 'AMBIENTE',
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "donation_events" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "action" "DonationAction" NOT NULL,
    "fromStatus" "DonationStatus",
    "toStatus" "DonationStatus" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donation_events_donationId_createdAt_idx" ON "donation_events"("donationId", "createdAt");

-- AddForeignKey
ALTER TABLE "donation_events" ADD CONSTRAINT "donation_events_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_events" ADD CONSTRAINT "donation_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

