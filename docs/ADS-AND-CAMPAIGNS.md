# Ads and campaigns

**Ad kit:** https://greenplantapps.github.io/nexascan-web/ad-kit/ (unlisted, noindex) has every Facebook and
Instagram creative, in 1:1, 4:5 and 9:16, with its ad text and tracked link. Edit the text and links in
`marketing/ads/ads.json`; regenerate images and videos with `node marketing/ads/make-ads.cjs` (needs Playwright's
Chromium and ffmpeg); then `npm run verify`, commit and push to main.

The site is built to be an advert's landing page: no cookies, no analytics or ad pixels, so no consent banner.
Installs are counted by the stores themselves.

## Where to point an ad

| Ad is about | Landing URL |
|---|---|
| Redact / anonymise / hide personal details | `https://greenplantapps.github.io/nexascan-web/smart-redact/` |
| The app in general (AI document studio) | `https://greenplantapps.github.io/nexascan-web/` |
| Straight to the store (QR codes, social bios, app-install ads) | `https://greenplantapps.github.io/nexascan-web/get/` |

`/get/` sends iPhone, iPad and Mac visitors to the App Store and Android visitors to Google Play at once; on other
computers it shows both buttons. It is kept out of search (noindex).

## Tag every ad link

Add UTM tags to the landing URL, for example:

```
https://greenplantapps.github.io/nexascan-web/smart-redact/?utm_source=google&utm_medium=cpc&utm_campaign=redact-uk
https://greenplantapps.github.io/nexascan-web/get/?utm_source=instagram&utm_medium=social&utm_campaign=launch-nov
```

The page keeps the tags for that visit (sessionStorage, never a cookie) and adds them to the store buttons:

- **Google Play:** as `referrer`. See installs per campaign in Play Console › Statistics, acquisition by
  campaign (`utm_source` / `utm_campaign`). Nothing to set up.
- **App Store:** as `ct` (the campaign, from `utm_campaign`, up to 40 characters), with `pt`, your provider token.
  Set `appStoreProviderToken` in `site.config.json` once: App Store Connect › Apps › NexaScan › App Analytics ›
  Sources › Campaigns › Generate a campaign link, and copy the `pt=` number. See installs in App Analytics ›
  Sources › Campaigns. Until the token is set, App Store links are left as they are.

Keep campaign names short, lower-case and without personal data (`redact-uk`, `studio-launch`, `qr-flyer`).

## Ad text that stays true

Smart Redact positioning (AN03 §1a): say "finds personal details for you to review", "done on your phone",
"nothing is uploaded". Never "automatically anonymises", "guaranteed" or any accuracy percentage. Smart Redact is Pro.
The intro offer (first month at the `introMonthly` price in `src/data/plans.json`) is for new monthly subscribers.

Google Play is still a closed test: until `storeUrl` is set, Android visitors who are not testers can't install, so
run Android-targeted ads only after the production release.

## Adding an ad pixel later

Google Ads or Meta pixels set cookies and would need a consent banner and a privacy policy change (section 13,
"This website"). Prefer the stores' own campaign reports above, or Google Ads app campaigns that link to the store.
