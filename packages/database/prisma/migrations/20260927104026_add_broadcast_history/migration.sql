-- CreateTable
CREATE TABLE "broadcast_history" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "sent_count" INTEGER NOT NULL,
    "total_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "broadcast_history" ADD CONSTRAINT "broadcast_history_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_history" ADD CONSTRAINT "broadcast_history_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
