-- CreateTable
CREATE TABLE "event_photos" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_photos_event_id_idx" ON "event_photos"("event_id");

-- AddForeignKey
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
