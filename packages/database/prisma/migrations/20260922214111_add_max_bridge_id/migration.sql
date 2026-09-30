/*
  Warnings:

  - A unique constraint covering the columns `[max_bridge_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `max_bridge_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "max_bridge_id" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_max_bridge_id_key" ON "users"("max_bridge_id");
