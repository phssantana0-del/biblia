#!/usr/bin/env python3
"""
Extrai a Vulgata Clementina do Wikisource para:
  edicoes/vulgata/<livro>/index.json
  edicoes/vulgata/<livro>/<N>.json

Regras principais:
- Se <N>.json ja existe, nao sobrescreve (a menos que force).
- So busca no site quando necessario para preencher livro incompleto
  ou quando force esta ativo.
- Sempre garante o campo tituloIndice no index.json.
"""

from __future__ import annotations

import html
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

BASE_URL = "https://la.wikisource.org/wiki/Vulgata_Clementina"
ROOT_DIR = Path(__file__).resolve().parent
VULGATA_DIR = ROOT_DIR / "edicoes" / "vulgata"
FIGUEIREDO_DIR = ROOT_DIR / "edicoes" / "figueiredo"


BOOKS: list[dict[str, str]] = [
    {"id": "genesis", "ws_slug": "Liber_Genesis", "abreviacao": "Gn", "testamento": "Vetus Testamentum", "grupo": "Pentateucus"},
    {"id": "exodo", "ws_slug": "Liber_Exodus", "abreviacao": "Ex", "testamento": "Vetus Testamentum", "grupo": "Pentateucus"},
    {"id": "levitico", "ws_slug": "Liber_Leviticus", "abreviacao": "Lv", "testamento": "Vetus Testamentum", "grupo": "Pentateucus"},
    {"id": "numeros", "ws_slug": "Liber_Numeri", "abreviacao": "Nm", "testamento": "Vetus Testamentum", "grupo": "Pentateucus"},
    {"id": "deuteronomio", "ws_slug": "Liber_Deuteronomii", "abreviacao": "Dt", "testamento": "Vetus Testamentum", "grupo": "Pentateucus"},
    {"id": "josue", "ws_slug": "Liber_Josue", "abreviacao": "Js", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "juizes", "ws_slug": "Liber_Judicum", "abreviacao": "Jz", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "rute", "ws_slug": "Liber_Ruth", "abreviacao": "Rt", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "1-samuel", "ws_slug": "Liber_I_Regum", "abreviacao": "1Sm", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "2-samuel", "ws_slug": "Liber_II_Regum", "abreviacao": "2Sm", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "1-reis", "ws_slug": "Liber_III_Regum", "abreviacao": "1Rs", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "2-reis", "ws_slug": "Liber_IV_Regum", "abreviacao": "2Rs", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "1-cronicas", "ws_slug": "Liber_I_Paralipomenon", "abreviacao": "1Cr", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "2-cronicas", "ws_slug": "Liber_II_Paralipomenon", "abreviacao": "2Cr", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "esdras", "ws_slug": "Liber_I_Esdrae", "abreviacao": "Esd", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "neemias", "ws_slug": "Liber_II_Esdrae", "abreviacao": "Ne", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "tobias", "ws_slug": "Liber_Tobiae", "abreviacao": "Tb", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "judite", "ws_slug": "Liber_Judith", "abreviacao": "Jt", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "ester", "ws_slug": "Liber_Esther", "abreviacao": "Est", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "1-macabeus", "ws_slug": "Liber_I_Machabaeorum", "abreviacao": "1Mc", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "2-macabeus", "ws_slug": "Liber_II_Machabaeorum", "abreviacao": "2Mc", "testamento": "Vetus Testamentum", "grupo": "Libri Historici"},
    {"id": "jo", "ws_slug": "Liber_Job", "abreviacao": "Jo", "testamento": "Vetus Testamentum", "grupo": "Libri Poetici et Sapienciales"},
    {"id": "salmos", "ws_slug": "Liber_Psalmorum", "abreviacao": "Sl", "testamento": "Vetus Testamentum", "grupo": "Libri Poetici et Sapienciales"},
    {"id": "proverbios", "ws_slug": "Liber_Proverbiorum", "abreviacao": "Pr", "testamento": "Vetus Testamentum", "grupo": "Libri Poetici et Sapienciales"},
    {"id": "eclesiastes", "ws_slug": "Liber_Ecclesiastes", "abreviacao": "Ecl", "testamento": "Vetus Testamentum", "grupo": "Libri Poetici et Sapienciales"},
    {"id": "cantico-dos-canticos", "ws_slug": "Canticum_Canticorum", "abreviacao": "Ct", "testamento": "Vetus Testamentum", "grupo": "Libri Poetici et Sapienciales"},
    {"id": "sabedoria", "ws_slug": "Liber_Sapientiae", "abreviacao": "Sb", "testamento": "Vetus Testamentum", "grupo": "Libri Poetici et Sapienciales"},
    {"id": "eclesiastico", "ws_slug": "Liber_Ecclesiasticus", "abreviacao": "Eclo", "testamento": "Vetus Testamentum", "grupo": "Libri Poetici et Sapienciales"},
    {"id": "isaias", "ws_slug": "Prophetia_Isaiae", "abreviacao": "Is", "testamento": "Vetus Testamentum", "grupo": "Prophetae Maiores"},
    {"id": "jeremias", "ws_slug": "Prophetia_Jeremiae", "abreviacao": "Jr", "testamento": "Vetus Testamentum", "grupo": "Prophetae Maiores"},
    {"id": "lamentacoes", "ws_slug": "Lamentationes", "abreviacao": "Lm", "testamento": "Vetus Testamentum", "grupo": "Prophetae Maiores"},
    {"id": "baruc", "ws_slug": "Prophetia_Baruch", "abreviacao": "Br", "testamento": "Vetus Testamentum", "grupo": "Prophetae Maiores"},
    {"id": "ezequiel", "ws_slug": "Prophetia_Ezechielis", "abreviacao": "Ez", "testamento": "Vetus Testamentum", "grupo": "Prophetae Maiores"},
    {"id": "daniel", "ws_slug": "Prophetia_Danielis", "abreviacao": "Dn", "testamento": "Vetus Testamentum", "grupo": "Prophetae Maiores"},
    {"id": "oseias", "ws_slug": "Prophetia_Osee", "abreviacao": "Os", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "joel", "ws_slug": "Prophetia_Joel", "abreviacao": "Jl", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "amos", "ws_slug": "Prophetia_Amos", "abreviacao": "Am", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "abdias", "ws_slug": "Prophetia_Abdiae", "abreviacao": "Ab", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "jonas", "ws_slug": "Prophetia_Jona", "abreviacao": "Jn", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "miqueias", "ws_slug": "Prophetia_Michaeae", "abreviacao": "Mq", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "naum", "ws_slug": "Prophetia_Nahum", "abreviacao": "Na", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "habacuc", "ws_slug": "Prophetia_Habacuc", "abreviacao": "Hb", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "sofonias", "ws_slug": "Prophetia_Sophoniae", "abreviacao": "Sf", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "ageu", "ws_slug": "Prophetia_Aggaei", "abreviacao": "Ag", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "zacarias", "ws_slug": "Prophetia_Zachariae", "abreviacao": "Zc", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "malaquias", "ws_slug": "Prophetia_Malachiae", "abreviacao": "Ml", "testamento": "Vetus Testamentum", "grupo": "Prophetae Minores"},
    {"id": "mateus", "ws_slug": "Evangelium_Secundum_Matthaeum", "abreviacao": "Mt", "testamento": "Novum Testamentum", "grupo": "Evangelia"},
    {"id": "marcos", "ws_slug": "Evangelium_Secundum_Marcum", "abreviacao": "Mc", "testamento": "Novum Testamentum", "grupo": "Evangelia"},
    {"id": "lucas", "ws_slug": "Evangelium_Secundum_Lucam", "abreviacao": "Lc", "testamento": "Novum Testamentum", "grupo": "Evangelia"},
    {"id": "joao", "ws_slug": "Evangelium_Secundum_Joannem", "abreviacao": "Jo", "testamento": "Novum Testamentum", "grupo": "Evangelia"},
    {"id": "atos-dos-apostolos", "ws_slug": "Acta_Apostolorum", "abreviacao": "At", "testamento": "Novum Testamentum", "grupo": "Acta Apostolorum"},
    {"id": "romanos", "ws_slug": "Pauli_Epistola_ad_Romanos", "abreviacao": "Rom", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "1-corintios", "ws_slug": "Pauli_Epistola_ad_Corinthios_I", "abreviacao": "1Cor", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "2-corintios", "ws_slug": "Pauli_Epistola_ad_Corinthios_II", "abreviacao": "2Cor", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "galatas", "ws_slug": "Pauli_Epistola_ad_Galatas", "abreviacao": "Gal", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "efesios", "ws_slug": "Pauli_Epistola_ad_Ephesios", "abreviacao": "Ef", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "filipenses", "ws_slug": "Pauli_Epistola_ad_Philippenses", "abreviacao": "Fl", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "colossenses", "ws_slug": "Pauli_Epistola_ad_Colossenses", "abreviacao": "Cl", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "1-tessalonicenses", "ws_slug": "Pauli_Epistola_ad_Thessalonicenses_I", "abreviacao": "1Ts", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "2-tessalonicenses", "ws_slug": "Pauli_Epistola_ad_Thessalonicenses_II", "abreviacao": "2Ts", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "1-timoteo", "ws_slug": "Pauli_Epistola_ad_Timotheum_I", "abreviacao": "1Tm", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "2-timoteo", "ws_slug": "Pauli_Epistola_ad_Timotheum_II", "abreviacao": "2Tm", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "tito", "ws_slug": "Pauli_Epistola_ad_Titum", "abreviacao": "Tt", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "filemon", "ws_slug": "Pauli_Epistola_ad_Philemonem", "abreviacao": "Fm", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "hebreus", "ws_slug": "Pauli_Epistola_ad_Hebraeos", "abreviacao": "Hb", "testamento": "Novum Testamentum", "grupo": "Epistolae Paulinae"},
    {"id": "tiago", "ws_slug": "Jacobi_Epistola", "abreviacao": "Tg", "testamento": "Novum Testamentum", "grupo": "Epistolae Catholicae"},
    {"id": "1-pedro", "ws_slug": "Petri_Epistola_I", "abreviacao": "1Pd", "testamento": "Novum Testamentum", "grupo": "Epistolae Catholicae"},
    {"id": "2-pedro", "ws_slug": "Petri_Epistola_II", "abreviacao": "2Pd", "testamento": "Novum Testamentum", "grupo": "Epistolae Catholicae"},
    {"id": "1-joao", "ws_slug": "Joannis_Epistola_I", "abreviacao": "1Jo", "testamento": "Novum Testamentum", "grupo": "Epistolae Catholicae"},
    {"id": "2-joao", "ws_slug": "Joannis_Epistola_II", "abreviacao": "2Jo", "testamento": "Novum Testamentum", "grupo": "Epistolae Catholicae"},
    {"id": "3-joao", "ws_slug": "Joannis_Epistola_III", "abreviacao": "3Jo", "testamento": "Novum Testamentum", "grupo": "Epistolae Catholicae"},
    {"id": "judas", "ws_slug": "Juda_Epistola", "abreviacao": "Jd", "testamento": "Novum Testamentum", "grupo": "Epistolae Catholicae"},
    {"id": "apocalipse", "ws_slug": "Apocalypsis", "abreviacao": "Ap", "testamento": "Novum Testamentum", "grupo": "Apocalypsis"},
]


def parse_args() -> tuple[bool, set[str]]:
    force = False
    requested_books: set[str] = set()
    for arg in sys.argv[1:]:
        token = arg.strip().lower()
        if token in {"force", "--force", "-f"}:
            force = True
            continue
        requested_books.add(token)
    return force, requested_books


def fetch(url: str, retries: int = 3) -> str:
    headers = {
        "User-Agent": "VulgataScraperBot/2.0 (educational use)",
        "Accept": "text/html,application/xhtml+xml",
    }
    for attempt in range(1, retries + 1):
        try:
            req = Request(url, headers=headers)
            with urlopen(req, timeout=30) as response:
                return response.read().decode("utf-8", errors="replace")
        except URLError as err:
            if attempt == retries:
                raise RuntimeError(f"falha ao buscar {url}: {err}") from err
            time.sleep(attempt * 2)
    raise RuntimeError(f"falha ao buscar {url}")


def clean_text(value: str) -> str:
    text = re.sub(r"<[^>]+>", "", value)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_heading_title(page_html: str, fallback: str) -> str:
    heading_match = re.search(r'<h1[^>]*id="firstHeading"[^>]*>(.*?)</h1>', page_html, re.DOTALL | re.IGNORECASE)
    if not heading_match:
        return fallback
    text = clean_text(heading_match.group(1))
    return text or fallback


def parse_verses(paragraph_html: str) -> list[dict[str, Any]]:
    marked = re.sub(r"<sup>\s*(\d+)\s*</sup>", r"|VERSE|\1|", paragraph_html)
    stripped = re.sub(r"<[^>]+>", "", marked)
    stripped = html.unescape(stripped)
    stripped = stripped.replace("\xa0", " ")
    stripped = re.sub(r"\s+", " ", stripped)
    parts = re.split(r"\|VERSE\|(\d+)\|", stripped)

    verses: list[dict[str, Any]] = []
    idx = 1
    while idx < len(parts) - 1:
        n = int(parts[idx])
        txt = parts[idx + 1].strip()
        if txt:
            verses.append({"n": n, "texto": txt})
        idx += 2
    return verses


def extract_chapters(page_html: str, page_url: str) -> list[dict[str, Any]]:
    heading_pattern = re.compile(
        r'<h2[^>]*id="((?:Caput|Psalmus|Prologus|Capitulum)_?\d*[^"]*)"[^>]*>(.*?)</h2>',
        re.DOTALL | re.IGNORECASE,
    )
    headings = list(heading_pattern.finditer(page_html))
    chapters: list[dict[str, Any]] = []

    for idx, heading in enumerate(headings):
        caput_id = heading.group(1)
        num_match = re.search(r"(\d+)", caput_id)
        if not num_match:
            continue
        chapter_num = int(num_match.group(1))

        start = heading.end()
        end = headings[idx + 1].start() if idx + 1 < len(headings) else len(page_html)
        segment = page_html[start:end]
        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", segment, flags=re.DOTALL | re.IGNORECASE)

        verses: list[dict[str, Any]] = []
        summary = ""

        for p_html in paragraphs:
            p_html = p_html.replace("&#160;", " ").replace("\xa0", " ")
            if not summary:
                summary_match = re.match(r"\s*<i>(.*?)</i>", p_html, flags=re.DOTALL | re.IGNORECASE)
                if summary_match:
                    summary = clean_text(summary_match.group(1))

            has_numbered_verse = bool(re.search(r"<sup>\s*\d+\s*</sup>", p_html))
            if has_numbered_verse:
                verses.extend(parse_verses(p_html))
                continue

            plain = clean_text(p_html)
            if not plain:
                continue

            if not verses:
                verses.append({"n": 0, "tipo": "epigrafe", "texto": plain})
            else:
                last = verses[-1]
                if "texto" in last:
                    last["texto"] = f"{last['texto']} {plain}".strip()

        if not verses:
            continue

        chapters.append(
            {
                "num": chapter_num,
                "sumario": summary,
                "versiculos": verses,
                "notas": {},
                "link": f"{page_url}#Caput_{chapter_num}",
            }
        )

    return chapters


def title_from_id(book_id: str) -> str:
    words = book_id.replace("-", " ").split()
    lowercase_words = {"de", "do", "da", "dos", "das", "e"}
    out: list[str] = []
    for i, word in enumerate(words):
        if i > 0 and word in lowercase_words:
            out.append(word)
        else:
            out.append(word[:1].upper() + word[1:])
    return " ".join(out)


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        return None
    return data


def write_json(path: Path, data: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def json_equal(a: dict[str, Any], b: dict[str, Any]) -> bool:
    return json.dumps(a, ensure_ascii=False, sort_keys=True) == json.dumps(b, ensure_ascii=False, sort_keys=True)


def chapter_files(book_dir: Path) -> dict[int, Path]:
    files: dict[int, Path] = {}
    if not book_dir.exists():
        return files
    for item in book_dir.iterdir():
        if item.name == "index.json" or item.suffix.lower() != ".json":
            continue
        if not item.stem.isdigit():
            continue
        files[int(item.stem)] = item
    return files


def merge_group(fig_group: str | None, fallback_group: str) -> str:
    if not fig_group:
        return fallback_group
    if fig_group.lower() in {"evangelhos"}:
        return "Evangelia"
    if "paul" in fig_group.lower():
        return "Epistolae Paulinae"
    if "cat" in fig_group.lower():
        return "Epistolae Catholicae"
    return fallback_group


def merge_testament(fig_testament: str | None, fallback_testament: str) -> str:
    if not fig_testament:
        return fallback_testament
    lowered = fig_testament.lower()
    if "novo" in lowered:
        return "Novum Testamentum"
    if "antigo" in lowered:
        return "Vetus Testamentum"
    return fallback_testament


def process_book(book: dict[str, str], force: bool, unchanged_files: list[str]) -> tuple[bool, bool]:
    book_id = book["id"]
    ws_slug = book["ws_slug"]
    book_dir = VULGATA_DIR / book_id
    book_dir.mkdir(parents=True, exist_ok=True)

    index_path = book_dir / "index.json"
    existing_index = read_json(index_path) or {}
    fig_index = read_json(FIGUEIREDO_DIR / book_id / "index.json") or {}
    existing_chapters = chapter_files(book_dir)
    existing_nums = sorted(existing_chapters.keys())

    declared_caps = existing_index.get("capitulos")
    if not isinstance(declared_caps, list):
        declared_caps = []
    declared_caps = sorted({int(c) for c in declared_caps if isinstance(c, int) or (isinstance(c, str) and c.isdigit())})

    has_complete_declared_set = bool(declared_caps) and all(c in existing_chapters for c in declared_caps)
    needs_fetch = force or not has_complete_declared_set

    page_url = f"{BASE_URL}/{ws_slug}"
    fetched_title = ""
    fetched_chapters: list[dict[str, Any]] = []

    if needs_fetch:
        print(f"[BOOK] {book_id} -> {page_url}")
        page_html = fetch(page_url)
        fetched_title = extract_heading_title(page_html, ws_slug.replace("_", " "))
        fetched_chapters = extract_chapters(page_html, page_url)
        if not fetched_chapters:
            raise RuntimeError(f"nenhum capitulo encontrado para {book_id} ({page_url})")
        time.sleep(0.6)
    else:
        print(f"[BOOK] {book_id} -> sem consulta remota (ja extraido)")

    wrote_chapter = False
    if fetched_chapters:
        for chapter in fetched_chapters:
            chapter_num = chapter["num"]
            chapter_path = book_dir / f"{chapter_num}.json"
            if chapter_path.exists() and not force:
                unchanged_files.append(str(chapter_path.relative_to(ROOT_DIR)))
                continue
            write_json(chapter_path, chapter)
            wrote_chapter = True

    final_caps = sorted(set(existing_nums) | {ch["num"] for ch in fetched_chapters})
    if not final_caps:
        final_caps = declared_caps
    if not final_caps:
        raise RuntimeError(f"livro {book_id} sem capitulos locais e sem dados extraidos")

    titulo = (
        fetched_title
        or str(existing_index.get("titulo") or "").strip()
        or ws_slug.replace("_", " ")
    )
    titulo_indice = title_from_id(book_id)

    new_index: dict[str, Any] = {
        "id": book_id,
        "titulo": titulo,
        "tituloIndice": titulo_indice,
        "abreviacao": str(existing_index.get("abreviacao") or fig_index.get("abreviacao") or book["abreviacao"]),
        "testamento": str(existing_index.get("testamento") or merge_testament(fig_index.get("testamento"), book["testamento"])),
        "grupo": str(existing_index.get("grupo") or merge_group(fig_index.get("grupo"), book["grupo"])),
        "capitulos": final_caps,
    }

    if "introducao" in existing_index and existing_index["introducao"]:
        new_index["introducao"] = existing_index["introducao"]

    wrote_index = False
    if index_path.exists() and not force and json_equal(existing_index, new_index):
        unchanged_files.append(str(index_path.relative_to(ROOT_DIR)))
    else:
        write_json(index_path, new_index)
        wrote_index = True

    return wrote_index, wrote_chapter


def main() -> None:
    force, requested_books = parse_args()
    if requested_books:
        selected_books = [b for b in BOOKS if b["id"] in requested_books]
        missing = sorted(requested_books - {b["id"] for b in selected_books})
        if missing:
            raise SystemExit(f"IDs de livro invalidos: {', '.join(missing)}")
    else:
        selected_books = BOOKS

    VULGATA_DIR.mkdir(parents=True, exist_ok=True)
    unchanged_files: list[str] = []
    changed_indexes = 0
    changed_chapters = 0

    for book in selected_books:
        wrote_index, wrote_chapter = process_book(book, force, unchanged_files)
        if wrote_index:
            changed_indexes += 1
        if wrote_chapter:
            changed_chapters += 1

    print("\n=== Concluido ===")
    print(f"Livros processados: {len(selected_books)}")
    print(f"Index.json alterados: {changed_indexes}")
    print(f"Livros com capitulos alterados: {changed_chapters}")

    if unchanged_files:
        print("\nArquivos nao alterados:")
        for relpath in sorted(set(unchanged_files)):
            print(f"- {relpath}")
    else:
        print("\nTodos os arquivos processados foram atualizados.")


if __name__ == "__main__":
    main()
