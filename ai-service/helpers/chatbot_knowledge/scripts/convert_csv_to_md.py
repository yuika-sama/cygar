"""
Convert CSV dataset rows into project markdown files for chatbot knowledge.
Writes files to: ../projects/
Does not delete source CSV files.

Usage: run from repository root or call with python
"""
from pathlib import Path
import csv
import re


ROOT = Path(__file__).resolve().parents[4]  # workspace root (cygar)
CSV_DIR = ROOT / 'ai-service' / 'utils' / 'dataset'
OUT_DIR = ROOT / 'ai-service' / 'helpers' / 'chatbot_knowledge' / 'projects'

OUT_DIR.mkdir(parents=True, exist_ok=True)


def slugify_title(title: str) -> str:
    s = re.sub(r"[^0-9a-zA-Z\s-]", "", title)
    s = re.sub(r"\s+", "-", s.strip())
    return s.lower()[:40]


def find_next_index(prefix: str) -> int:
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)\.md$")
    max_idx = 0
    for p in OUT_DIR.glob(f"{prefix}_*.md"):
        m = pattern.match(p.name)
        if m:
            try:
                idx = int(m.group(1))
                if idx > max_idx:
                    max_idx = idx
            except Exception:
                pass
    return max_idx + 1


def existing_source_urls() -> set:
    urls = set()
    for p in OUT_DIR.glob("*.md"):
        try:
            text = p.read_text(encoding='utf-8')
            for line in text.splitlines():
                if line.strip().startswith('source_url:'):
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        urls.add(parts[1].strip())
        except Exception:
            continue
    return urls


def convert_csv(path: Path):
    prefix = path.stem  # e.g., projects_craft
    next_idx = find_next_index(prefix)
    seen_urls = existing_source_urls()
    created = 0

    with path.open(encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            title = (row.get('Project-Title') or row.get('Project Title') or '').strip()
            link = (row.get('Instructables-link') or row.get('Instructables link') or '').strip()
            creator = (row.get('Creator') or '').strip()
            subcat = (row.get('Subcategory') or row.get('Sub Category') or '').strip()

            source_url = ''
            if link:
                if link.startswith('http'):
                    source_url = link
                else:
                    source_url = 'https://instructables.com' + link

            if source_url and source_url in seen_urls:
                # skip duplicates
                continue

            slug = slugify_title(title or f"project-{i}")
            idx = next_idx
            next_idx += 1
            file_id = f"{prefix}_{idx:04d}"
            filename = OUT_DIR / f"{file_id}.md"

            short_description = f"{subcat} — by {creator}" if subcat or creator else "Dự án từ bộ dữ liệu"

            content_lines = [
                f"id: {file_id}",
                f"title: {title}",
                f"short_description: {short_description}",
                "materials:",
                "  - name: unknown",
                "tools:",
                "  - unknown",
                "difficulty: unknown",
                "duration_minutes: 0",
                "steps:",
                "  - step_number: 1",
                "    description: Mô tả chi tiết xem trang nguồn",
                "tags: []",
                f"source_url: {source_url}",
                "images: []",
                "recommended_gesture: show_project",
                "related_projects: []",
                "",
            ]

            try:
                filename.write_text('\n'.join(content_lines), encoding='utf-8')
                created += 1
                if source_url:
                    seen_urls.add(source_url)
            except Exception as e:
                print('Failed to write', filename, 'error:', e)

    return created


def main():
    csv_files = list(CSV_DIR.glob('projects_*.csv'))
    total = 0
    for csvf in csv_files:
        print('Processing', csvf)
        c = convert_csv(csvf)
        print(f'Created {c} files from {csvf.name}')
        total += c
    print('Done. Total created:', total)


if __name__ == '__main__':
    main()
