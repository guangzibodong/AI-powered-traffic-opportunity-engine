import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


SAMPLE_WOOCOMMERCE_PRODUCTS = [
    {
        "id": 101,
        "name": "Trail Brew Portable Espresso Maker",
        "slug": "trail-brew-portable-espresso-maker",
        "sku": "TB-ESP-01",
        "status": "publish",
        "permalink": "https://example.com/product/trail-brew-portable-espresso-maker",
        "price": "89.00",
        "regular_price": "99.00",
        "stock_status": "instock",
        "categories": [{"id": 7, "name": "Camping Coffee"}],
        "attributes": [{"name": "Use case", "options": ["Camping", "Travel"]}],
        "images": [{"src": "https://example.com/images/trail-brew.jpg"}],
    },
    {
        "id": 102,
        "name": "Manual Burr Grinder Camp Kit",
        "slug": "manual-burr-grinder-camp-kit",
        "sku": "TB-GRIND-02",
        "status": "publish",
        "permalink": "https://example.com/product/manual-burr-grinder-camp-kit",
        "price": "49.50",
        "stock_status": "outofstock",
        "categories": [{"id": 8, "name": "Coffee Grinders"}],
        "attributes": [{"name": "Use case", "options": ["Camping"]}],
        "images": [{"src": "https://example.com/images/grinder.jpg"}],
    },
]


class WooCommerceProductImportServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        from app.services.product_sync_service import clear_imported_products

        clear_imported_products()

    def tearDown(self) -> None:
        from app.services.product_sync_service import clear_imported_products

        clear_imported_products()

    def test_import_products_normalizes_rows_and_sorts_available_products_first(self):
        from app.services.product_sync_service import import_woocommerce_products, list_imported_products

        summary = import_woocommerce_products("store-demo-outdoor-coffee", SAMPLE_WOOCOMMERCE_PRODUCTS)
        products = list_imported_products("store-demo-outdoor-coffee")

        self.assertEqual(summary["mode"], "woocommerce_import")
        self.assertEqual(summary["imported_products"], 2)
        self.assertEqual(summary["skipped_products"], 0)
        self.assertEqual(products[0]["name"], "Trail Brew Portable Espresso Maker")
        self.assertEqual(products[0]["external_id"], "101")
        self.assertEqual(products[0]["source"], "woocommerce_import")
        self.assertEqual(products[0]["stock_status"], "instock")
        self.assertTrue(products[0]["in_stock"])
        self.assertEqual(products[0]["categories"], ["Camping Coffee"])
        self.assertEqual(products[0]["attributes"]["Use case"], ["Camping", "Travel"])
        self.assertEqual(products[0]["images"], ["https://example.com/images/trail-brew.jpg"])
        self.assertAlmostEqual(products[0]["price"], 89.0)
        self.assertTrue(products[0]["id"].startswith("wc_"))
        self.assertFalse(products[1]["in_stock"])

    def test_import_products_is_idempotent_for_same_store_and_external_id(self):
        from app.services.product_sync_service import import_woocommerce_products, list_imported_products

        import_woocommerce_products("store-demo-outdoor-coffee", SAMPLE_WOOCOMMERCE_PRODUCTS)
        second = import_woocommerce_products("store-demo-outdoor-coffee", SAMPLE_WOOCOMMERCE_PRODUCTS)
        products = list_imported_products("store-demo-outdoor-coffee")

        self.assertEqual(second["imported_products"], 2)
        self.assertEqual(second["total_products"], 2)
        self.assertEqual(len(products), 2)

    async def test_sync_products_uses_read_only_client_calls(self):
        from app.services.product_sync_service import ProductSyncService, list_imported_products

        class FakeWooCommerceClient:
            def __init__(self) -> None:
                self.list_products_called = 0
                self.write_calls: list[str] = []

            async def list_products(self) -> list[dict]:
                self.list_products_called += 1
                return SAMPLE_WOOCOMMERCE_PRODUCTS

            async def create_product(self, payload: dict) -> None:
                self.write_calls.append("create_product")

            async def update_product(self, product_id: str, payload: dict) -> None:
                self.write_calls.append("update_product")

            async def delete_product(self, product_id: str) -> None:
                self.write_calls.append("delete_product")

        client = FakeWooCommerceClient()
        summary = await ProductSyncService(client).sync_products("store-demo-outdoor-coffee")

        self.assertEqual(client.list_products_called, 1)
        self.assertEqual(client.write_calls, [])
        self.assertEqual(summary["mode"], "woocommerce_import")
        self.assertEqual(summary["synced_products"], 2)
        self.assertEqual(len(list_imported_products("store-demo-outdoor-coffee")), 2)


class WooCommerceClientSafetyTests(unittest.TestCase):
    def test_woocommerce_client_exposes_no_write_methods(self):
        from app.integrations.woocommerce_client import WooCommerceClient

        client = WooCommerceClient()
        unsafe_prefixes = ("create_", "update_", "delete_", "post_", "put_", "patch_")
        unsafe_methods = [name for name in dir(client) if name.startswith(unsafe_prefixes)]

        self.assertEqual(unsafe_methods, [])


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class WooCommerceProductImportApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        from app.services.product_sync_service import clear_imported_products

        clear_imported_products()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        from app.services.product_sync_service import clear_imported_products

        clear_imported_products()

    def test_import_products_endpoint_then_list_and_detail_products(self):
        response = self.client.post(
            "/api/stores/store-demo-outdoor-coffee/products/import-woocommerce",
            json={"products": SAMPLE_WOOCOMMERCE_PRODUCTS},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "woocommerce_import")
        self.assertEqual(payload["summary"]["imported_products"], 2)

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/products")
        self.assertEqual(list_response.status_code, 200)
        products = list_response.json()["products"]
        self.assertEqual(len(products), 2)
        self.assertEqual(products[0]["external_id"], "101")

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/products/{products[0]['id']}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["product"]["id"], products[0]["id"])

    def test_import_products_endpoint_returns_400_for_missing_products_array(self):
        response = self.client.post(
            "/api/stores/store-demo-outdoor-coffee/products/import-woocommerce",
            json={"products": "not-a-list"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Missing products array")

    def test_product_detail_returns_404_for_unknown_imported_product(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/products/missing-product")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
