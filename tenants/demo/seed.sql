-- Demo agency lives in its own Neon project (AGENCY_DEMO_DATABASE_URL).
-- Fake data is loaded by resetDemoData (apps/web/src/lib/demo/seed.ts), not here.
INSERT INTO agencies (slug, name, platform_host, public_site_url, website_enabled)
VALUES ('demo', 'LetFlow Demo Lettings', 'demo.letflow.app', NULL, false)
ON CONFLICT (slug) DO NOTHING;
