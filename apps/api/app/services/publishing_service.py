from app.integrations.wordpress_client import WordPressClient


class PublishingService:
    def __init__(self, wordpress_client: WordPressClient) -> None:
        self.wordpress_client = wordpress_client

    async def publish_asset_as_draft(self, asset: dict) -> dict:
        html = self.render_asset_html(asset)
        return await self.wordpress_client.create_page_draft(
            title=asset["title"],
            slug=asset["slug"],
            html=html,
        )

    def render_asset_html(self, asset: dict) -> str:
        parts = []
        for section in asset.get("sections", []):
            heading = section.get("heading")
            body = section.get("body")
            if heading:
                parts.append(f"<h2>{heading}</h2>")
            if body:
                parts.append(f"<p>{body}</p>")
        return "\n".join(parts)

