-- CreateTable
CREATE TABLE "CountryStat" (
    "iso2" VARCHAR(2) NOT NULL,
    "indicator" VARCHAR(40) NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountryStat_pkey" PRIMARY KEY ("iso2","indicator")
);

-- CreateIndex
CREATE INDEX "CountryStat_indicator_idx" ON "CountryStat"("indicator");
