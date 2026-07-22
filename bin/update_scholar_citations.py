#!/usr/bin/env python

import os
import sys
from datetime import datetime
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import yaml
from scholarly import scholarly


SOCIALS_FILE = "_data/socials.yml"
OUTPUT_FILE = "_data/citations.yml"


def load_social_ids() -> tuple[str, str]:
    """Load the profile IDs used by the citation providers."""
    if not os.path.exists(SOCIALS_FILE):
        raise RuntimeError(f"Configuration file {SOCIALS_FILE} was not found.")

    try:
        with open(SOCIALS_FILE, "r", encoding="utf-8") as file:
            config = yaml.safe_load(file) or {}
    except yaml.YAMLError as error:
        raise RuntimeError(f"Could not parse {SOCIALS_FILE}: {error}") from error

    scholar_user_id = config.get("scholar_userid")
    inspirehep_id = config.get("inspirehep_id")
    if not scholar_user_id or not inspirehep_id:
        raise RuntimeError(
            "Both 'scholar_userid' and 'inspirehep_id' must be set in "
            f"{SOCIALS_FILE}."
        )
    return str(scholar_user_id), str(inspirehep_id)


def load_existing_data() -> dict:
    """Read the current data so one provider can fail without losing data."""
    if not os.path.exists(OUTPUT_FILE):
        return {}

    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as file:
            return yaml.safe_load(file) or {}
    except (OSError, yaml.YAMLError) as error:
        print(f"Warning: Could not read {OUTPUT_FILE}: {error}")
        return {}


def fetch_google_scholar(scholar_user_id: str) -> tuple[dict, dict]:
    """Return the Google Scholar profile metric and per-paper citations."""
    print(f"Fetching Google Scholar profile: {scholar_user_id}")
    scholarly.set_timeout(15)
    scholarly.set_retries(3)
    author = scholarly.search_author_id(scholar_user_id)
    author_data = scholarly.fill(author)

    if not author_data or "publications" not in author_data:
        raise RuntimeError("Google Scholar returned no publications.")

    citations_per_year = sorted(
        (
            {"year": int(year), "citations": int(citations)}
            for year, citations in author_data.get("cites_per_year", {}).items()
        ),
        key=lambda item: item["year"],
    )[-7:]
    citation_peak = max(
        (item["citations"] for item in citations_per_year), default=0
    )
    for item in citations_per_year:
        item["percent"] = (
            round(item["citations"] / citation_peak * 100, 1) if citation_peak else 0
        )

    profile = {
        "citations": int(author_data.get("citedby", 0)),
        "citation_peak": citation_peak,
        "citations_per_year": citations_per_year,
        "url": f"https://scholar.google.com/citations?user={scholar_user_id}&hl=en",
    }
    papers = {}
    for publication in author_data["publications"]:
        publication_id = publication.get("pub_id") or publication.get("author_pub_id")
        if not publication_id:
            title = publication.get("bib", {}).get("title", "Unknown title")
            print(f"Warning: Skipping Scholar publication without an ID: {title}")
            continue

        bibliography = publication.get("bib", {})
        papers[publication_id] = {
            "title": bibliography.get("title", "Unknown Title"),
            "year": bibliography.get("pub_year", "Unknown Year"),
            "citations": int(publication.get("num_citations", 0)),
        }

    print(f"Google Scholar total: {profile['citations']}")
    return profile, papers


def fetch_json(url: str) -> dict:
    """Fetch JSON from a public API with an identifiable user agent."""
    request = Request(url, headers={"User-Agent": "al-folio-citation-updater/1.0"})
    with urlopen(request, timeout=20) as response:
        return yaml.safe_load(response.read())


def fetch_inspirehep(inspirehep_id: str) -> dict:
    """Sum citations for records linked to the author's INSPIRE BAI."""
    print(f"Fetching INSPIRE profile: {inspirehep_id}")
    author_data = fetch_json(f"https://inspirehep.net/api/authors/{inspirehep_id}")
    author_ids = author_data.get("metadata", {}).get("ids", [])
    bai = next(
        (item.get("value") for item in author_ids if item.get("schema") == "INSPIRE BAI"),
        None,
    )
    if not bai:
        raise RuntimeError("INSPIRE returned no BAI for this author.")

    query = urlencode({"q": f"a {bai}", "size": 250})
    next_url = f"https://inspirehep.net/api/literature?{query}"
    citations = 0
    citation_counts = []
    article_count = 0
    arxiv_category_counts = {}
    venue_counts = {}
    venue_names = {
        "J.Phys.Conf.Ser.": "Journal of Physics: Conference Series",
        "Phys.Rev.D": "Physical Review D",
        "Phys.Rev.Lett.": "Physical Review Letters",
    }
    while next_url:
        literature_data = fetch_json(next_url)
        for record in literature_data.get("hits", {}).get("hits", []):
            metadata = record.get("metadata", {})
            citation_count = int(metadata.get("citation_count", 0))
            citations += citation_count
            citation_counts.append(citation_count)

            primary_category = metadata.get("primary_arxiv_category", [])
            if isinstance(primary_category, list):
                primary_category = primary_category[0] if primary_category else None
            if primary_category:
                category = primary_category.split(".", maxsplit=1)[0]
                arxiv_category_counts[category] = (
                    arxiv_category_counts.get(category, 0) + 1
                )

            document_types = metadata.get("document_type", [])
            if not {"article", "conference paper"}.intersection(document_types):
                continue

            article_count += 1
            publication_info = metadata.get("publication_info", [])
            journal = publication_info[0].get("journal_title") if publication_info else None
            if not metadata.get("dois") or not journal:
                venue = "arXiv preprints"
            else:
                venue = venue_names.get(journal, journal)
            venue_counts[venue] = venue_counts.get(venue, 0) + 1

        next_url = literature_data.get("links", {}).get("next")

    venues = [
        {"name": name, "count": count}
        for name, count in sorted(
            venue_counts.items(), key=lambda item: (-item[1], item[0].lower())
        )
    ]
    arxiv_categories = [
        {"name": name, "count": count}
        for name, count in sorted(
            arxiv_category_counts.items(), key=lambda item: (-item[1], item[0])
        )
    ]
    h_index = sum(
        citation_count >= position
        for position, citation_count in enumerate(
            sorted(citation_counts, reverse=True), start=1
        )
    )
    print(
        f"INSPIRE total: {citations} citations across {article_count} articles; "
        f"h-index: {h_index}"
    )
    return {
        "articles": article_count,
        "arxiv_categories": arxiv_categories,
        "arxiv_submissions": sum(arxiv_category_counts.values()),
        "arxiv_url": (
            "https://arxiv.org/search/?searchtype=author&query=Padilla-Gay%2C+I"
        ),
        "citations": citations,
        "h_index": h_index,
        "url": f"https://inspirehep.net/authors/{inspirehep_id}",
        "venues": venues,
    }


def update_citations() -> None:
    """Update profile metrics and publication-level Google Scholar citations."""
    scholar_user_id, inspirehep_id = load_social_ids()
    existing_data = load_existing_data()
    citation_data = {
        "metadata": existing_data.get("metadata", {}),
        "metrics": existing_data.get("metrics", {}),
        "papers": existing_data.get("papers", {}),
    }
    successful_sources = 0

    try:
        scholar_profile, papers = fetch_google_scholar(scholar_user_id)
        citation_data["metrics"]["google_scholar"] = scholar_profile
        citation_data["papers"] = papers
        successful_sources += 1
    except Exception as error:
        print(f"Warning: Google Scholar update failed: {error}")

    try:
        citation_data["metrics"]["inspirehep"] = fetch_inspirehep(inspirehep_id)
        successful_sources += 1
    except Exception as error:
        print(f"Warning: INSPIRE update failed: {error}")

    if successful_sources == 0:
        raise RuntimeError("No citation provider could be updated.")

    content_changed = (
        citation_data["metrics"] != existing_data.get("metrics", {})
        or citation_data["papers"] != existing_data.get("papers", {})
    )
    if not content_changed:
        print("Citation data has not changed; leaving the file untouched.")
        return

    citation_data["metadata"]["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
            yaml.safe_dump(citation_data, file, width=1000, sort_keys=True)
    except OSError as error:
        raise RuntimeError(f"Could not write {OUTPUT_FILE}: {error}") from error
    print(f"Citation data saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    try:
        update_citations()
    except Exception as error:
        print(f"Citation update failed: {error}")
        sys.exit(1)
