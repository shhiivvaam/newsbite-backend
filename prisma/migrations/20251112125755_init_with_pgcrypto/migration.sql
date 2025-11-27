-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_avatar" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "read_time" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "slug" TEXT,
    "meta_description" TEXT,
    "keywords" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduled_date" TIMESTAMPTZ(6),
    "image_alt_text" TEXT,
    "category_id" UUID,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "is_published" BOOLEAN DEFAULT false,
    "author_id" UUID NOT NULL,
    "image_url" TEXT,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "idx_categories_name" ON "categories"("name");

-- CreateIndex
CREATE INDEX "idx_articles_tags" ON "articles" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_articles_category" ON "articles"("category");

-- CreateIndex
CREATE INDEX "idx_articles_category_id" ON "articles"("category_id");

-- CreateIndex
CREATE INDEX "idx_news_category" ON "news"("category");

-- CreateIndex
CREATE INDEX "idx_news_published_at" ON "news"("published_at");

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_category_fkey" FOREIGN KEY ("category") REFERENCES "categories"("name") ON DELETE SET NULL ON UPDATE CASCADE;
