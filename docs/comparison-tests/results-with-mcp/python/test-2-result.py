"""
Test PY-2: FastAPI Endpoint
Create FastAPI REST API for Products:
- GET /products, GET /products/{id}
- POST /products, PUT /products/{id}
- DELETE /products/{id}

Products: id, name, price (>0), stock (>=0). Include Pydantic validation and tests.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import FastAPI, HTTPException, status, Path, Body
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field, field_validator, ConfigDict


# ============================================================================
# Pydantic Models (DTOs)
# ============================================================================

class CreateProductRequest(BaseModel):
    """Request model for creating a product."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Annotated[str, Field(min_length=1, description="Product name")]
    price: Annotated[Decimal, Field(gt=0, description="Product price (must be > 0)")]
    stock: Annotated[int, Field(ge=0, description="Product stock (must be >= 0)")]

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class UpdateProductRequest(BaseModel):
    """Request model for updating a product."""
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Annotated[str | None, Field(min_length=1, default=None)]
    price: Annotated[Decimal | None, Field(gt=0, default=None)]
    stock: Annotated[int | None, Field(ge=0, default=None)]

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v else None


class ProductResponse(BaseModel):
    """Response model for a product."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    price: Decimal
    stock: int
    created_at: datetime
    updated_at: datetime


class ErrorResponse(BaseModel):
    """Error response model."""
    detail: str


# ============================================================================
# Domain Entity
# ============================================================================

class Product:
    """Product domain entity."""

    def __init__(
        self,
        id: str,
        name: str,
        price: Decimal,
        stock: int,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
    ) -> None:
        self.id = id
        self.name = name
        self.price = price
        self.stock = stock
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or self.created_at


# ============================================================================
# In-Memory Repository
# ============================================================================

class InMemoryProductRepository:
    """In-memory product repository."""

    def __init__(self) -> None:
        self._products: dict[str, Product] = {}

    def save(self, product: Product) -> Product:
        self._products[product.id] = product
        return product

    def find_by_id(self, product_id: str) -> Product | None:
        return self._products.get(product_id)

    def find_all(self) -> list[Product]:
        return list(self._products.values())

    def delete(self, product_id: str) -> bool:
        if product_id in self._products:
            del self._products[product_id]
            return True
        return False

    def exists(self, product_id: str) -> bool:
        return product_id in self._products

    def clear(self) -> None:
        self._products.clear()


# ============================================================================
# Product Service
# ============================================================================

class ProductNotFoundException(Exception):
    """Raised when product is not found."""

    def __init__(self, product_id: str) -> None:
        self.product_id = product_id
        super().__init__(f"Product with id '{product_id}' not found")


class ProductService:
    """Service for managing products."""

    def __init__(self, repository: InMemoryProductRepository) -> None:
        self._repository = repository

    def create_product(self, request: CreateProductRequest) -> Product:
        """Create a new product."""
        product = Product(
            id=str(uuid.uuid4()),
            name=request.name,
            price=request.price,
            stock=request.stock,
        )
        return self._repository.save(product)

    def get_product_by_id(self, product_id: str) -> Product:
        """Get a product by ID."""
        product = self._repository.find_by_id(product_id)
        if product is None:
            raise ProductNotFoundException(product_id)
        return product

    def list_all_products(self) -> list[Product]:
        """List all products."""
        return self._repository.find_all()

    def update_product(self, product_id: str, request: UpdateProductRequest) -> Product:
        """Update an existing product."""
        product = self.get_product_by_id(product_id)

        if request.name is not None:
            product.name = request.name
        if request.price is not None:
            product.price = request.price
        if request.stock is not None:
            product.stock = request.stock

        product.updated_at = datetime.now()
        return self._repository.save(product)

    def delete_product(self, product_id: str) -> None:
        """Delete a product."""
        if not self._repository.exists(product_id):
            raise ProductNotFoundException(product_id)
        self._repository.delete(product_id)


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(title="Products API", version="1.0.0")

# Dependency injection (simple approach for demo)
repository = InMemoryProductRepository()
product_service = ProductService(repository)


@app.get(
    "/products",
    response_model=list[ProductResponse],
    summary="List all products",
)
def list_products() -> list[Product]:
    """Get all products."""
    return product_service.list_all_products()


@app.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get product by ID",
)
def get_product(product_id: Annotated[str, Path(description="Product ID")]) -> Product:
    """Get a specific product by ID."""
    try:
        return product_service.get_product_by_id(product_id)
    except ProductNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@app.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    responses={422: {"model": ErrorResponse}},
    summary="Create a new product",
)
def create_product(request: Annotated[CreateProductRequest, Body()]) -> Product:
    """Create a new product."""
    return product_service.create_product(request)


@app.put(
    "/products/{product_id}",
    response_model=ProductResponse,
    responses={404: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Update a product",
)
def update_product(
    product_id: Annotated[str, Path(description="Product ID")],
    request: Annotated[UpdateProductRequest, Body()],
) -> Product:
    """Update an existing product."""
    try:
        return product_service.update_product(product_id, request)
    except ProductNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@app.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
    summary="Delete a product",
)
def delete_product(product_id: Annotated[str, Path(description="Product ID")]) -> None:
    """Delete a product."""
    try:
        product_service.delete_product(product_id)
    except ProductNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Tests
# ============================================================================

import pytest


@pytest.fixture
def client() -> TestClient:
    """Create a test client with a fresh repository."""
    repository.clear()
    return TestClient(app)


@pytest.fixture
def sample_product(client: TestClient) -> dict:
    """Create a sample product and return its data."""
    response = client.post(
        "/products",
        json={"name": "Widget", "price": "9.99", "stock": 100},
    )
    return response.json()


class TestListProducts:
    """Tests for GET /products."""

    def test_list_empty_products(self, client: TestClient) -> None:
        """Should return empty list when no products exist."""
        response = client.get("/products")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_all_products(self, client: TestClient) -> None:
        """Should return all products."""
        client.post("/products", json={"name": "Product 1", "price": "10.00", "stock": 10})
        client.post("/products", json={"name": "Product 2", "price": "20.00", "stock": 20})

        response = client.get("/products")

        assert response.status_code == 200
        products = response.json()
        assert len(products) == 2


class TestGetProduct:
    """Tests for GET /products/{id}."""

    def test_get_existing_product(self, client: TestClient, sample_product: dict) -> None:
        """Should return product when found."""
        response = client.get(f"/products/{sample_product['id']}")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Widget"
        assert data["price"] == "9.99"
        assert data["stock"] == 100

    def test_get_nonexistent_product(self, client: TestClient) -> None:
        """Should return 404 when product not found."""
        response = client.get("/products/nonexistent-id")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


class TestCreateProduct:
    """Tests for POST /products."""

    def test_create_product_with_valid_data(self, client: TestClient) -> None:
        """Should create product with valid data."""
        response = client.post(
            "/products",
            json={"name": "New Product", "price": "29.99", "stock": 50},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Product"
        assert data["price"] == "29.99"
        assert data["stock"] == 50
        assert "id" in data

    def test_create_product_with_zero_stock(self, client: TestClient) -> None:
        """Should allow zero stock."""
        response = client.post(
            "/products",
            json={"name": "Out of Stock", "price": "10.00", "stock": 0},
        )

        assert response.status_code == 201
        assert response.json()["stock"] == 0

    def test_create_product_fails_with_empty_name(self, client: TestClient) -> None:
        """Should fail with empty name."""
        response = client.post(
            "/products",
            json={"name": "", "price": "10.00", "stock": 10},
        )

        assert response.status_code == 422

    def test_create_product_fails_with_zero_price(self, client: TestClient) -> None:
        """Should fail with zero price."""
        response = client.post(
            "/products",
            json={"name": "Test", "price": "0", "stock": 10},
        )

        assert response.status_code == 422

    def test_create_product_fails_with_negative_price(self, client: TestClient) -> None:
        """Should fail with negative price."""
        response = client.post(
            "/products",
            json={"name": "Test", "price": "-10.00", "stock": 10},
        )

        assert response.status_code == 422

    def test_create_product_fails_with_negative_stock(self, client: TestClient) -> None:
        """Should fail with negative stock."""
        response = client.post(
            "/products",
            json={"name": "Test", "price": "10.00", "stock": -5},
        )

        assert response.status_code == 422


class TestUpdateProduct:
    """Tests for PUT /products/{id}."""

    def test_update_product_name(self, client: TestClient, sample_product: dict) -> None:
        """Should update product name."""
        response = client.put(
            f"/products/{sample_product['id']}",
            json={"name": "Updated Name"},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"
        assert response.json()["price"] == "9.99"  # Unchanged

    def test_update_product_price(self, client: TestClient, sample_product: dict) -> None:
        """Should update product price."""
        response = client.put(
            f"/products/{sample_product['id']}",
            json={"price": "19.99"},
        )

        assert response.status_code == 200
        assert response.json()["price"] == "19.99"

    def test_update_product_stock(self, client: TestClient, sample_product: dict) -> None:
        """Should update product stock."""
        response = client.put(
            f"/products/{sample_product['id']}",
            json={"stock": 200},
        )

        assert response.status_code == 200
        assert response.json()["stock"] == 200

    def test_update_multiple_fields(self, client: TestClient, sample_product: dict) -> None:
        """Should update multiple fields at once."""
        response = client.put(
            f"/products/{sample_product['id']}",
            json={"name": "New Name", "price": "99.99", "stock": 999},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["price"] == "99.99"
        assert data["stock"] == 999

    def test_update_nonexistent_product(self, client: TestClient) -> None:
        """Should return 404 when updating nonexistent product."""
        response = client.put(
            "/products/nonexistent-id",
            json={"name": "Test"},
        )

        assert response.status_code == 404

    def test_update_fails_with_invalid_price(self, client: TestClient, sample_product: dict) -> None:
        """Should fail with invalid price."""
        response = client.put(
            f"/products/{sample_product['id']}",
            json={"price": "-5.00"},
        )

        assert response.status_code == 422

    def test_update_fails_with_invalid_stock(self, client: TestClient, sample_product: dict) -> None:
        """Should fail with invalid stock."""
        response = client.put(
            f"/products/{sample_product['id']}",
            json={"stock": -1},
        )

        assert response.status_code == 422


class TestDeleteProduct:
    """Tests for DELETE /products/{id}."""

    def test_delete_existing_product(self, client: TestClient, sample_product: dict) -> None:
        """Should delete existing product."""
        response = client.delete(f"/products/{sample_product['id']}")

        assert response.status_code == 204

        # Verify deletion
        get_response = client.get(f"/products/{sample_product['id']}")
        assert get_response.status_code == 404

    def test_delete_nonexistent_product(self, client: TestClient) -> None:
        """Should return 404 when deleting nonexistent product."""
        response = client.delete("/products/nonexistent-id")

        assert response.status_code == 404

    def test_delete_preserves_other_products(self, client: TestClient) -> None:
        """Should not affect other products."""
        res1 = client.post("/products", json={"name": "Product 1", "price": "10.00", "stock": 10})
        res2 = client.post("/products", json={"name": "Product 2", "price": "20.00", "stock": 20})
        res3 = client.post("/products", json={"name": "Product 3", "price": "30.00", "stock": 30})

        product1_id = res1.json()["id"]
        product2_id = res2.json()["id"]

        client.delete(f"/products/{product2_id}")

        all_products = client.get("/products").json()
        assert len(all_products) == 2
        product_ids = [p["id"] for p in all_products]
        assert product1_id in product_ids
        assert product2_id not in product_ids


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
