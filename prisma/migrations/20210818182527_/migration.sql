-- CreateTable
CREATE TABLE "Follow" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Follow.guildId_channelId_name_unique" ON "Follow"("guildId", "channelId", "name");
