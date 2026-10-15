# Score BnF SRU identification against publisher/retailer ground truth.
import json, re, sys, time, unicodedata, urllib.parse, urllib.request

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "yomushelf-spike/0.2"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")

def isbn10(isbn13):
    if not isbn13.startswith("978"): return None
    core = isbn13[3:12]
    s = sum((10 - i) * int(c) for i, c in enumerate(core)) % 11
    chk = (11 - s) % 11
    return core + ("X" if chk == 10 else str(chk))

def fields(rec, tag):
    return re.findall(rf'tag="{tag}"[^>]*>(.*?)</mxc:datafield>', rec, re.S)

def subs(f, codes):
    return [(c, v) for c, v in re.findall(r'code="([a-z0-9])">([^<]*)<', f) if c in codes]

def bnf(isbn):
    q = urllib.parse.urlencode({"version": "1.2", "operation": "searchRetrieve",
        "query": f'bib.isbn adj "{isbn}"', "recordSchema": "unimarcxchange", "maximumRecords": "3"})
    s = get("https://catalogue.bnf.fr/api/SRU?" + q)
    recs = re.findall(r"<srw:record>.*?</srw:record>", s, re.S)
    return recs

def parse(rec):
    f200 = fields(rec, "200")
    t = subs(f200[0], "aehi") if f200 else []
    title = " ".join(v for c, v in t if c == "a")
    rest = " ".join(v for c, v in t if c in "ei")
    parts = [v for c, v in t if c == "h"]
    ed = " ".join(v for f in fields(rec, "205") for c, v in subs(f, "ab"))
    s461 = [v for f in fields(rec, "461") for c, v in subs(f, "t")]
    v461 = [v for f in fields(rec, "461") for c, v in subs(f, "v")]
    s225 = [v for f in fields(rec, "225") for c, v in subs(f, "a")]
    v225 = [v for f in fields(rec, "225") for c, v in subs(f, "v")]
    num = None
    for cand in parts + v461 + v225 + re.findall(r"(?:tome|t\.|vol\.?)\s*(\d+)", title + " " + rest, re.I):
        m = re.search(r"\d+", cand)
        if m: num = int(m.group()); break
    return {"title": title, "rest": rest, "edition_stmt": ed, "series": s461 + s225, "num": num, "parts": parts}

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s.replace("×", "x")).strip()

KEYWORDS = ["perfect", "originale", "hokage", "deluxe", "collector", "full color", "star", "smash", "anniversaire", "nouvelle", "coffret", "coffre", "integrale", "ultimate"]

def edition_markers(p):
    txt = norm(" ".join([p["title"], p["rest"], p["edition_stmt"]] + p["series"]))
    return [k for k in KEYWORDS if k in txt]

truth = json.load(open(sys.argv[1]))
rows = []
for t in truth:
    recs, via = bnf(t["isbn13"]), "13"
    time.sleep(0.4)
    if not recs and isbn10(t["isbn13"]):
        recs, via = bnf(isbn10(t["isbn13"])), "10"
        time.sleep(0.4)
    if not recs:
        rows.append({**t, "found": False}); continue
    p = parse(recs[0])
    core = norm(t["series"]).split(" ")
    core = " ".join(core[:2]) if len(core) > 1 else core[0]
    hay = norm(" ".join([p["title"]] + p["series"]))
    series_ok = core in hay or norm(t["series"]).split(" ")[0] in hay
    if t["volume"] is None:
        vol_ok = None
    else:
        vol_ok = p["num"] == t["volume"]
    marks = edition_markers(p)
    std = t["edition"].lower().startswith("standard")
    want = [k for k in KEYWORDS if k in norm(t["edition"])]
    if std:
        ed_ok = not any(m for m in marks if m not in ("originale",))  # "originale" is how Glénat names its regular line
    else:
        ed_ok = bool(want) and any(w in marks for w in want)
    rows.append({**t, "found": True, "via": via, "bnf_title": p["title"], "bnf_rest": p["rest"], "bnf_num": p["num"], "bnf_ed": p["edition_stmt"], "markers": marks,
                 "series_ok": series_ok, "vol_ok": vol_ok, "ed_ok": ed_ok})

json.dump(rows, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
found = [r for r in rows if r["found"]]
def rate(key, sub):
    vals = [r[key] for r in sub if r.get(key) is not None]
    return f"{sum(vals)}/{len(vals)}"
print("trouvés", f"{len(found)}/{len(rows)}", "| dont via ISBN-10", sum(1 for r in found if r["via"] == "10"))
print("série", rate("series_ok", found), "| numéro", rate("vol_ok", found), "| édition", rate("ed_ok", found))
std = [r for r in found if r["edition"].lower().startswith("standard")]
spe = [r for r in found if not r["edition"].lower().startswith("standard")]
print("édition standard reconnue comme standard", rate("ed_ok", std), "| édition spéciale reconnue", rate("ed_ok", spe))
for r in rows:
    if not r["found"] or not r["series_ok"] or r["vol_ok"] is False or not r["ed_ok"]:
        print("-", r["isbn13"], r["series"], r["volume"], r["edition"], "=>", "NON TROUVÉ" if not r["found"] else f'{r["bnf_title"]} | {r["bnf_rest"]} | n°{r["bnf_num"]} | 205:{r["bnf_ed"]} | {r["markers"]}')
