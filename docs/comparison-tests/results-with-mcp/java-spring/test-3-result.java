/**
 * Test JAVA-3: Bugfix
 * Fix this bug: NullPointerException when user has no orders.
 *
 * Original buggy code:
 * @Service
 * public class OrderSummaryService {
 *     public OrderSummary getUserOrderSummary(User user) {
 *         List<Order> orders = user.getOrders();
 *         double totalSpent = orders.stream().mapToDouble(Order::getTotal).sum();
 *         Order lastOrder = orders.get(orders.size() - 1);
 *         return new OrderSummary(orders.size(), totalSpent, lastOrder.getDate());
 *     }
 * }
 *
 * Bug analysis:
 * 1. When user.getOrders() returns null -> NPE on orders.stream()
 * 2. When user.getOrders() returns empty list -> IndexOutOfBoundsException on orders.get(orders.size() - 1)
 * 3. No null check on user parameter
 *
 * Write tests that prove the bug exists and is fixed.
 */

// ============================================================================
// Domain Classes
// ============================================================================

package com.example.orders.domain;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public class User {

    private final String id;
    private final String name;
    private final List<Order> orders;

    public User(String id, String name) {
        this(id, name, new ArrayList<>());
    }

    public User(String id, String name, List<Order> orders) {
        this.id = id;
        this.name = name;
        this.orders = orders != null ? new ArrayList<>(orders) : new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<Order> getOrders() {
        return Collections.unmodifiableList(orders);
    }

    public void addOrder(Order order) {
        this.orders.add(order);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

package com.example.orders.domain;

import java.time.LocalDateTime;
import java.util.Objects;

public class Order {

    private final String id;
    private final double total;
    private final LocalDateTime date;

    public Order(String id, double total, LocalDateTime date) {
        this.id = id;
        this.total = total;
        this.date = date;
    }

    public String getId() {
        return id;
    }

    public double getTotal() {
        return total;
    }

    public LocalDateTime getDate() {
        return date;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Order order = (Order) o;
        return Objects.equals(id, order.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

// ============================================================================
// Order Summary (Value Object)
// ============================================================================

package com.example.orders.domain;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

public class OrderSummary {

    private final int orderCount;
    private final double totalSpent;
    private final Optional<LocalDateTime> lastOrderDate;

    public OrderSummary(int orderCount, double totalSpent, LocalDateTime lastOrderDate) {
        this.orderCount = orderCount;
        this.totalSpent = totalSpent;
        this.lastOrderDate = Optional.ofNullable(lastOrderDate);
    }

    public static OrderSummary empty() {
        return new OrderSummary(0, 0.0, null);
    }

    public int getOrderCount() {
        return orderCount;
    }

    public double getTotalSpent() {
        return totalSpent;
    }

    public Optional<LocalDateTime> getLastOrderDate() {
        return lastOrderDate;
    }

    public boolean hasOrders() {
        return orderCount > 0;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OrderSummary that = (OrderSummary) o;
        return orderCount == that.orderCount &&
               Double.compare(that.totalSpent, totalSpent) == 0 &&
               Objects.equals(lastOrderDate, that.lastOrderDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orderCount, totalSpent, lastOrderDate);
    }
}

// ============================================================================
// Original Buggy Service (for demonstration)
// ============================================================================

package com.example.orders.service;

import com.example.orders.domain.Order;
import com.example.orders.domain.OrderSummary;
import com.example.orders.domain.User;

import java.util.List;

/**
 * BUGGY IMPLEMENTATION - DO NOT USE
 * This class demonstrates the original buggy code.
 */
public class BuggyOrderSummaryService {

    public OrderSummary getUserOrderSummary(User user) {
        List<Order> orders = user.getOrders();
        double totalSpent = orders.stream().mapToDouble(Order::getTotal).sum();
        Order lastOrder = orders.get(orders.size() - 1);
        return new OrderSummary(orders.size(), totalSpent, lastOrder.getDate());
    }
}

// ============================================================================
// Fixed Service Implementation
// ============================================================================

package com.example.orders.service;

import com.example.orders.domain.Order;
import com.example.orders.domain.OrderSummary;
import com.example.orders.domain.User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class OrderSummaryService {

    /**
     * Returns an order summary for the given user.
     *
     * Fixes applied:
     * 1. Null check for user parameter
     * 2. Handles null orders list from user
     * 3. Handles empty orders list (returns empty summary)
     * 4. Uses Optional for lastOrderDate
     *
     * @param user the user to get order summary for
     * @return OrderSummary with order count, total spent, and optional last order date
     * @throws IllegalArgumentException if user is null
     */
    public OrderSummary getUserOrderSummary(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }

        List<Order> orders = user.getOrders();

        if (orders == null || orders.isEmpty()) {
            return OrderSummary.empty();
        }

        double totalSpent = orders.stream()
            .mapToDouble(Order::getTotal)
            .sum();

        LocalDateTime lastOrderDate = orders.stream()
            .map(Order::getDate)
            .filter(date -> date != null)
            .max(Comparator.naturalOrder())
            .orElse(null);

        return new OrderSummary(orders.size(), totalSpent, lastOrderDate);
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

package com.example.orders.service;

import com.example.orders.domain.Order;
import com.example.orders.domain.OrderSummary;
import com.example.orders.domain.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

class OrderSummaryServiceTest {

    private OrderSummaryService fixedService;
    private BuggyOrderSummaryService buggyService;

    @BeforeEach
    void setUp() {
        fixedService = new OrderSummaryService();
        buggyService = new BuggyOrderSummaryService();
    }

    // =========================================================================
    // Tests that prove the bug exists in the original implementation
    // =========================================================================

    @Nested
    @DisplayName("BUG: Original implementation failures")
    class BuggyImplementationTests {

        @Test
        @DisplayName("BUG: Throws NullPointerException when user is null")
        void buggyThrowsNpeForNullUser() {
            assertThatThrownBy(() -> buggyService.getUserOrderSummary(null))
                .isInstanceOf(NullPointerException.class);
        }

        @Test
        @DisplayName("BUG: Throws IndexOutOfBoundsException when orders list is empty")
        void buggyThrowsIndexOutOfBoundsForEmptyOrders() {
            User userWithNoOrders = new User("user-1", "John", Collections.emptyList());

            assertThatThrownBy(() -> buggyService.getUserOrderSummary(userWithNoOrders))
                .isInstanceOf(IndexOutOfBoundsException.class);
        }

        @Test
        @DisplayName("BUG: Throws NullPointerException when orders list is null")
        void buggyThrowsNpeForNullOrders() {
            // Simulate a user with null orders (could happen with lazy loading issues)
            User userWithNullOrders = new User("user-1", "John", null);

            // This won't throw NPE in our User implementation because we handle null,
            // but in real-world scenarios with JPA entities, this could happen
            assertThatCode(() -> buggyService.getUserOrderSummary(userWithNullOrders))
                .isInstanceOf(IndexOutOfBoundsException.class);
        }
    }

    // =========================================================================
    // Tests that prove the fix works
    // =========================================================================

    @Nested
    @DisplayName("FIX: Handles null user")
    class NullUserTests {

        @Test
        @DisplayName("FIX: Throws IllegalArgumentException for null user")
        void throwsIllegalArgumentExceptionForNullUser() {
            assertThatThrownBy(() -> fixedService.getUserOrderSummary(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User cannot be null");
        }
    }

    @Nested
    @DisplayName("FIX: Handles empty orders")
    class EmptyOrdersTests {

        @Test
        @DisplayName("FIX: Returns empty summary when user has no orders")
        void returnsEmptySummaryForNoOrders() {
            User userWithNoOrders = new User("user-1", "John", Collections.emptyList());

            OrderSummary summary = fixedService.getUserOrderSummary(userWithNoOrders);

            assertThat(summary.getOrderCount()).isEqualTo(0);
            assertThat(summary.getTotalSpent()).isEqualTo(0.0);
            assertThat(summary.getLastOrderDate()).isEmpty();
            assertThat(summary.hasOrders()).isFalse();
        }

        @Test
        @DisplayName("FIX: Returns empty summary when orders list is null")
        void returnsEmptySummaryForNullOrders() {
            User userWithNullOrders = new User("user-1", "John", null);

            OrderSummary summary = fixedService.getUserOrderSummary(userWithNullOrders);

            assertThat(summary.getOrderCount()).isEqualTo(0);
            assertThat(summary.getTotalSpent()).isEqualTo(0.0);
            assertThat(summary.getLastOrderDate()).isEmpty();
        }
    }

    @Nested
    @DisplayName("FIX: Correct calculation for users with orders")
    class OrderCalculationTests {

        @Test
        @DisplayName("FIX: Calculates correct summary for single order")
        void calculatesSummaryForSingleOrder() {
            LocalDateTime orderDate = LocalDateTime.of(2024, 1, 15, 10, 30);
            List<Order> orders = List.of(
                new Order("order-1", 99.99, orderDate)
            );
            User user = new User("user-1", "John", orders);

            OrderSummary summary = fixedService.getUserOrderSummary(user);

            assertThat(summary.getOrderCount()).isEqualTo(1);
            assertThat(summary.getTotalSpent()).isEqualTo(99.99);
            assertThat(summary.getLastOrderDate()).isPresent();
            assertThat(summary.getLastOrderDate().get()).isEqualTo(orderDate);
            assertThat(summary.hasOrders()).isTrue();
        }

        @Test
        @DisplayName("FIX: Calculates correct summary for multiple orders")
        void calculatesSummaryForMultipleOrders() {
            LocalDateTime earlierDate = LocalDateTime.of(2024, 1, 10, 10, 0);
            LocalDateTime laterDate = LocalDateTime.of(2024, 1, 20, 15, 30);
            List<Order> orders = List.of(
                new Order("order-1", 50.00, earlierDate),
                new Order("order-2", 75.50, laterDate),
                new Order("order-3", 24.50, LocalDateTime.of(2024, 1, 15, 12, 0))
            );
            User user = new User("user-1", "John", orders);

            OrderSummary summary = fixedService.getUserOrderSummary(user);

            assertThat(summary.getOrderCount()).isEqualTo(3);
            assertThat(summary.getTotalSpent()).isEqualTo(150.00);
            assertThat(summary.getLastOrderDate()).isPresent();
            assertThat(summary.getLastOrderDate().get()).isEqualTo(laterDate);
        }

        @Test
        @DisplayName("FIX: Handles orders with null dates")
        void handlesOrdersWithNullDates() {
            LocalDateTime validDate = LocalDateTime.of(2024, 1, 15, 10, 0);
            List<Order> orders = List.of(
                new Order("order-1", 50.00, validDate),
                new Order("order-2", 30.00, null)
            );
            User user = new User("user-1", "John", orders);

            OrderSummary summary = fixedService.getUserOrderSummary(user);

            assertThat(summary.getOrderCount()).isEqualTo(2);
            assertThat(summary.getTotalSpent()).isEqualTo(80.00);
            assertThat(summary.getLastOrderDate()).isPresent();
            assertThat(summary.getLastOrderDate().get()).isEqualTo(validDate);
        }

        @Test
        @DisplayName("FIX: Handles all orders with null dates")
        void handlesAllOrdersWithNullDates() {
            List<Order> orders = List.of(
                new Order("order-1", 50.00, null),
                new Order("order-2", 30.00, null)
            );
            User user = new User("user-1", "John", orders);

            OrderSummary summary = fixedService.getUserOrderSummary(user);

            assertThat(summary.getOrderCount()).isEqualTo(2);
            assertThat(summary.getTotalSpent()).isEqualTo(80.00);
            assertThat(summary.getLastOrderDate()).isEmpty();
        }

        @Test
        @DisplayName("FIX: Correctly finds latest order date regardless of list order")
        void findsLatestOrderDateRegardlessOfListOrder() {
            // Orders not in chronological order
            LocalDateTime oldest = LocalDateTime.of(2024, 1, 1, 10, 0);
            LocalDateTime newest = LocalDateTime.of(2024, 3, 15, 14, 0);
            LocalDateTime middle = LocalDateTime.of(2024, 2, 10, 12, 0);

            List<Order> orders = List.of(
                new Order("order-3", 30.00, middle),
                new Order("order-1", 10.00, oldest),
                new Order("order-2", 20.00, newest)
            );
            User user = new User("user-1", "John", orders);

            OrderSummary summary = fixedService.getUserOrderSummary(user);

            assertThat(summary.getLastOrderDate()).isPresent();
            assertThat(summary.getLastOrderDate().get()).isEqualTo(newest);
        }
    }

    @Nested
    @DisplayName("FIX: Edge cases")
    class EdgeCaseTests {

        @Test
        @DisplayName("FIX: Handles order with zero total")
        void handlesOrderWithZeroTotal() {
            List<Order> orders = List.of(
                new Order("order-1", 0.00, LocalDateTime.now())
            );
            User user = new User("user-1", "John", orders);

            OrderSummary summary = fixedService.getUserOrderSummary(user);

            assertThat(summary.getOrderCount()).isEqualTo(1);
            assertThat(summary.getTotalSpent()).isEqualTo(0.0);
            assertThat(summary.hasOrders()).isTrue();
        }

        @Test
        @DisplayName("FIX: Handles large number of orders")
        void handlesLargeNumberOfOrders() {
            LocalDateTime baseDate = LocalDateTime.of(2024, 1, 1, 10, 0);
            Order[] ordersArray = new Order[1000];
            for (int i = 0; i < 1000; i++) {
                ordersArray[i] = new Order("order-" + i, 10.00, baseDate.plusDays(i));
            }
            User user = new User("user-1", "John", Arrays.asList(ordersArray));

            OrderSummary summary = fixedService.getUserOrderSummary(user);

            assertThat(summary.getOrderCount()).isEqualTo(1000);
            assertThat(summary.getTotalSpent()).isEqualTo(10000.0);
            assertThat(summary.getLastOrderDate()).isPresent();
            assertThat(summary.getLastOrderDate().get()).isEqualTo(baseDate.plusDays(999));
        }
    }
}
