-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "documents_zip_filename" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password_hash" DROP NOT NULL;
