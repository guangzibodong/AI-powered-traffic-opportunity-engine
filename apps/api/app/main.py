from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import assets, health, integrations, opportunities, performance, products, queries, stores, tasks


def create_app() -> FastAPI:
    app = FastAPI(
        title="TrafScope Commerce OS API",
        version="0.1.0",
        description="AI traffic operator backend for WooCommerce and WordPress stores.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(stores.router, prefix="/api/stores", tags=["stores"])
    app.include_router(integrations.router, prefix="/api/stores", tags=["integrations"])
    app.include_router(products.router, prefix="/api/stores", tags=["products"])
    app.include_router(queries.router, prefix="/api/stores", tags=["queries"])
    app.include_router(opportunities.router, prefix="/api/stores", tags=["opportunities"])
    app.include_router(tasks.router, prefix="/api/stores", tags=["tasks"])
    app.include_router(assets.router, prefix="/api/stores", tags=["assets"])
    app.include_router(performance.router, prefix="/api/stores", tags=["performance"])
    return app


app = create_app()

