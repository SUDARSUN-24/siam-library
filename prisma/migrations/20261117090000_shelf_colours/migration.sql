-- Data only: new shelf colours from the 2026-11 visual redesign (A navy-blue, B brown, C plum).
-- Only shelves still on the original seed colour are changed. No schema change, so the code
-- that is still running during a deploy is unaffected.
UPDATE "Shelf" SET "color" = '#284a7a' WHERE "code" = 'A' AND lower("color") = '#1f4e79';
UPDATE "Shelf" SET "color" = '#7a4a14' WHERE "code" = 'B' AND lower("color") = '#2f6b4f';
UPDATE "Shelf" SET "color" = '#6a2347' WHERE "code" = 'C' AND lower("color") = '#7a3b5e';
