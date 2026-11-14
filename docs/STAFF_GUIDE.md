# Staff guide — คู่มือเจ้าหน้าที่

Simple steps for library staff. Works on a computer or a phone.
ขั้นตอนง่าย ๆ สำหรับเจ้าหน้าที่ห้องสมุด ใช้ได้ทั้งคอมพิวเตอร์และโทรศัพท์

---

## 1. Log in · เข้าสู่ระบบ
1. Open the website and tap **Staff / เจ้าหน้าที่** at the bottom of any page
   (or go straight to `/admin`).
2. Enter your email and password, then **Sign in / เข้าสู่ระบบ**.
3. After 5 wrong passwords the login is locked for 15 minutes — wait, then try again.
4. You stay signed in for 8 hours. Tap **Sign out / ออกจากระบบ** on shared computers.

Use the **ภาษาไทย / English** button at the top to change language at any time.

## 2. Mark a book borrowed or returned · บันทึกการยืม-คืน
1. **Books / หนังสือ** shows every book. Type in the filter box to find one by title,
   author or code (e.g. `A-003`).
2. Tap **Mark borrowed / บันทึกการยืม**. The due date is set to **14 days from today**
   and students immediately see “Borrowed · Due back …”.
3. When the book comes back, tap **Mark returned / บันทึกการคืน**.

Tip: scan the book's QR sticker with your phone, then open the staff page in the same
browser — the list filter accepts the code printed on the sticker.

## 3. Add a new book · เพิ่มหนังสือ
1. Tap **Add book / เพิ่มหนังสือ**.
2. Choose the **Shelf**. The **Book code** fills in automatically with the next free
   number (e.g. `A-007`). You can change it — use the format letter-dash-3 digits.
3. Fill in **Title**, **Author**, **Category**, **Language** and **Row** (the row on the
   shelf). Year, publisher, ISBN and the other-language title are
   optional.
4. Tap **Save / บันทึก**. You are taken to the book's page to add photos.

To fix details later: **Books** → pencil icon ✎ → change → **Save**.

## 4. Take and upload preview page photos · ถ่ายภาพหน้าตัวอย่าง
Students should see 5–10 pages: **cover, table of contents, introduction**.

1. Open the book (pencil icon ✎).
2. Tap **Take photo / ถ่ายภาพ** to use the phone camera, or **Choose images /
   เลือกรูป** to pick several photos at once.
3. Take each photo flat, in good light, filling the screen with the page.
   Photos are made smaller automatically — no need to edit them.
4. Upload the **cover first** — the first photo is used as the cover picture.
5. Use **↑ ↓** to change the order and the 🗑 bin to delete a page.

Limits: up to **10 pages** per book, images only, max **10 MB** per photo.

## 5. Print QR stickers · พิมพ์สติกเกอร์ QR
1. Tap **QR stickers / สติกเกอร์ QR**.
2. If you see a yellow warning about *localhost*, ask IT to set the website address
   (`NEXT_PUBLIC_SITE_URL`) first — otherwise phones cannot open the codes.
3. Tap **Print / พิมพ์**. Use **A4 sticker paper (3 × 6 labels)**, scale **100%**,
   margins **default**.
4. Shelf stickers (large) go on the end of each shelf; book stickers go inside the
   back cover or on the spine label area.

## 6. Delete a book (Admin only) · ลบหนังสือ (ผู้ดูแลระบบ)
Open the book → **Delete book / ลบหนังสือ** at the bottom → confirm. This removes the
book and all its photos and cannot be undone. Staff accounts do not see this button.

## Need help?
Contact the library IT administrator. New staff accounts and password resets are done
by IT (see `docs/DEPLOYMENT.md`, “Create real staff accounts”).
