class ProductMatcherService:
    def match_query_to_products(self, query: str, products: list[dict]) -> list[dict]:
        query_terms = set(query.lower().split())
        matches = []
        for product in products:
            haystack = " ".join(
                [
                    product.get("name", ""),
                    product.get("category", ""),
                    " ".join(product.get("attributes", [])),
                ]
            ).lower()
            overlap = len(query_terms.intersection(haystack.split()))
            if overlap:
                matches.append({"product": product, "match_score": min(100, overlap * 25)})
        return sorted(matches, key=lambda item: item["match_score"], reverse=True)

