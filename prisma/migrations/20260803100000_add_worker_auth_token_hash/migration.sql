-- AlterTable
ALTER TABLE "WorkerNode" ADD COLUMN "authTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkerNode_authTokenHash_key" ON "WorkerNode"("authTokenHash");
