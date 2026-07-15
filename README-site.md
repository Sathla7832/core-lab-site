# CORE Lab static website

This folder is a static website. Open `index.html` directly, or serve the folder with:

```powershell
python -m http.server 8123 --bind 127.0.0.1
```

Then visit:

```text
http://localhost:8123/index.html
```

## Files

- `index.html`: home
- `about.html`: principal investigator profile
- `research.html`: research areas
- `publications.html`: publications
- `team.html`: team placeholder page
- `news.html`: news
- `contact.html`: contact page
- `assets/styles.css`: visual design
- `assets/main.js`: mobile menu behavior

## Rebuild

Run this from `C:\AI\Website` after editing the Excel content sheet:

```powershell
$env:PYTHONIOENCODING='utf-8'
py -3 'C:\AI\Website\rebuild_site_ascii.py'
```

The generated site is in `C:\AI\Website\lab-site`.

## Notes

The team page is intentionally a placeholder because the team sheet has no real member rows yet.
The contact form opens the visitor's default email client with a prefilled message.
