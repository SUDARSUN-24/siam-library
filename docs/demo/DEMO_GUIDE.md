# Siam University Library — Book Preview

**Demo guide for the supervisor presentation**

**Student:** Sudasun, B.Sc. Information Technology, Siam University
**Live site:** <https://siam-library.vercel.app>
**Date:** 15 November 2026

## Overview

Siam University Library — Book Preview is a website where students can look inside a library book before walking to the shelf. They search or browse the catalogue, read a short 5–10 page preview (cover, table of contents, introduction), check whether a copy is on the shelf right now, and then borrow it in person at the library counter. Every book and every shelf has a QR code, so most students arrive by scanning a sticker with their phone. Library staff sign in to add books, upload photos of the preview pages, mark books borrowed or returned, and print QR stickers. The whole site works in Thai and English, is designed for phones first, and stays fast with thousands of books.

## Contents

**Student side**

1. [Home page](#1-home-page)
2. [Thai / English switch](#2-thai--english-switch)
3. [Search suggestions while typing](#3-search-suggestions-while-typing)
4. [Typo-tolerant search](#4-typo-tolerant-search)
5. [Browse by shelf → shelf page](#5-browse-by-shelf--shelf-page)
6. [Browse by category → category page](#6-browse-by-category--category-page)
7. [Home rows and "See all →"](#7-home-rows-and-see-all-)
8. [Catalogue: filters, sorting and page numbers](#8-catalogue-filters-sorting-and-page-numbers)
9. [Book page](#9-book-page)
10. [Preview viewer](#10-preview-viewer)
11. [A borrowed book with its due date](#11-a-borrowed-book-with-its-due-date)

**Staff side**

12. [Staff login](#12-staff-login)
13. [Dashboard](#13-dashboard)
14. [Books list: Mark borrowed / returned](#14-books-list-mark-borrowed--returned)
15. [Add a book with page photos](#15-add-a-book-with-page-photos)
16. [Form errors in Thai](#16-form-errors-in-thai)
17. [QR sticker sheet](#17-qr-sticker-sheet)

**Summary:** [Features at a glance](#features-at-a-glance) · [Key numbers](#key-numbers) · [Technology](#technology) · [Next steps](#next-steps)

> Student-side screenshots come from the live site. Staff screenshots come from a local copy with the demo accounts, because the live staff passwords and two-step-login codes are kept private. Section 8's page-number screenshot also comes from the local copy loaded with 5,000 test books, because the live site has 18 books (fewer than one page of 24).

<!-- pagebreak -->

# Student side

## 1. Home page

The home page is a starting point rather than one long list. It has a large search bar, shelf cards and category tiles with book counts, and three short rows of books. The page loads only the counts and 30 books, so it stays fast however big the library grows. On a phone everything stacks into one column with large touch targets.

**How to demo it**

1. Open <https://siam-library.vercel.app> on the laptop.
2. Open the same address on a phone (or the browser's phone view) to show the mobile layout.

![Home page on a desktop](screenshots/01-home-desktop.png)

![Home page on a phone](screenshots/02-home-mobile.png)

## 2. Thai / English switch

Every page is available in Thai and English, and one button in the header switches between them. Thai is the default because most students read Thai first, and the choice is remembered. Book titles keep their own language, and Thai text is never letter-spaced or justified, so it stays easy to read.

**How to demo it**

1. Tap **ภาษาไทย** / **English** in the top-right corner.
2. Point out that the page, menus and buttons change, but the book data stays the same.

![The same page in English](screenshots/03-language-english-mobile.png)
![The same page in Thai](screenshots/04-language-thai-mobile.png)

## 3. Search suggestions while typing

After two letters, a list of up to five matching books appears under the search bar, each with its cover, title, author and shelf. Students can jump straight to a book without opening a results page. The list also works with the keyboard (↑ ↓ Enter Esc) and with screen readers.

**How to demo it**

1. Type **data** in the search bar and wait a moment.
2. Press ↓ to highlight a book, then Enter to open it, or click **See all results**.

![Suggestions on a desktop](screenshots/05-suggestions-desktop.png)

![Suggestions on a phone](screenshots/06-suggestions-mobile.png)

## 4. Typo-tolerant search

Search runs in the database and tolerates spelling mistakes. Each word may match the title, author, publisher, category (also by its Thai name), book code, ISBN or the text of the preview pages. Typing **algoritms** still finds *Thinking in Algorithms*, and on the live site a Thai typo such as ฐานข้อมุล still finds ฐานข้อมูลเบื้องต้นสำหรับนักศึกษา.

**How to demo it**

1. Search for **algoritms** (missing "h").
2. Show that *Thinking in Algorithms* is the first result.

![Typo search still finds the book](screenshots/07-typo-search-desktop.png)

## 5. Browse by shelf → shelf page

Each physical shelf has a card on the home page with the number of books and how many are available. The shelf page lists that shelf's books row by row, which matches what students see when they stand in front of it. The same page opens when a student scans the QR sticker on the shelf.

**How to demo it**

1. On the home page, click the **A · Information Technology** shelf card.
2. Show the "Row 1 / Row 2 / Row 3" headings and the QR code at the bottom of the page.

![Browse by shelf on the home page](screenshots/08-browse-shelves-desktop.png)

![Shelf page on a desktop](screenshots/09-shelf-page-desktop.png)

![Shelf page on a phone](screenshots/10-shelf-page-mobile.png)

## 6. Browse by category → category page

Category tiles let students explore a subject even when they do not know a title. Each tile shows its name in both languages and how many books it holds. The category page uses the same catalogue layout, with filters and page numbers.

**How to demo it**

1. On the home page, scroll to **Browse by category** and click **Novel**.
2. Show that only novels are listed and the filters still work.

![Browse by category on the home page](screenshots/11-browse-categories-desktop.png)

![Category page](screenshots/12-category-page-desktop.png)

## 7. Home rows and "See all →"

Three rows of up to 10 books (**New arrivals**, **Available now** and **Thai books**) scroll sideways, so students see something new each time they visit. Each row has a **See all →** link that opens the full catalogue with the same filter already applied.

**How to demo it**

1. Scroll down the home page and swipe a row sideways on the phone.
2. Click **See all →** next to **Thai books** and show the catalogue filtered to Thai.

![Home rows on a desktop](screenshots/13-home-rows-desktop.png)

![Home rows on a phone](screenshots/14-home-rows-mobile.png)

![See all → opens the catalogue filtered to Thai books](screenshots/15-see-all-thai-books-desktop.png)

## 8. Catalogue: filters, sorting and page numbers

The catalogue at **/books** lists every book, 24 per page, with filters for shelf, category, language and "available only", plus four sort orders. On a desktop the filters sit in a sidebar; on a phone they open as a bottom sheet. The filters and page number are kept in the web address, so a filtered list can be bookmarked or shared and the browser's back button works as expected.

**How to demo it**

1. Open **Books** in the header, tick **Available only** and choose **Sort by: Title A–Z**.
2. On the phone, tap **Filters** to open the bottom sheet and choose a shelf.
3. Point out the page numbers (shown here on the local copy with 5,000 test books).

![Filters and sorting in the sidebar](screenshots/16-catalogue-filters-desktop.png)

![Filters as a bottom sheet on a phone](screenshots/17-catalogue-bottom-sheet-mobile.png)

![Page numbers (local copy with 5,000 test books)](screenshots/18-catalogue-page-numbers-desktop.png)

## 9. Book page

The book page shows the cover, the title in both languages, the author, whether the book is available, and exactly where it is (shelf and row). The details table includes the category, language, year, publisher, ISBN and book code, and the QR code at the bottom is the same one printed on the book's sticker. The location button leads to the shelf page.

**How to demo it**

1. Open *Thinking in Algorithms* (A-001).
2. Point out the green **Available** badge, **Shelf A · Row 1** and the QR code.

![Book page on a desktop](screenshots/19-book-page-desktop.png)

![Details and QR code](screenshots/20-book-details-qr-desktop.png)

![Book page on a phone](screenshots/21-book-page-mobile.png)

## 10. Preview viewer

The preview viewer lets students turn the pages of the cover, title page, table of contents and introduction, either with buttons, the keyboard or by swiping on a phone. The last page tells them where to find the book and how to borrow it. This is the core of the project: students can decide whether a book is useful before walking to the shelf.

**How to demo it**

1. On a phone, open a book and swipe left through the pages.
2. Stop at the **Contents** page, then a page of the introduction.
3. Go to the last page to show **End of preview** with the shelf and row.

![Table of contents page](screenshots/22-viewer-contents-mobile.png)
![A middle page of the introduction](screenshots/23-viewer-middle-page-mobile.png)
![End of the preview](screenshots/24-viewer-end-page-mobile.png)

## 11. A borrowed book with its due date

When staff mark a book as borrowed, its page immediately shows an orange **Borrowed** badge with the date it is due back. Students can see this before they walk to the library, so they do not look for a book that is not on the shelf.

**How to demo it**

1. Open *Financial Accounting Made Clear* (B-002).
2. Point out **Borrowed · Due back …** next to the title.

![Borrowed book on a desktop](screenshots/25-borrowed-book-desktop.png)

![Borrowed book on a phone](screenshots/26-borrowed-book-mobile.png)

<!-- pagebreak -->

# Staff side

## 12. Staff login

Library staff sign in at **/admin/login**, which is linked from the footer of every page. Students do not need an account. Failed logins are rate-limited, and administrator accounts must also enter a 6-digit code from an authenticator app (two-step login).

**How to demo it**

1. Click **Staff login** in the footer.
2. Sign in with the demo staff account (local copy only; the live passwords are private).

![Staff login on a desktop](screenshots/27-staff-login-desktop.png)

![Staff login on a phone](screenshots/28-staff-login-mobile.png)

## 13. Dashboard

After signing in, staff land on the dashboard. It shows how many books there are and how many are borrowed, a quick filter box, and the list of all books with their status. The top menu leads to **Add book**, **QR stickers** and **Two-step login**.

**How to demo it**

1. Sign in as staff.
2. Point out the totals at the top and the menu.

![Staff dashboard](screenshots/29-dashboard-desktop.png)

## 14. Books list: Mark borrowed / returned

Each book in the list has one button: **Mark borrowed** or **Mark returned**. Marking a book borrowed sets its due date (14 days) automatically, and the public page updates at once. The buttons are large enough to use on a phone at the counter.

**How to demo it**

1. Click **Mark borrowed** on *Networks from the Ground Up* (A-002).
2. Show the due date, then open the book's public page in another tab.
3. Click **Mark returned** to put it back.

![Books list with a borrowed book](screenshots/30-books-list-borrowed-desktop.png)

![Books list on a phone](screenshots/31-books-list-mobile.png)

## 15. Add a book with page photos

Staff add a book with a short form. The next free book code for the chosen shelf is filled in automatically. After saving, they take or choose up to 10 photos of the preview pages, which can be reordered. Large phone photos are compressed in the browser before upload; the server checks that each file is a real image, converts it to WebP and strips location data, and the pages then appear in the public viewer.

**How to demo it**

1. Click **Add book**, choose a shelf and fill in the title, author and category, then **Save**.
2. Click **Choose images** (or **Take photo** on a phone) and add page photos.
3. Open the book's public page to show the photos in the viewer.

![Add book form](screenshots/32-add-book-form-desktop.png)

![Uploaded page photos, ready to reorder](screenshots/33-add-book-photos-desktop.png)

![The photos in the public preview viewer](screenshots/34-uploaded-photos-public-mobile.png)

## 16. Form errors in Thai

If something is wrong in the form, each field shows a clear message in the staff member's language, for example when a Buddhist-era year (2569) is typed instead of the Western year (2026). This prevents mistakes such as wrong book codes or invalid ISBNs from reaching the catalogue.

**How to demo it**

1. Switch to Thai, open **Add book**, type a wrong code such as "bad code", leave the author empty and type 2569 as the year.
2. Click **บันทึก** (Save) and show the red messages under each field.

![Form errors in Thai](screenshots/35-form-errors-thai-desktop.png)

## 17. QR sticker sheet

The QR sticker page prints a code for every shelf and every book on A4 sticker paper. Scanning a sticker opens that shelf or book page straight away. On the live site the codes point to https://siam-library.vercel.app; this screenshot is from the local copy, which is why it shows a "localhost" warning.

**How to demo it**

1. Click **QR stickers**, then **Print** to show the print layout.
2. Scan a code with a phone to open the book page.

![QR sticker sheet](screenshots/36-qr-sticker-sheet-desktop.png)

<!-- pagebreak -->

# Summary

## Features at a glance

| Feature | Who it helps | Where |
|---|---|---|
| Search with suggestions and typo tolerance (Thai + English) | Students | Home, /books |
| Browse by shelf, category, home rows | Students | Home, /shelf/A, /category/… |
| Catalogue with filters, sorting, 24 per page | Students | /books |
| 5–10 page preview viewer (swipe, keys, thumbnails) | Students | /book/A-001 |
| Live availability with due date | Students, staff | Book page, staff list |
| QR codes for every book and shelf | Students, staff | Book/shelf pages, /admin/qr |
| Thai / English switch | Everyone | Header |
| Mark borrowed / returned in one click | Staff | /admin |
| Add books and upload page photos from a phone | Staff | /admin/books/new |
| Two-step login, rate-limited login, access checks | Staff, library | /admin/login |

## Key numbers

| Measure | Result |
|---|---|
| Load test, 5,000 books (production build) — home page | 55 ms |
| Load test — catalogue, shelf and category pages | 15–25 ms |
| Load test — full search with typo tolerance | about 70 ms |
| Load test — live suggestions | about 40 ms |
| Automated browser tests (Playwright), local, desktop + phone | 93 passed, 7 skipped |
| Automated browser tests against the live site (student pages) | 73 passed, 3 skipped |
| Demo catalogue | 18 books on 3 shelves, 15 categories |

## Technology

The site is built with Next.js 16 and React 19 (TypeScript), styled with Tailwind CSS, and stores its data in PostgreSQL through Prisma; search uses PostgreSQL's pg_trgm extension for typo-tolerant Thai and English matching. It runs on Vercel in Singapore with a Neon PostgreSQL database and private Vercel Blob storage for page photos. Staff sign-in uses Auth.js with two-step login, every input is validated with zod, photos are processed with sharp, and Playwright tests the whole site in desktop and phone browsers.

## Next steps

1. **Permission for scanned pages** — agree with the library and publishers which preview pages may be photographed and shown online, and record that permission for each book.
2. **Students-only access** — switch previews from public to signed-in students (one setting, `PREVIEW_ACCESS=students`) once university single sign-on is connected.
3. **University server** — move from the free Vercel/Neon demo hosting to a university server using the included Docker setup, under a library web address, and print the final QR stickers with that address.
