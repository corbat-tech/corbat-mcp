// Test JAVA-3: Bugfix - NullPointerException when user has no orders

// Original buggy code:
// @Service
// public class OrderSummaryService {
//     public OrderSummary getUserOrderSummary(User user) {
//         List<Order> orders = user.getOrders();
//         double totalSpent = orders.stream().mapToDouble(Order::getTotal).sum();
//         Order lastOrder = orders.get(orders.size() - 1);  // NPE when empty list
//         return new OrderSummary(orders.size(), totalSpent, lastOrder.getDate());
//     }
// }
// Bugs:
// 1. NPE when orders list is null
// 2. IndexOutOfBoundsException when orders list is empty

// === Domain Classes ===
package com.example.order;

import java.time.LocalDate;
import java.util.List;

public class User {
    private String id;
    private String name;
    private List<Order> orders;

    public User() {}

    public User(String id, String name, List<Order> orders) {
        this.id = id;
        this.name = name;
        this.orders = orders;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<Order> getOrders() { return orders; }
    public void setOrders(List<Order> orders) { this.orders = orders; }
}

public class Order {
    private String id;
    private double total;
    private LocalDate date;

    public Order() {}

    public Order(String id, double total, LocalDate date) {
        this.id = id;
        this.total = total;
        this.date = date;
    }

    public String getId() { return id; }
    public double getTotal() { return total; }
    public LocalDate getDate() { return date; }
}

public class OrderSummary {
    private final int orderCount;
    private final double totalSpent;
    private final LocalDate lastOrderDate;

    public OrderSummary(int orderCount, double totalSpent, LocalDate lastOrderDate) {
        this.orderCount = orderCount;
        this.totalSpent = totalSpent;
        this.lastOrderDate = lastOrderDate;
    }

    public int getOrderCount() { return orderCount; }
    public double getTotalSpent() { return totalSpent; }
    public LocalDate getLastOrderDate() { return lastOrderDate; }
}

// === Fixed Service ===
package com.example.order;

import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class OrderSummaryService {

    public OrderSummary getUserOrderSummary(User user) {
        List<Order> orders = getOrdersSafely(user);

        if (orders.isEmpty()) {
            return new OrderSummary(0, 0.0, null);
        }

        double totalSpent = orders.stream()
            .mapToDouble(Order::getTotal)
            .sum();

        Order lastOrder = orders.get(orders.size() - 1);

        return new OrderSummary(orders.size(), totalSpent, lastOrder.getDate());
    }

    private List<Order> getOrdersSafely(User user) {
        if (user == null || user.getOrders() == null) {
            return Collections.emptyList();
        }
        return user.getOrders();
    }

    // Alternative implementation using Optional
    public Optional<OrderSummary> getUserOrderSummaryOptional(User user) {
        List<Order> orders = getOrdersSafely(user);

        if (orders.isEmpty()) {
            return Optional.empty();
        }

        double totalSpent = orders.stream()
            .mapToDouble(Order::getTotal)
            .sum();

        Order lastOrder = orders.get(orders.size() - 1);

        return Optional.of(new OrderSummary(orders.size(), totalSpent, lastOrder.getDate()));
    }
}

// === Tests ===
package com.example.order;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class OrderSummaryServiceTest {

    private OrderSummaryService service;

    @BeforeEach
    void setUp() {
        service = new OrderSummaryService();
    }

    // === Bug reproduction tests ===

    @Test
    @DisplayName("Bug: Should not throw NPE when user has null orders list")
    void getUserOrderSummary_WhenOrdersNull_ShouldNotThrowNPE() {
        User user = new User("1", "John", null);

        // Original code would throw NullPointerException here
        assertDoesNotThrow(() -> service.getUserOrderSummary(user));

        OrderSummary summary = service.getUserOrderSummary(user);
        assertEquals(0, summary.getOrderCount());
        assertEquals(0.0, summary.getTotalSpent());
        assertNull(summary.getLastOrderDate());
    }

    @Test
    @DisplayName("Bug: Should not throw IndexOutOfBoundsException when orders list is empty")
    void getUserOrderSummary_WhenOrdersEmpty_ShouldNotThrowException() {
        User user = new User("1", "John", Collections.emptyList());

        // Original code would throw IndexOutOfBoundsException here
        assertDoesNotThrow(() -> service.getUserOrderSummary(user));

        OrderSummary summary = service.getUserOrderSummary(user);
        assertEquals(0, summary.getOrderCount());
        assertEquals(0.0, summary.getTotalSpent());
        assertNull(summary.getLastOrderDate());
    }

    @Test
    @DisplayName("Bug: Should not throw NPE when user is null")
    void getUserOrderSummary_WhenUserNull_ShouldNotThrowNPE() {
        assertDoesNotThrow(() -> service.getUserOrderSummary(null));

        OrderSummary summary = service.getUserOrderSummary(null);
        assertEquals(0, summary.getOrderCount());
    }

    // === Normal operation tests ===

    @Test
    void getUserOrderSummary_WithSingleOrder_ShouldReturnCorrectSummary() {
        LocalDate orderDate = LocalDate.of(2024, 1, 15);
        Order order = new Order("order-1", 100.0, orderDate);
        User user = new User("1", "John", List.of(order));

        OrderSummary summary = service.getUserOrderSummary(user);

        assertEquals(1, summary.getOrderCount());
        assertEquals(100.0, summary.getTotalSpent());
        assertEquals(orderDate, summary.getLastOrderDate());
    }

    @Test
    void getUserOrderSummary_WithMultipleOrders_ShouldReturnCorrectSummary() {
        LocalDate date1 = LocalDate.of(2024, 1, 10);
        LocalDate date2 = LocalDate.of(2024, 1, 20);
        List<Order> orders = Arrays.asList(
            new Order("order-1", 50.0, date1),
            new Order("order-2", 75.0, date2)
        );
        User user = new User("1", "John", orders);

        OrderSummary summary = service.getUserOrderSummary(user);

        assertEquals(2, summary.getOrderCount());
        assertEquals(125.0, summary.getTotalSpent());
        assertEquals(date2, summary.getLastOrderDate()); // Last order date
    }

    // === Optional API tests ===

    @Test
    void getUserOrderSummaryOptional_WhenNoOrders_ShouldReturnEmpty() {
        User user = new User("1", "John", Collections.emptyList());

        Optional<OrderSummary> result = service.getUserOrderSummaryOptional(user);

        assertFalse(result.isPresent());
    }

    @Test
    void getUserOrderSummaryOptional_WhenHasOrders_ShouldReturnSummary() {
        LocalDate orderDate = LocalDate.now();
        Order order = new Order("order-1", 99.99, orderDate);
        User user = new User("1", "John", List.of(order));

        Optional<OrderSummary> result = service.getUserOrderSummaryOptional(user);

        assertTrue(result.isPresent());
        assertEquals(1, result.get().getOrderCount());
        assertEquals(99.99, result.get().getTotalSpent());
    }
}
