import pathlib, ftfy

# Fix mojibake in source files: double-encoded UTF-8 -> correct UTF-8
for p in list(pathlib.Path("src").rglob("*.tsx")) + list(pathlib.Path("src").rglob("*.ts")) + [pathlib.Path("server.ts")]:
    if not p.exists():
        continue
    try:
        text = p.read_text(encoding="utf-8")
        if "Ã" in text or "�" in text:
            fixed = ftfy.fix_text(text)
            if fixed != text:
                p.write_text(fixed, encoding="utf-8")
                print(f"Fixed {p}")
    except Exception as e:
        print(f"Skip {p}: {e}")
