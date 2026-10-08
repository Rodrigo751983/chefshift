/*
  Warnings:

  - Made the column `created_at` on table `kok_push` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sent_at` on table `kok_reminder` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reported_at` on table `shift_end` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `user_source` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "ShiftStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "applications" ALTER COLUMN "submitted_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "kok_push" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "kok_reminder" ALTER COLUMN "sent_at" SET NOT NULL,
ALTER COLUMN "sent_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shift_end" ADD COLUMN     "dispute_reason" TEXT,
ADD COLUMN     "disputed_at" TIMESTAMP(3),
ADD COLUMN     "disputed_break" INTEGER,
ADD COLUMN     "disputed_end" TIMESTAMP(3),
ADD COLUMN     "refused_at" TIMESTAMP(3),
ALTER COLUMN "reported_end" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "reported_at" SET NOT NULL,
ALTER COLUMN "reported_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "confirmed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "briefing" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "meld_minuten" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "user_source" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);
