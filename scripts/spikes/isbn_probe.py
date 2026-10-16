# Probe : what each public source returns for a manga ISBN.
import json, re, sys, urllib.parse, urllib.request

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "yomushelf-spike/0.1"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")

def bnf(isbn):
    q = urllib.parse.urlencode({"version": "1.2", "operation": "searchRetrieve", "query": f'bib.isbn adj "{isbn}"', "recordSchema": "unimarcxchange", "maximumRecords": "1"})
    s = get("https://catalogue.bnf.fr/api/SRU?" + q)
    rec = re.search(r"<srw:record>.*?</srw:record>", s, re.S)
    if not rec: return None
    rec = rec.group(0)
    f200 = re.search(r'tag="200".*?</mxc:datafield>', rec, re.S)
    sub = lambda f, c: re.findall(rf'code="{c}">([^<]+)<', f) if f else []
    t200 = f200.group(0) if f200 else ""
    f210 = re.search(r'tag="21[04]".*?</mxc:datafield>', rec, re.S)
    f461 = re.search(r'tag="461".*?</mxc:datafield>', rec, re.S)
    return {"title": sub(t200, "a"), "part": sub(t200, "h") + sub(t200, "i"), "sub": sub(t200, "e"),
            "publisher": sub(f210.group(0) if f210 else "", "c"),
            "series": sub(f461.group(0) if f461 else "", "t"), "series_vol": sub(f461.group(0) if f461 else "", "v")}

def google(isbn):
    d = json.loads(get(f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"))
    if not d.get("totalItems"): return None
    v = d["items"][0]["volumeInfo"]
    return {"title": v.get("title"), "subtitle": v.get("subtitle"), "publisher": v.get("publisher"), "series": v.get("seriesInfo")}

def openlib(isbn):
    try:
        d = json.loads(get(f"https://openlibrary.org/isbn/{isbn}.json"))
    except Exception:
        return None
    return {"title": d.get("title"), "subtitle": d.get("subtitle"), "publishers": d.get("publishers"), "series": d.get("series"), "volume": d.get("volume_number")}

for isbn in sys.argv[1:]:
    print("==", isbn)
    for name, fn in (("bnf", bnf), ("google", google), ("openlib", openlib)):
        try:
            print(f"  {name:8}", fn(isbn))
        except Exception as e:
            print(f"  {name:8} ERROR {e}")
