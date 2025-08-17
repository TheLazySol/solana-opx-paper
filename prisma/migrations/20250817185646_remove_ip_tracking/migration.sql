/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `user_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."user_sessions" DROP COLUMN "ipAddress";
