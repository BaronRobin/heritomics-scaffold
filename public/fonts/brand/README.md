# Brand fonts (not in the repo)

Stratos and Matter are HS KL's commercial brand fonts. Their web license covers only HS KL's own registered domain and forbids making the font files available to others, so the files are never committed. `.gitignore` excludes every `.woff2` in this folder.

To preview the site with them on your own computer:

1. Get the files from the course team (`hskl_Fonts.zip`).
2. Copy these files into this folder:
   - `type-2_web/Stratos-ExtraBold-Web.woff2`
   - `Matter/Matter/Matter-Regular.woff2`, `Matter-RegularItalic.woff2`, `Matter-Medium.woff2`, `Matter-SemiBold.woff2`, `Matter-Bold.woff2`
3. Start the dev server with `PUBLIC_BRAND_FONTS=true npm run dev`.

Never deploy a build with `PUBLIC_BRAND_FONTS=true` anywhere except the domain on HS KL's font invoice.
