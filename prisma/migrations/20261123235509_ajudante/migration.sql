-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "helperDailyRate" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "helperDailyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "helperDays" DECIMAL(5,1) NOT NULL DEFAULT 0;
