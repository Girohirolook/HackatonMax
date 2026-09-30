/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('volunteer', 'organization_creator', 'admin');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "documents_zip_filename" VARCHAR(255) NOT NULL,
    "logo_url" VARCHAR(512),
    "social_media_link" VARCHAR(512),
    "contacts" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "birth_date" TIMESTAMP(3) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "photo_url" VARCHAR(512),
    "description" TEXT,
    "organizational_details" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "required_volunteers_count" INTEGER NOT NULL DEFAULT 1,
    "event_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_documents" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_event_registrations" (
    "id" SERIAL NOT NULL,
    "volunteer_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'pending',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_user_id_key" ON "organizations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteers_user_id_key" ON "volunteers"("user_id");

-- CreateIndex
CREATE INDEX "volunteers_city_idx" ON "volunteers"("city");

-- CreateIndex
CREATE INDEX "events_city_event_date_idx" ON "events"("city", "event_date");

-- CreateIndex
CREATE INDEX "events_organization_id_idx" ON "events"("organization_id");

-- CreateIndex
CREATE INDEX "event_documents_event_id_idx" ON "event_documents"("event_id");

-- CreateIndex
CREATE INDEX "volunteer_event_registrations_volunteer_id_idx" ON "volunteer_event_registrations"("volunteer_id");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_event_registrations_volunteer_id_event_id_key" ON "volunteer_event_registrations"("volunteer_id", "event_id");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_event_registrations" ADD CONSTRAINT "volunteer_event_registrations_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_event_registrations" ADD CONSTRAINT "volunteer_event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
