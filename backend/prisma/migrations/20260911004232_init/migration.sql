-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOADOR', 'RECEPTOR');

-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('MERCADO', 'RESTAURANTE', 'FEIRA', 'OUTRO');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('ONG', 'FAMILIA');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('PERECIVEL', 'NAO_PERECIVEL', 'PREPARADO', 'HORTIFRUTI', 'PADARIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('DISPONIVEL', 'RESERVADA', 'AGENDADA', 'COLETADA', 'ENTREGUE', 'CANCELADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "PickupRouteStatus" AS ENUM ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DOADOR',
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donors" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" "DonorType" NOT NULL DEFAULT 'OUTRO',
    "document" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipients" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" "RecipientType" NOT NULL DEFAULT 'ONG',
    "document" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "peopleServed" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "capacityKg" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "category" "FoodCategory" NOT NULL DEFAULT 'OUTRO',
    "description" TEXT NOT NULL,
    "estimatedQuantityKg" DECIMAL(10,2) NOT NULL,
    "collectedQuantityKg" DECIMAL(10,2),
    "bestBeforeDate" TIMESTAMP(3),
    "pickupWindowStart" TIMESTAMP(3) NOT NULL,
    "pickupWindowEnd" TIMESTAMP(3) NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "recipientId" TEXT,
    "matchedAt" TIMESTAMP(3),
    "routeId" TEXT,
    "collectedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickup_routes" (
    "id" TEXT NOT NULL,
    "routeNumber" SERIAL NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "status" "PickupRouteStatus" NOT NULL DEFAULT 'PLANEJADA',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "departedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "donors_userId_key" ON "donors"("userId");

-- CreateIndex
CREATE INDEX "donors_active_idx" ON "donors"("active");

-- CreateIndex
CREATE UNIQUE INDEX "recipients_userId_key" ON "recipients"("userId");

-- CreateIndex
CREATE INDEX "recipients_active_idx" ON "recipients"("active");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_document_key" ON "volunteers"("document");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE INDEX "donations_donorId_idx" ON "donations"("donorId");

-- CreateIndex
CREATE INDEX "donations_recipientId_idx" ON "donations"("recipientId");

-- CreateIndex
CREATE INDEX "donations_routeId_idx" ON "donations"("routeId");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pickup_routes_routeNumber_key" ON "pickup_routes"("routeNumber");

-- CreateIndex
CREATE INDEX "pickup_routes_status_idx" ON "pickup_routes"("status");

-- AddForeignKey
ALTER TABLE "donors" ADD CONSTRAINT "donors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "donors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "pickup_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_routes" ADD CONSTRAINT "pickup_routes_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_routes" ADD CONSTRAINT "pickup_routes_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "volunteers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
