"""Builds the public copy of the club's private sites.

Source repos are private; this public repo holds only the files the browser needs,
with youth players' names shortened to first name + initial (same rule the board
already uses on screen). Prints counts only, never names.
Usage: python3 tools/publish.py <src_root>   (src_root/<repo>/ for each repo below)
"""
import json, os, re, shutil, sys

SITES = ["ttc-club-board", "ttc-uniform-sizes", "ttc-mvh-tournaments"]
SKIP_DIRS = {".git", ".github", "e2e", "tools", "test", "tests", "node_modules", ".claude", "agents"}
SKIP_FILES = {"README.md", "AGENTS.md", "CLAUDE.md", "STATE.md", "package.json", "package-lock.json", ".gitignore"}
TEXT = (".html", ".js", ".json", ".css", ".txt", ".webmanifest", ".xml", ".svg")
ADULT = re.compile(r"^S(\d0)?$")


def short(name):
    w = name.split()
    return w[0] + " " + w[-1][0] + "׳" if len(w) > 1 else (w[0] if w else name)


def youth_map(board_dir):
    p = os.path.join(board_dir, "data.json")
    if not os.path.exists(p):
        return {}
    d = json.load(open(p, encoding="utf-8"))
    m = {}
    for pl in d.get("players", []):
        n, c = str(pl.get("n", "")).strip(), str(pl.get("c", ""))
        if n and not ADULT.match(c):
            m[n] = short(n)
            ws = n.split()
            if len(ws) > 2:  # federation lists some with a middle name; rosters use first + last
                m[ws[0] + " " + ws[-1]] = short(n)
    return m


def main(src):
    youth = youth_map(os.path.join(src, "ttc-club-board"))
    names = sorted(youth, key=len, reverse=True)
    changed = 0
    for site in SITES:
        s, out = os.path.join(src, site), os.path.join(os.getcwd(), site)
        if not os.path.isdir(s):
            print(f"{site}: source missing, left as is"); continue
        shutil.rmtree(out, ignore_errors=True)
        for root, dirs, files in os.walk(s):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                if f in SKIP_FILES or ".test." in f:
                    continue
                a = os.path.join(root, f); b = os.path.join(out, os.path.relpath(a, s))
                os.makedirs(os.path.dirname(b), exist_ok=True)
                if f.endswith(TEXT):
                    t = open(a, encoding="utf-8", errors="surrogateescape").read()
                    for n in names:
                        if n in t:
                            t = t.replace(n, youth[n]); changed += 1
                    open(b, "w", encoding="utf-8", errors="surrogateescape").write(t)
                else:
                    shutil.copy2(a, b)
    print(f"published {len(SITES)} sites, youth names: {len(youth)}, replacements: {changed}")


if __name__ == "__main__":
    main(sys.argv[1])
