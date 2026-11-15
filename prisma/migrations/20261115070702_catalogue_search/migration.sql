-- Trigram search (typo-tolerant, works for Thai and English). Available on Neon and in Postgres contrib.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- DropIndex
DROP INDEX "Book_shelfId_idx";

-- DropIndex
DROP INDEX "Book_status_idx";

-- CreateIndex
CREATE INDEX "Book_shelfId_row_code_idx" ON "Book"("shelfId", "row", "code");

-- CreateIndex
CREATE INDEX "Book_status_createdAt_idx" ON "Book"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Book_language_createdAt_idx" ON "Book"("language", "createdAt");

-- CreateIndex
CREATE INDEX "Book_createdAt_idx" ON "Book"("createdAt");

-- CreateIndex
CREATE INDEX "Book_title_idx" ON "Book"("title");

-- CreateIndex
CREATE INDEX "Book_title_trgm_idx" ON "Book" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Book_altTitle_trgm_idx" ON "Book" USING GIN ("altTitle" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Book_author_trgm_idx" ON "Book" USING GIN ("author" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Book_publisher_trgm_idx" ON "Book" USING GIN ("publisher" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PreviewPage_text_trgm_idx" ON "PreviewPage" USING GIN ("text" gin_trgm_ops);
