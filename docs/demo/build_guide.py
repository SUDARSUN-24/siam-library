"""
Builds DEMO_GUIDE.docx (Word) and DEMO_GUIDE.print.html (for the PDF) from DEMO_GUIDE.md.

    pip install python-docx pillow
    python docs/demo/build_guide.py            # → DEMO_GUIDE.docx + DEMO_GUIDE.print.html
    npx tsx docs/demo/print-pdf.ts             # → DEMO_GUIDE.pdf (Chromium print)

Understands only the Markdown used in DEMO_GUIDE.md: headings, paragraphs, numbered lists,
tables, "> " notes, images (consecutive image lines = one row), <!-- pagebreak -->,
**bold**, *italic*, `code`, [links](url) and <urls>.
"""
import html
import re
import sys
from pathlib import Path

from PIL import Image
from docx import Document
from docx.enum.section import WD_ORIENT  # noqa: F401  (kept for easy landscape tweaks)
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

HERE = Path(__file__).resolve().parent
MD = HERE / "DEMO_GUIDE.md"
INK = RGBColor(0x1D, 0x24, 0x33)
CRIMSON = RGBColor(0x9B, 0x1C, 0x2E)
MUTED = RGBColor(0x5B, 0x63, 0x73)
LATIN_FONT = "Segoe UI"
THAI_FONT = "Leelawadee UI"

# ── Markdown → blocks ────────────────────────────────────────────────────────────────────
IMG = re.compile(r"^!\[(.*?)\]\((.*?)\)\s*$")


def parse(md: str):
    lines = md.splitlines()
    blocks, i = [], 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
        elif line.strip() == "<!-- pagebreak -->":
            blocks.append(("pagebreak",))
            i += 1
        elif m := re.match(r"^(#{1,3}) (.*)$", line):
            blocks.append(("h", len(m.group(1)), m.group(2).strip()))
            i += 1
        elif IMG.match(line):
            row = []
            while i < len(lines) and IMG.match(lines[i]):
                alt, src = IMG.match(lines[i]).groups()
                row.append((alt, src))
                i += 1
            blocks.append(("images", row))
        elif line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
                    rows.append(cells)
                i += 1
            blocks.append(("table", rows))
        elif re.match(r"^\d+\. ", line):
            items, start = [], int(re.match(r"^(\d+)\. ", line).group(1))
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(re.sub(r"^\d+\. ", "", lines[i]))
                i += 1
            blocks.append(("ol", items, start))
        elif line.startswith("> "):
            text = []
            while i < len(lines) and lines[i].startswith("> "):
                text.append(lines[i][2:])
                i += 1
            blocks.append(("note", " ".join(text)))
        else:
            text = []
            while i < len(lines) and lines[i].strip() and not re.match(r"^(#|!\[|\||\d+\. |> |<!--)", lines[i]):
                text.append(lines[i])
                i += 1
            blocks.append(("p", text))
    return blocks


INLINE = re.compile(r"(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|<https?://[^>]+>)")


def inline_parts(text: str):
    """→ [(text, {'b','i','code','link':url})]"""
    out = []
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**"):
            out.append((part[2:-2], {"b": True}))
        elif part.startswith("`"):
            out.append((part[1:-1], {"code": True}))
        elif part.startswith("*"):
            out.append((part[1:-1], {"i": True}))
        elif part.startswith("["):
            t, url = re.match(r"\[([^\]]+)\]\(([^)]+)\)", part).groups()
            out.append((t, {"link": url}))
        elif part.startswith("<"):
            out.append((part[1:-1], {"link": part[1:-1]}))
        else:
            out.append((part, {}))
    return out


def slug(text: str):  # GitHub-style heading anchors
    s = re.sub(r"[^\w\- ]", "", text.lower())
    return s.replace(" ", "-")


def is_phone(src: str):
    return "mobile" in src


def starts_section(blocks, i):
    """Numbered sections ("## 3. …") start on a new page, unless they follow a part title."""
    b = blocks[i]
    return b[0] == "h" and b[1] == 2 and re.match(r"^\d+\. ", b[2]) and not (i > 0 and blocks[i - 1][0] == "h" and blocks[i - 1][1] == 1)


# ── Word ─────────────────────────────────────────────────────────────────────────────────
def set_fonts(run, size=None, color=None):
    run.font.name = LATIN_FONT
    rpr = run._element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.append(fonts)
    for attr, val in (("w:ascii", LATIN_FONT), ("w:hAnsi", LATIN_FONT), ("w:cs", THAI_FONT), ("w:eastAsia", LATIN_FONT)):
        fonts.set(qn(attr), val)
    if size:
        run.font.size = Pt(size)
        szcs = OxmlElement("w:szCs")
        szcs.set(qn("w:val"), str(int(size * 2)))
        rpr.append(szcs)
    if color is not None:
        run.font.color.rgb = color


def add_hyperlink(par, text, url):
    if url.startswith("#"):  # in-document links are kept as plain text in Word
        r = par.add_run(text)
        set_fonts(r)
        return
    rid = par.part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), rid)
    run = OxmlElement("w:r")
    rpr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "9B1C2E")
    u = OxmlElement("w:u")
    u.set(qn("w:val"), "single")
    rpr.extend([color, u])
    run.append(rpr)
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    run.append(t)
    link.append(run)
    par._p.append(link)


def add_inline(par, text, size=None, color=None):
    for t, f in inline_parts(text):
        if "link" in f:
            add_hyperlink(par, t, f["link"])
            continue
        r = par.add_run(t)
        set_fonts(r, size, color)
        r.bold = f.get("b")
        r.italic = f.get("i")
        if f.get("code"):
            r.font.name = "Consolas"


def style_doc(doc):
    for name, size, color, before, after in (
        ("Normal", 10.5, INK, 0, 6),
        ("Title", 26, INK, 0, 4),
        ("Heading 1", 20, CRIMSON, 0, 10),
        ("Heading 2", 14.5, INK, 16, 6),
        ("Heading 3", 12, INK, 10, 4),
    ):
        st = doc.styles[name]
        st.font.name = LATIN_FONT
        st.font.size = Pt(size)
        st.font.color.rgb = color
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)
        rpr = st.element.get_or_add_rPr()
        fonts = rpr.find(qn("w:rFonts"))
        if fonts is None:
            fonts = OxmlElement("w:rFonts")
            rpr.append(fonts)
        fonts.set(qn("w:cs"), THAI_FONT)
        if name.startswith("Heading") or name == "Title":
            st.paragraph_format.keep_with_next = True


def add_image_cell(container, src, width_in):
    p = container.add_paragraph() if hasattr(container, "add_paragraph") else container
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(HERE / src), width=Inches(width_in))
    return p


def add_caption(container, alt):
    c = container.add_paragraph()
    c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = c.add_run(alt)
    set_fonts(r, 9, MUTED)
    r.italic = True
    return c


def no_borders(table):
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        borders.append(el)
    tbl_pr.append(borders)


def build_docx(blocks, out: Path):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(2))
    sec.top_margin = sec.bottom_margin = Cm(1.8)
    style_doc(doc)
    # footer page numbers
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for kind, text in (("begin", None), (None, "PAGE"), ("end", None)):
        r = fp.add_run()
        if kind:
            fc = OxmlElement("w:fldChar")
            fc.set(qn("w:fldCharType"), kind)
            r._r.append(fc)
        else:
            it = OxmlElement("w:instrText")
            it.text = text
            r._r.append(it)
        set_fonts(r, 9, MUTED)

    usable = 17.0 / 2.54  # inches between the margins
    first_h1 = True
    in_toc = False
    for i, b in enumerate(blocks):
        kind = b[0]
        if kind == "pagebreak":
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        elif kind == "h":
            level, text = b[1], b[2]
            in_toc = text == "Contents"
            if level == 1 and first_h1:
                p = doc.add_paragraph(style="Title")
                add_inline(p, text, 26, INK)
                first_h1 = False
            else:
                p = doc.add_heading(level=level)
                add_inline(p, text)
                if starts_section(blocks, i):
                    p.paragraph_format.page_break_before = True
        elif kind == "p":
            # consecutive lines with "**Label:**" → one line each
            for line in b[1]:
                p = doc.add_paragraph()
                add_inline(p, line)
                if line.strip() == "**How to demo it**":
                    p.paragraph_format.keep_with_next = True
                    p.paragraph_format.space_before = Pt(4)
                    p.paragraph_format.space_after = Pt(2)
        elif kind == "note":
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.6)
            add_inline(p, b[1], 9.5, MUTED)
        elif kind == "ol":
            for n, item in enumerate(b[1], b[2]):
                p = doc.add_paragraph()
                if in_toc:
                    p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.left_indent = Cm(0.9)
                p.paragraph_format.first_line_indent = Cm(-0.6)
                p.paragraph_format.space_after = Pt(2)
                r = p.add_run(f"{n}.\t")
                set_fonts(r)
                p.paragraph_format.tab_stops.add_tab_stop(Cm(0.9))
                add_inline(p, item)
        elif kind == "table":
            rows = b[1]
            t = doc.add_table(rows=len(rows), cols=len(rows[0]))
            t.style = "Table Grid"
            t.alignment = WD_TABLE_ALIGNMENT.CENTER
            for ri, row in enumerate(rows):
                for ci, cell in enumerate(row):
                    par = t.cell(ri, ci).paragraphs[0]
                    add_inline(par, f"**{cell}**" if ri == 0 else cell, 9.5)
                    if ri == 0:
                        shd = OxmlElement("w:shd")
                        shd.set(qn("w:val"), "clear")
                        shd.set(qn("w:fill"), "F5F2EC")
                        t.cell(ri, ci)._tc.get_or_add_tcPr().append(shd)
            doc.add_paragraph()
        elif kind == "images":
            row = b[1]
            if len(row) == 1:
                alt, src = row[0]
                add_image_cell(doc, src, 2.7 if is_phone(src) else 5.6)
                add_caption(doc, alt)
            else:
                t = doc.add_table(rows=2, cols=len(row))
                no_borders(t)
                t.alignment = WD_TABLE_ALIGNMENT.CENTER
                w = min(2.6, (usable - 0.3) / len(row) - 0.1)
                for ci, (alt, src) in enumerate(row):
                    add_image_cell(t.cell(0, ci).paragraphs[0], src, w)
                    cap = t.cell(1, ci).paragraphs[0]
                    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    r = cap.add_run(alt)
                    set_fonts(r, 9, MUTED)
                    r.italic = True
                # keep the image row and its captions on one page
                for tr in t.rows:
                    trpr = tr._tr.get_or_add_trPr()
                    cs = OxmlElement("w:cantSplit")
                    trpr.append(cs)
                doc.add_paragraph()
    doc.core_properties.title = "Siam University Library — Book Preview: Demo guide"
    doc.core_properties.author = "Sudasun"
    doc.save(out)


# ── HTML for the PDF ─────────────────────────────────────────────────────────────────────
CSS = """
@page { size: A4; margin: 16mm 16mm 18mm; }
:root { --ink:#1d2433; --crimson:#9b1c2e; --paper:#f5f2ec; --muted:#5b6373; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", "Leelawadee UI", Tahoma, sans-serif; color: var(--ink); font-size: 10.5pt; line-height: 1.5; margin: 0; }
h1, h2, h3 { font-family: Georgia, "Leelawadee UI", serif; line-height: 1.2; break-after: avoid; }
h1.title { font-size: 28pt; margin: 0 0 4pt; }
h1 { font-size: 22pt; color: var(--crimson); margin: 0 0 12pt; border-bottom: 2px solid var(--crimson); padding-bottom: 6pt; }
h2 { font-size: 15pt; margin: 20pt 0 6pt; }
p { margin: 0 0 6pt; }
p.label { font-weight: 600; margin: 8pt 0 2pt; break-after: avoid; }
ol { margin: 0 0 8pt; padding-left: 20pt; } li { margin-bottom: 2pt; }
a { color: var(--crimson); text-decoration: none; }
code { font-family: Consolas, monospace; font-size: 9.5pt; background: var(--paper); padding: 0 3px; border-radius: 3px; }
.note { border-left: 3px solid var(--crimson); background: var(--paper); padding: 6pt 10pt; color: var(--muted); font-size: 9.5pt; margin: 10pt 0; }
table.data { border-collapse: collapse; width: 100%; margin: 6pt 0 12pt; font-size: 9.5pt; break-inside: avoid; }
table.data th, table.data td { border: 1px solid #d8d2c6; padding: 4pt 7pt; text-align: left; vertical-align: top; }
table.data th { background: var(--paper); }
.row { display: flex; justify-content: center; gap: 8mm; margin: 6pt 0 12pt; break-inside: avoid; }
figure { margin: 0; text-align: center; break-inside: avoid; }
figure img { display: block; margin: 0 auto; border: 1px solid #d8d2c6; border-radius: 4px; }
figure.desktop img { width: 82%; }
figure.phone img { width: 58mm; }
.row figure.phone img { width: 52mm; }
figcaption { font-size: 8.5pt; color: var(--muted); font-style: italic; margin-top: 3pt; }
.pagebreak { break-after: page; }
h2.section { break-before: page; margin-top: 0; }
.toc ol { margin-bottom: 3pt; } .toc li { margin: 0; font-size: 9.5pt; line-height: 1.35; } .toc p { margin-bottom: 1pt; } .toc .note { margin-top: 6pt; }
section.part > h1 { break-before: auto; }
"""


def html_inline(text):
    out = []
    for t, f in inline_parts(text):
        e = html.escape(t)
        if "link" in f:
            out.append(f'<a href="{html.escape(f["link"])}">{e}</a>')
        elif f.get("b"):
            out.append(f"<strong>{e}</strong>")
        elif f.get("i"):
            out.append(f"<em>{e}</em>")
        elif f.get("code"):
            out.append(f"<code>{e}</code>")
        else:
            out.append(e)
    return "".join(out)


def build_html(blocks, out: Path):
    parts, first_h1, in_toc = [], True, False
    for i, b in enumerate(blocks):
        kind = b[0]
        if kind == "pagebreak":
            if in_toc:
                parts.append("</div>")
                in_toc = False
            parts.append('<div class="pagebreak"></div>')
        elif kind == "h":
            level, text = b[1], b[2]
            cls = ' class="title"' if level == 1 and first_h1 else ' class="section"' if starts_section(blocks, i) else ""
            first_h1 = first_h1 and level != 1
            parts.append(f'<h{level} id="{slug(text)}"{cls}>{html_inline(text)}</h{level}>')
            if text == "Contents":
                parts.append('<div class="toc">')
                in_toc = True
        elif kind == "p":
            for line in b[1]:
                cls = ' class="label"' if line.strip() == "**How to demo it**" else ""
                parts.append(f"<p{cls}>{html_inline(line)}</p>")
        elif kind == "note":
            parts.append(f'<div class="note">{html_inline(b[1])}</div>')
        elif kind == "ol":
            parts.append(f'<ol start="{b[2]}">' + "".join(f"<li>{html_inline(x)}</li>" for x in b[1]) + "</ol>")
        elif kind == "table":
            head, *body = b[1]
            parts.append(
                '<table class="data"><thead><tr>' + "".join(f"<th>{html_inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                + "".join("<tr>" + "".join(f"<td>{html_inline(c)}</td>" for c in r) + "</tr>" for r in body)
                + "</tbody></table>"
            )
        elif kind == "images":
            figs = []
            for alt, src in b[1]:
                cls = "phone" if is_phone(src) else "desktop"
                figs.append(f'<figure class="{cls}"><img src="{html.escape(src)}" alt="{html.escape(alt)}"><figcaption>{html.escape(alt)}</figcaption></figure>')
            parts.append(f'<div class="row">{"".join(figs)}</div>' if len(figs) > 1 else figs[0])
    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Siam University Library — Demo guide</title><style>{CSS}</style></head>
<body>{''.join(parts)}</body></html>"""
    out.write_text(doc, encoding="utf-8")


def main():
    blocks = parse(MD.read_text(encoding="utf-8"))
    missing = [src for b in blocks if b[0] == "images" for _, src in b[1] if not (HERE / src).exists()]
    if missing:
        sys.exit(f"missing images: {missing}")
    for b in blocks:  # sanity: every image opens
        if b[0] == "images":
            for _, src in b[1]:
                Image.open(HERE / src).verify()
    build_docx(blocks, HERE / "DEMO_GUIDE.docx")
    build_html(blocks, HERE / "DEMO_GUIDE.print.html")
    n = sum(len(b[1]) for b in blocks if b[0] == "images")
    print(f"DEMO_GUIDE.docx and DEMO_GUIDE.print.html written ({n} images)")


if __name__ == "__main__":
    main()
