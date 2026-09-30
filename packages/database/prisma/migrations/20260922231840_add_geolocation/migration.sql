-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "address" VARCHAR(512),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6);

-- AlterTable
ALTER TABLE "volunteers" ADD COLUMN     "address" VARCHAR(512),
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6);

-- CreateIndex
CREATE INDEX "organizations_city_idx" ON "organizations"("city");

-- CreateIndex
CREATE INDEX "organizations_latitude_longitude_idx" ON "organizations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "volunteers_latitude_longitude_idx" ON "volunteers"("latitude", "longitude");
