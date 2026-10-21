# React Performance Optimization Guide

## Overview

This document explains the proper usage of React optimization techniques (`React.memo`, `useMemo`, `useCallback`, and `useEffect`) based on the performance optimizations applied to this project. **Proper useEffect usage is crucial to avoid memory leaks and unnecessary API calls.**

## Key Principles

### 1. Memoization is NOT Always Better

- Memoization has overhead (memory + comparison costs)
- Only use when the component/value is expensive to compute OR when preventing unnecessary re-renders
- Avoid memoizing primitive values or simple calculations

### 2. When to Use React.memo

✅ **Good Use Cases:**

```tsx
// Component rendered in lists
const ProductCard = memo(({ product }) => {
  /* ... */
});

// Component with expensive rendering
const ComplexChart = memo(({ data }) => {
  /* heavy computations */
});

// Component that rarely changes but parent re-renders frequently
const Header = memo(() => {
  /* static content */
});
```

❌ **Bad Use Cases:**

```tsx
// Component that changes frequently anyway
const LiveCounter = memo(({ count }) => <span>{count}</span>); // count changes every second

// Component with object/array props (will break memo unless carefully managed)
const BadExample = memo(({ items }) => {
  /* items is new array every render */
});
```

### 3. When to Use useMemo

✅ **Good Use Cases:**

```tsx
// Expensive computations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// Creating objects for context or props
const contextValue = useMemo(
  () => ({
    user,
    settings,
    actions,
  }),
  [user, settings, actions]
);

// Filtering/sorting large arrays
const filteredProducts = useMemo(
  () => products.filter((p) => p.category === selectedCategory),
  [products, selectedCategory]
);
```

❌ **Bad Use Cases:**

```tsx
// Simple calculations
const doubled = useMemo(() => count * 2, [count]); // Just do: const doubled = count * 2

// Values that change every render anyway
const timestamp = useMemo(() => Date.now(), []); // This defeats the purpose
```

### 4. When to Use useCallback

✅ **Good Use Cases:**

```tsx
// Functions passed to memoized child components
const handleClick = useCallback((id) => {
  setSelected(id);
}, []);

// Functions used in useEffect dependencies
const fetchData = useCallback(async () => {
  const data = await api.getData(filters);
  setData(data);
}, [filters]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

❌ **Bad Use Cases:**

```tsx
// Functions not passed as props or used in dependencies
const handleClick = useCallback(() => {
  console.log("clicked"); // This function is only used in this component
}, []);

// Functions that need to change every render anyway
const handleSubmit = useCallback(() => {
  onSubmit(formData); // formData changes every render
}, [formData, onSubmit]);
```

### 5. When to Use useEffect Properly ⚠️ **CRITICAL FOR MEMORY & PERFORMANCE**

✅ **Good Use Cases:**

```tsx
// Proper data fetching with cleanup and memoized function
const fetchData = useCallback(async () => {
  const response = await api.getData();
  setData(response);
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]);

// Event listeners with proper cleanup
useEffect(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setModalOpen(false);
  };

  document.addEventListener("keydown", handleKeydown);
  return () => document.removeEventListener("keydown", handleKeydown);
}, []);

// Timers with cleanup
useEffect(() => {
  const timer = setTimeout(() => {
    fetchSearchResults();
  }, 300);

  return () => clearTimeout(timer);
}, [searchQuery]);

// Combined effects instead of multiple separate ones
useEffect(() => {
  setCurrentPage(0);
  setSelectedItems([]);
}, [filterA, filterB, filterC]); // Combined multiple filters
```

❌ **Bad Use Cases - MEMORY LEAKS & PERFORMANCE ISSUES:**

```tsx
// Missing cleanup - MEMORY LEAK
useEffect(() => {
  const interval = setInterval(() => {
    updateData();
  }, 1000);
  // Missing: return () => clearInterval(interval);
}, []);

// Recreated function causing infinite loops
useEffect(() => {
  const fetchData = async () => {
    // This function is recreated every render
    const data = await api.get();
    setData(data);
  };
  fetchData();
}, [data]); // Dependencies include what the effect updates - INFINITE LOOP

// Missing dependencies - stale closure
const [count, setCount] = useState(0);
useEffect(() => {
  const timer = setInterval(() => {
    setCount(count + 1); // Always uses initial count (0)
  }, 1000);
  return () => clearInterval(timer);
}, []); // Missing 'count' dependency - should use setCount(prev => prev + 1)

// Too many separate effects - performance impact
useEffect(() => {
  setCurrentPage(0);
}, [filterA]);
useEffect(() => {
  setCurrentPage(0);
}, [filterB]);
useEffect(() => {
  setCurrentPage(0);
}, [filterC]);
// Should be combined into one effect

// Expensive operations without optimization
useEffect(() => {
  // This runs every render - PERFORMANCE ISSUE
  const filteredData = data.filter(
    (item) =>
      item.name.includes(searchQuery) && item.category === selectedCategory
  );
  setFilteredData(filteredData);
}, [data, searchQuery, selectedCategory]); // Should use useMemo instead
```

### 6. useEffect vs useMemo Decision Matrix

| Scenario                   | Use useEffect | Use useMemo |
| -------------------------- | ------------- | ----------- |
| Data fetching              | ✅            | ❌          |
| Event listeners            | ✅            | ❌          |
| DOM manipulation           | ✅            | ❌          |
| Expensive calculations     | ❌            | ✅          |
| Filtering/sorting arrays   | ❌            | ✅          |
| Creating objects for props | ❌            | ✅          |
| Side effects               | ✅            | ❌          |

## Applied Optimizations in This Project

### Components Optimized with React.memo:

1. **ProductCard** - Rendered in product lists, prevents re-render when other products change
2. **AddToCartButton** - Used in product cards, expensive due to cart state access
3. **PriceFormatter** - Simple pure component used frequently in lists

### Functions Optimized with useCallback:

1. **SearchBar.fetchProducts** - Used in useEffect dependency array
2. **AdminOrders.toggleOrderSelection** - Passed to multiple checkbox components in list
3. **AdminOrders.toggleSelectAll** - Prevents recreation when orders array changes
4. **Filter handlers** - Passed to Select components as onChange handlers

### Values Optimized with useMemo:

1. **ProductCatalog.maxPrice** - Expensive calculation from product array
2. **ProductCatalog.filteredProducts** - Changed from useEffect to useMemo for better performance
3. **Sidebar context values** - Prevents context consumers from re-rendering
4. **Chart tooltip labels** - Complex string formatting

### useEffect Optimizations Applied:

1. **SearchBar.fetchFeaturedProducts** - Memoized with useCallback to prevent recreation
2. **SearchBar timeout cleanup** - Added proper cleanup for focus timeout
3. **AdminOrders effects** - Combined multiple filter reset effects into one
4. **AdminNotifications filters** - Simplified effect dependencies and removed redundant effects
5. **ClientCartContent.fetchUserData** - Memoized function to prevent unnecessary API calls

### Critical Fixes for Memory Leaks:

1. **Timeout cleanup** - All setTimeout calls now have proper cleanup
2. **Function memoization** - Functions used in useEffect dependencies are now memoized
3. **Combined effects** - Reduced number of separate useEffect calls where possible
4. **Proper dependencies** - Fixed missing dependencies in useEffect arrays

## Memory Leak Prevention

### Common Causes:

1. **Over-memoization** - Storing unnecessary data in memory
2. **Incorrect dependencies** - Causing memo to never work
3. **Circular references** - Objects referencing each other

### Solutions Applied:

1. **Minimal dependencies** - Only include what actually affects the computation
2. **Primitive comparisons** - Use primitive values in dependency arrays when possible
3. **Regular cleanup** - Remove memoization if performance testing shows no benefit

## Performance Testing

### Before Optimization:

- Unnecessary re-renders in product lists
- Expensive recalculations on every render
- Functions recreated causing child re-renders

### After Optimization:

- Product cards only re-render when their specific product changes
- Complex calculations cached until dependencies change
- Stable function references prevent cascade re-renders

## Best Practices Summary

1. **Measure first** - Use React DevTools Profiler to identify actual performance issues
2. **Start simple** - Only add memoization when you identify a real problem
3. **Test the impact** - Verify that memoization actually improves performance
4. **Review regularly** - Remove memoization that's no longer needed
5. **Use ESLint rules** - Enable `exhaustive-deps` rule for useEffect, useMemo, and useCallback

## Common Anti-patterns Avoided

❌ Don't do this:

```tsx
// Memoizing everything "just in case"
const Component = memo(() => {
  const value = useMemo(() => "static string", []); // Unnecessary
  const handler = useCallback(() => console.log("hi"), []); // Not passed as prop
  return <div>{value}</div>;
});

// Breaking memo with object props
<MemoComponent config={{ theme: "dark" }} />; // New object every render

// Incorrect dependencies
const value = useMemo(() => expensiveCalc(a, b), [a]); // Missing 'b' dependency
```

✅ Do this instead:

```tsx
// Only memoize when beneficial
const Component = memo(() => {
  const value = "static string"; // Just use the value directly
  const handler = () => console.log("hi"); // Simple function, no memo needed
  return <div>{value}</div>;
});

// Stable object references
const config = useMemo(() => ({ theme: "dark" }), []);
<MemoComponent config={config} />;

// Correct dependencies
const value = useMemo(() => expensiveCalc(a, b), [a, b]); // All dependencies included
```

## Final Optimization Summary

### ✅ Performance Improvements Achieved:

1. **Reduced Re-renders**: Product lists now only update individual items instead of entire lists
2. **Optimized API Calls**: Eliminated unnecessary data fetching through proper useEffect dependencies
3. **Memory Leak Prevention**: All timers, event listeners, and intervals have proper cleanup
4. **Stable Function References**: Prevented cascade re-renders through proper useCallback usage
5. **Efficient Computations**: Expensive filtering/sorting operations cached with useMemo

### ⚠️ Anti-patterns Eliminated:

1. **Infinite Loops**: Fixed useEffect dependencies that caused endless re-renders
2. **Memory Leaks**: Added cleanup functions for all side effects
3. **Unnecessary Memoization**: Removed memoization where it provided no benefit
4. **Multiple Effects**: Combined related effects to reduce overhead
5. **Stale Closures**: Fixed dependency arrays to prevent outdated state references

### 🚀 Best Practices Implemented:

1. **Measure First**: Use React DevTools Profiler to identify real bottlenecks
2. **Progressive Enhancement**: Start simple, add optimization only when needed
3. **Proper Dependencies**: Include all dependencies in useEffect/useMemo/useCallback arrays
4. **Cleanup Everything**: Always cleanup timers, listeners, and subscriptions
5. **Test Impact**: Verify optimizations actually improve performance

Remember: **Premature optimization is the root of all evil.** Only optimize when you have identified an actual performance problem through measurement and profiling.
