-- CreateTable
CREATE TABLE "Player" (
    "id" UUID NOT NULL,
    "nickname" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" SERIAL NOT NULL,
    "playerId" UUID NOT NULL,
    "gameSlug" VARCHAR(40) NOT NULL,
    "points" INTEGER NOT NULL,
    "dayKey" VARCHAR(10),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fact" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "questionEn" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "detailEn" TEXT NOT NULL,
    "questionVi" TEXT NOT NULL,
    "answerVi" TEXT NOT NULL,
    "detailVi" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "Fact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Score_gameSlug_points_idx" ON "Score"("gameSlug", "points");

-- CreateIndex
CREATE INDEX "Score_createdAt_idx" ON "Score"("createdAt");

-- CreateIndex
CREATE INDEX "Score_dayKey_idx" ON "Score"("dayKey");

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
