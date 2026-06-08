class WordPressClient:
    def __init__(self, base_url: str | None = None, token: str | None = None) -> None:
        self.base_url = base_url
        self.token = token

    async def list_pages(self) -> list[dict]:
        return []

    async def create_page_draft(self, title: str, slug: str, html: str) -> dict:
        return {
            "external_id": None,
            "draft_url": None,
            "title": title,
            "slug": slug,
            "html": html,
            "status": "draft_stub",
        }

