-- Demo players added by the seed-players script can be removed later.
ALTER TABLE "Player" ADD COLUMN "seeded" BOOLEAN NOT NULL DEFAULT false;
