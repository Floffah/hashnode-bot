/*
  Warnings:

  - You are about to drop the column `name` on the `Follow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[guildId,channelId,username]` on the table `Follow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lastCuid` to the `Follow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Follow` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Follow.guildId_channelId_name_unique";

-- AlterTable
ALTER TABLE "Follow" DROP COLUMN "name",
ADD COLUMN     "lastCuid" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Follow.guildId_channelId_username_unique" ON "Follow"("guildId", "channelId", "username");
