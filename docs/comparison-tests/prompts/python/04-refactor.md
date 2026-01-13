# Python Test 4: Refactor to Clean Code

## Prompt

```
Refactor this function to follow Python best practices:

def process_order(order, user, inventory, payment_gateway, email_service):
    if order is None or user is None:
        return {"success": False, "error": "Invalid input"}
    if len(order["items"]) == 0:
        return {"success": False, "error": "Empty cart"}

    total = 0
    for i in range(len(order["items"])):
        item = order["items"][i]
        if inventory.check(item["id"]) < item["qty"]:
            return {"success": False, "error": "Out of stock: " + item["name"]}
        total = total + item["price"] * item["qty"]

    if user["balance"] < total:
        return {"success": False, "error": "Insufficient funds"}

    payment = payment_gateway.charge(user["id"], total)
    if payment["success"] == False:
        return {"success": False, "error": "Payment failed"}

    for i in range(len(order["items"])):
        inventory.decrease(order["items"][i]["id"], order["items"][i]["qty"])

    email_service.send(user["email"], "Order confirmed", "Your order #" + order["id"] + " is confirmed.")
    return {"success": True, "order_id": order["id"], "total": total}

Apply: dataclasses, type hints, protocols, Pythonic idioms.
Include tests with pytest.
```

## Expected Evaluation Points

| Aspect | What to Look For |
|--------|------------------|
| Dataclasses | Order, User, OrderItem as dataclasses |
| Protocols | Inventory, PaymentGateway, EmailService protocols |
| Type hints | Full annotations, Optional, Union |
| Pythonic | enumerate, f-strings, not operator |
| Result type | Success/Failure dataclass or Result pattern |
| Testing | pytest with fixtures and mocks |
| Early returns | Clear validation flow |

## Output File

- Without MCP: `results-without-mcp/python/test-4-result.py`
- With MCP: `results-with-mcp/python/test-4-result.py`
