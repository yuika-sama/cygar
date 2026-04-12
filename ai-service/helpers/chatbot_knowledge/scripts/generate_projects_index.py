"""
Scan `helpers/chatbot_knowledge/projects` and produce a single JSON index file
containing lightweight metadata for each project markdown file.

Output: ../projects_index.json (next to this scripts folder's parent)

Usage: python generate_projects_index.py
"""
from pathlib import Path
import json
import re
from typing import Dict, Any


ROOT = Path(__file__).resolve().parents[4]  # workspace root
PROJECTS_DIR = ROOT / 'ai-service' / 'helpers' / 'chatbot_knowledge' / 'projects'
OUT_PATH = ROOT / 'ai-service' / 'helpers' / 'chatbot_knowledge' / 'projects_index.json'


def parse_md_head(path: Path) -> Dict[str, Any]:
    data: Dict[str, Any] = {
        'id': None,
        'title': None,
        'short_description': None,
        'source_url': None,
        'tags': [],
        'relative_path': str(path.relative_to(ROOT / 'ai-service'))
    }

    try:
        with path.open('r', encoding='utf-8') as f:
            for line in f:
                line = line.rstrip('\n')
                if not line.strip():
                    # stop parsing at first blank line (head finished)
                    break
                if line.startswith('id:') and data['id'] is None:
                    data['id'] = line.split(':', 1)[1].strip()
                elif line.startswith('title:') and data['title'] is None:
                    data['title'] = line.split(':', 1)[1].strip()
                elif line.startswith('short_description:') and data['short_description'] is None:
                    data['short_description'] = line.split(':', 1)[1].strip()
                elif line.startswith('source_url:') and data['source_url'] is None:
                    data['source_url'] = line.split(':', 1)[1].strip()
                elif line.startswith('tags:') and (not data['tags']):
                    # tags: [a, b]
                    rest = line.split(':', 1)[1].strip()
                    m = re.match(r"\[(.*)\]", rest)
                    if m:
                        tags = [t.strip().strip("'\"") for t in m.group(1).split(',') if t.strip()]
                        data['tags'] = tags
    except Exception:
        pass

    return data


def build_index():
    items = []
    if not PROJECTS_DIR.exists():
        print('Projects directory not found:', PROJECTS_DIR)
        return items

    files = list(PROJECTS_DIR.glob('*.md'))
    print('Found', len(files), 'project files to index')

    for p in files:
        meta = parse_md_head(p)
        items.append(meta)

    return items


def main():
    index = build_index()
    try:
        with OUT_PATH.open('w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False)
        print('Wrote index with', len(index), 'entries to', OUT_PATH)
    except Exception as e:
        print('Failed to write index:', e)


if __name__ == '__main__':
    main()
