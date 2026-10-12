# How to add things to your site

Everything below works right on github.com, with no installs. After you commit, the site rebuilds itself in about 2 minutes (watch the **Actions** tab for the green check).

## Add a case study to an existing collection (like Duolingo AIM)

1. Open `content/portfolio/duolingo-aim/` on GitHub.
2. Click **Add file → Create new file**.
3. Name it like `06-my-project/index.md`. The slash makes a new folder. Start the name with the next number so it sorts in order.
4. Open `templates/case-study/index.md` in another tab, copy everything, paste it into your new file, and fill it in.
5. Click **Commit changes**.
6. Optional images: open your new folder, click **Add file → Upload files**, and drag in:
   - `cover.jpg`: the card image (a cover slide works great)
   - `slide-1.jpg`, `slide-2.jpg`, …: key slides, listed under `slides:` in the file
   - `deck.pdf`: adds a "view the full deck" button

The filter buttons, card, case study page, and next/previous links all appear on their own.

**Tip:** to turn a PDF deck into images, open it on a Mac in Preview, choose **File → Export**, and pick JPEG.

## Start a new collection (a new class, job, or project series)

1. In `content/portfolio/`, click **Add file → Create new file**.
2. Name it like `marketing-research/_index.md`.
3. Copy `templates/collection/_index.md` into it, fill it in, and commit.
4. Add case studies inside that folder, the same way as above.

It shows up on the portfolio page as its own collection automatically.

## A one-off project with no collection

Make the folder right inside `content/portfolio/`, for example `content/portfolio/my-side-project/index.md`, and use the case study template.

## Change what the home page shows

- **Which collection gets the "quick peek":** in `config.yml`, change `homePeek: "/portfolio/duolingo-aim"`.
- **Which cards appear there:** set `featured: true` on up to 3 case studies.
- **Status panel text (location, studying, seeking):** in `config.yml` under `params`.
- **Education and experience in "about me":** `data/cv.yaml`.

## Update your CV

- **The PDF:** upload the new file to `static/` and name it `cv.pdf` (replace the old one).
- **The interactive CV page:** edit `data/cv.yaml`. Each job is one entry. Use `kind: education`, `research`, or `industry`, which controls the filter buttons.

## Add art

1. Upload the image to `assets/art/`.
2. In `content/art.md`, add three lines under `pieces:`:

```yaml
  - src: "art/your-file.jpg"
    title: "Title"
    medium: "drawing"
```

## Research news

Edit `content/research/_index.md`. Each line is one update.

## Google Analytics events

The site sends these to GA4 (property `G-XLPXPQYZ4Q`): `case_study_view`, `case_study_click`, `deck_open`, `cv_download`, `contact_click`, `portfolio_filter`, `cv_filter`, `art_view`, `terminal_open`, `terminal_command`, `theme_toggle`.
In GA4, go to **Admin → Events** and mark `cv_download` and `contact_click` as **key events** to track your recruiter funnel.
