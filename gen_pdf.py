import markdown
from fpdf import FPDF

INPUT = "MANUAL_USUARIO.md"
OUTPUT = "MANUAL_USUARIO_HOLDING_WPC.pdf"

with open(INPUT, "r", encoding="utf-8") as f:
    md_text = f.read()

html = markdown.markdown(md_text, extensions=["extra", "tables", "sane_lists"])

# Simple CSS for better look
html_with_style = html

pdf = FPDF(format="A4")
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()
# Reemplazar caracteres fuera de latin-1 para Helvetica (fpdf core fonts)
replacements = {"—": "-", "–": "-", "→": "->", "•": "-", "’": "'", "“": '"', "”": '"', "✓": "[OK]", "✗": "[X]"}
for k, v in replacements.items():
    html_with_style = html_with_style.replace(k, v)
html_with_style = html_with_style.encode('latin-1', 'replace').decode('latin-1')

pdf.write_html(html_with_style)

pdf.output(OUTPUT)
print(f"PDF generado: {OUTPUT}")
