/*
  Warnings:

  - You are about to drop the column `lastCuid` on the `Follow` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Follow" DROP COLUMN "lastCuid",
ADD COLUMN     "previousCuids" TEXT[];
