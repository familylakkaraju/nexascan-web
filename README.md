# NexaScan website

The public product site for **NexaScan – AI Scan, Edit & Redact**, by GreenPlant Technologies.
Static HTML/CSS/JS, built by a small dependency-free Node script and deployed to GitHub Pages.

## Pages

| URL | Page |
|---|---|
| `/` | Home |
| `/features/` | Every tool, grouped as in the app |
| `/pricing/` | Free and Pro |
| `/faq/` | FAQ |
| `/support/` | Support and contact |
| `/privacy/` | Privacy policy (linked from the App Store and Google Play: keep this URL) |
| `/terms/` | Terms of use |
| `/smart-redact/` | Smart Redact landing page, for ads |
| `/get/` | Smart link to the right store, for ads and QR codes (noindex) |

## Ads

Landing pages, campaign tags and store install reports: see `docs/ADS-AND-CAMPAIGNS.md`.

## Everyday edits

- **Download buttons (both stores):** every download area shows the App Store and Google Play side by side, App Store
  first as Apple's guidelines ask. They come from `site.config.json`:
  - `appStoreUrl` is the App Store listing, `https://apps.apple.com/app/id6835465703` (Apple's country-neutral link:
    it sends each visitor to their own storefront, and returns "not found" until Apple releases the app). With it set,
    the Apple button is the site's own black two-line "Download on the App Store" button (no Apple artwork), labelled
    iPhone · iPad · Mac: one listing covers iPhone, iPad and Macs with Apple silicon. If `assets/brand/app-store-badge.svg` exists, the build uses
    that file, Apple's official black badge, instead of the plain button. `testFlightUrl` (a public TestFlight link) is
    used only while `appStoreUrl` is empty; with neither, the iPhone button reads "Coming to the App Store".
  - `storeUrl` is the public Google Play listing. While it is empty, `testUrl` (a Google Play testing opt-in link,
    Play Console's "Join on the web") marks Android as a test version for invited testers. With `testAndroidUrl` (the
    app's Google Play listing, "Join on Android") also set, the Android button is the official Google Play badge linking
    to that listing, with the note and a "Join on the web" link beside it; without it, "Install the test version"; with neither, it reads
    "Coming to Google Play". When `storeUrl` is set, the Android button becomes the official "Get it on Google Play" badge.
  - With both stores live, the header and the Pricing buttons read "Get the app" and go to the download section.
- **iPhone launch day** (App Store release):
  1. Merge `iphone-support` into `main` only once the App Store listing is live (open
     `https://apps.apple.com/app/id6835465703` in a browser and check it shows NexaScan). Merging deploys the site.
  2. Drop in the official badge: download "Download on the App Store", black, English (UK) as an SVG from Apple's
     App Store Marketing Tools (<https://tools.applemarketingtools.com>), save it unchanged as
     `assets/brand/app-store-badge.svg`, build, and check it shows at the same height as the Google Play badge.
     Never redraw or recolour Apple's artwork.
  3. On the live site, click the App Store badge on the home page and in the download section and check it opens the
     listing; run `npm run seo -- --live`.
  4. Check that the App Privacy label in App Store Connect gives the same answers as the table in `/privacy/`
     section 4, and the age rating (4+) matches the FAQ.
- **Google Play production day:** set `storeUrl` to `https://play.google.com/store/apps/details?id=com.greenplant.nexascan`
  (it returns "not found" to anyone who isn't a tester until the app is in production). Then remove the "test version
  for invited testers" sentences from `/faq/` ("Which phones does it run on?") and the home page's FAQ, and check that
  Google Play's Data safety form still matches `/privacy/` section 4.
- **Free and Pro facts:** `src/data/plans.json` is the only place they are written. The Features tool groups
  and the Pricing table are generated from it. Prices appear only after `pricing.confirmed` is set to `true`.
- **Contacts and legal details:** `supportEmail`, `privacyEmail`, `policyDate` and `developer` in
  `site.config.json`. Anything still missing shows as a highlighted `[… REQUIRED]` marker; see
  `docs/OWNER-DETAILS-NEEDED.md`.
- **Search Console:** paste the HTML-tag verification value into `site.config.json` → `seo.googleSiteVerification`.
  Owner-only SEO tasks are in `docs/SEO-MANUAL-STEPS.md`.
- **Custom domain:** change `siteUrl`, then set the domain in the repository's **Settings › Pages**. Canonicals,
  the sitemap and structured data follow `siteUrl`, and the build then also writes `robots.txt`.
- **Copy:** pages are in `src/pages/<name>/index.html`; the header, footer and download band are in `src/partials/`.

## Screenshots

Real captures from the Play-installed Android app (and, for iPhone, from the App Store or TestFlight build), using only the fictional "Harbour & Pine" documents made by
`node scripts/demo-docs.mjs` (photo-like JPGs to import, and flat A4 PNGs to print for live-camera shots).
Put raw PNGs in `screenshots-raw/` (gitignored, never published), review them for personal data, then run
`npm install` once and `npm run images`. That crops the status and gesture bars, writes WebP files to
`assets/screenshots/`, and regenerates the site logo, favicons and social image from `src/brand/nexascan-logo.png`.

iPhone screens are named `iphone-<name>` (`iphone-home`, `iphone-looks`, `iphone-tools`, `iphone-edit-pdf`,
`iphone-ocr-select`, `iphone-convert`: the list is `iphoneScreens` in `scripts/build.mjs`), ideally the same captures
uploaded to the App Store. Each raw iPhone PNG needs an `iphone-<name>.crop.json` beside it that cuts off the status
bar and home indicator (the Pixel crop doesn't fit an iPhone). Each one appears on the Home page ("One app, both phones")
and in the Features page's screen strip as soon as its WebP exists; until then nothing is shown in its place.

## Build and check

```bash
npm run build      # dist/
npm run check      # every link and image resolves, one h1 per page, alt text, titles, descriptions
npm run seo        # SEO audit of dist/ (add -- --live to also check the deployed site)
npm run verify     # all three: the same gate CI runs
npm run serve      # http://localhost:4173/nexascan-web/ (the GitHub Pages path)
```

The sitemap's `lastmod` comes from git history. If git isn't on your PATH, set `GIT` to the git executable
before building, or `lastmod` is left out.

## SEO

- Every page's front matter sets its `title` and `description`; `"index": false` keeps a page out of search
  (noindex, no canonical, not in the sitemap). The 404 page is always noindex.
- The build adds a self-referencing canonical, `og:url`, the sitemap entry with `lastmod`, and on the home page
  WebSite + Organization structured data (no ratings or reviews).
- `npm run seo` reports **errors** (fail the build and the deploy), **warnings** and **recommendations** (never
  fail), and writes `.seo-reports/report.md` and a route inventory.
- The Claude Code skill `.claude/skills/nexascan-seo/` runs this workflow and holds the site's SEO policy and
  the Google rules it relies on.

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`: `npm run verify`, then deploy. Pull requests into `main`
run the same checks without deploying. In the repository's **Settings › Pages**, **Source** must be
**GitHub Actions**.

## Accuracy rule

Every product, privacy and security claim on this site was checked against the app's source code (PDFToolKit;
last full check 2026-10-15, app commit 178f39e, Google Play versionCode 11; tools rechecked 2026-11-19 at app commit
3b305bd, build 26, adding Smart Redact and iPad and Mac; see `src/data/plans.json`; iPhone claims checked 2026-11-16 against app build 1.0 (21)). Before changing a claim, check it against the app. The privacy policy in particular
must stay in step with the app's permissions, network calls, SDKs and billing.
