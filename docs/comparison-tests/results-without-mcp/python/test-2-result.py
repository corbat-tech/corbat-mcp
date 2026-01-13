# Test PY-2: FastAPI REST API for Products

from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4
from decimal import Decimal

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, field_validator
import pytest
from fastapi.testclient import TestClient


# Models
@dataclass
class Product:
    name: str
    price: float
    stock: int
    id: str = field(default_factory=lambda: str(uuid4()))


# Pydantic schemas
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1)
    price: float = Field(..., gt=0, description="Price must be greater than 0")
    stock: int = Field(..., ge=0, description="Stock cannot be negative")


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)


class ProductResponse(BaseModel):
    id: str
    name: str
    price: float
    stock: int


# Repository
class ProductRepository:
    def __init__(self):
        self._products: dict[str, Product] = {}

    def save(self, product: Product) -> Product:
        self._products[product.id] = product
        return product

    def find_by_id(self, product_id: str) -> Optional[Product]:
        return self._products.get(product_id)

    def find_all(self) -> list[Product]:
        return list(self._products.values())

    def delete(self, product_id: str) -> bool:
        if product_id in self._products:
            del self._products[product_id]
            return True
        return False

    def clear(self) -> None:
        self._products.clear()


# App
app = FastAPI()
repository = ProductRepository()


@app.get("/products", response_model=list[ProductResponse])
def list_products():
    return repository.find_all()


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str):
    product = repository.find_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found"
        )
    return product


@app.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product_data: ProductCreate):
    product = Product(
        name=product_data.name,
        price=product_data.price,
        stock=product_data.stock
    )
    return repository.save(product)


@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: str, product_data: ProductUpdate):
    product = repository.find_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found"
        )

    if product_data.name is not None:
        product.name = product_data.name
    if product_data.price is not None:
        product.price = product_data.price
    if product_data.stock is not None:
        product.stock = product_data.stock

    return repository.save(product)


@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str):
    product = repository.find_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found"
        )
    repository.delete(product_id)


# Tests
class TestProductAPI:
    @pytest.fixture
    def client(self):
        repository.clear()
        return TestClient(app)

    @pytest.fixture
    def sample_product(self, client):
        response = client.post(
            "/products",
            json={"name": "Test Product", "price": 29.99, "stock": 100}
        )
        return response.json()

    class TestListProducts:
        def test_returns_empty_list_when_no_products(self, client):
            response = client.get("/products")

            assert response.status_code == 200
            assert response.json() == []

        def test_returns_all_products(self, client, sample_product):
            response = client.get("/products")

            assert response.status_code == 200
            assert len(response.json()) == 1

    class TestGetProduct:
        def test_returns_product_when_exists(self, client, sample_product):
            response = client.get(f"/products/{sample_product['id']}")

            assert response.status_code == 200
            assert response.json()["name"] == "Test Product"

        def test_returns_404_when_not_found(self, client):
            response = client.get("/products/invalid-id")

            assert response.status_code == 404

    class TestCreateProduct:
        def test_creates_product_with_valid_data(self, client):
            response = client.post(
                "/products",
                json={"name": "New Product", "price": 49.99, "stock": 50}
            )

            assert response.status_code == 201
            assert response.json()["name"] == "New Product"
            assert response.json()["price"] == 49.99
            assert response.json()["stock"] == 50

        def test_returns_422_when_price_is_zero(self, client):
            response = client.post(
                "/products",
                json={"name": "Invalid", "price": 0, "stock": 10}
            )

            assert response.status_code == 422

        def test_returns_422_when_price_is_negative(self, client):
            response = client.post(
                "/products",
                json={"name": "Invalid", "price": -10, "stock": 10}
            )

            assert response.status_code == 422

        def test_returns_422_when_stock_is_negative(self, client):
            response = client.post(
                "/products",
                json={"name": "Invalid", "price": 10, "stock": -5}
            )

            assert response.status_code == 422

        def test_allows_zero_stock(self, client):
            response = client.post(
                "/products",
                json={"name": "Out of Stock", "price": 10, "stock": 0}
            )

            assert response.status_code == 201
            assert response.json()["stock"] == 0

    class TestUpdateProduct:
        def test_updates_product_fields(self, client, sample_product):
            response = client.put(
                f"/products/{sample_product['id']}",
                json={"name": "Updated Name", "price": 39.99}
            )

            assert response.status_code == 200
            assert response.json()["name"] == "Updated Name"
            assert response.json()["price"] == 39.99

        def test_returns_404_when_not_found(self, client):
            response = client.put(
                "/products/invalid-id",
                json={"name": "Test"}
            )

            assert response.status_code == 404

    class TestDeleteProduct:
        def test_deletes_existing_product(self, client, sample_product):
            response = client.delete(f"/products/{sample_product['id']}")

            assert response.status_code == 204

            # Verify it's deleted
            get_response = client.get(f"/products/{sample_product['id']}")
            assert get_response.status_code == 404

        def test_returns_404_when_not_found(self, client):
            response = client.delete("/products/invalid-id")

            assert response.status_code == 404
