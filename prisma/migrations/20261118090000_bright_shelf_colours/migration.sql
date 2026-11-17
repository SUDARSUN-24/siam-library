-- Data only: brighter shelf colours (A blue, B orange, C raspberry; white text still >= 4.5:1).
-- Changes a shelf only while it still has one of the earlier default colours (the original seed
-- or the 2026-11-17 redesign). No schema change: safe while the previous code is still running.
UPDATE "Shelf" SET "color" = '#1f63d6' WHERE "code" = 'A' AND lower("color") IN ('#1f4e79', '#284a7a');
UPDATE "Shelf" SET "color" = '#c2410c' WHERE "code" = 'B' AND lower("color") IN ('#2f6b4f', '#7a4a14');
UPDATE "Shelf" SET "color" = '#c2185b' WHERE "code" = 'C' AND lower("color") IN ('#7a3b5e', '#6a2347');
