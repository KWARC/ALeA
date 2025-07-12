# Frontend Guidelines

This document contains a list of suggestion/best practices while writing frontend code in this repo.

## 1. CSS

### 1.1 Prefer MUI Numbers Over `rem` and `px`

Use MUI numerical values instead of `rem` or `px` for consistency.

```diff
- <Box sx={{ px: "4px" }}></Box>
+ <Box sx={{ px: 0.5 }}></Box>
```

Prefer `sx` props over inline styles for better maintainability and theming support.

```diff
- <Box style={{ backgroundColor: "blue", padding: "10px" }}></Box>
+ <Box sx={{ bgcolor: "primary.main", p: 2 }}></Box>
```

## 2. State Management

### 2.1 Derived State Optimization

Avoid creating redundant state variables when values can be derived from existing state. This practice reduces memory usage and prevents state synchronization issues.

```diff
- const [files, setFiles] = useState<string>([]);
- const [numFiles, setNumFiles] = useState(0);

- useEffect(() => {
-   ...
-   setFiles(files);
-   setNumFiles(files.length);
- }, []);

+ const [files, setFiles] = useState<string>([]);
+ const numFiles = files.length;
+ useEffect(() => {
+   ...
+   setFiles(files);
+ }, []);
```

### 2.2 State Grouping

When multiple state variables are interdependent, consolidate them into a single state object.

```ts
// Recommended
const [user, setUser] = useState({ name: "John", age: 25 });

// Avoid
const [name, setName] = useState("John");
const [age, setAge] = useState(25);
```

### 2.3 State Consistency

Maintain state consistency by deriving values rather than storing redundant information.

```ts
// Avoid
const [count, setCount] = useState(4);
const [isEven, setIsEven] = useState(true);

// Recommended
const isEven = count % 2 === 0;
```

### 2.4 State Structure

Keep state structure flat and avoid unnecessary nesting.

```ts
// Avoid
const [user, setUser] = useState({
  address: {
    location: {
      street: "MG Road"
    }
  }
});

// Recommended
const [address, setAddress] = useState({ street: "MG Road" });
```

## 3. Component Architecture

### 3.1 Component Size and Modularity

Maintain manageable component sizes by breaking down complex components into smaller, reusable units.

### 3.2 Naming Conventions

Use descriptive and meaningful names for components and files that clearly indicate their purpose.

```diff
- alea-frontend/pages/myPage.tsx
+ alea-frontend/pages/help.tsx

- src/components/myComponent.tsx
+ src/components/ForumView.tsx
```

### 3.3 Writing the Component or File

#### 3.3.1 Import All Dependencies First

Always begin with importing necessary dependencies in a structured manner.

#### 3.3.2 Component Function Definition

✅ Start with the function declaration:

```ts
export function ComponentName() {}
// OR
const ComponentName = () => {}
```

#### 3.3.3 Define State & Constants Early

✅ Always define router early.
✅ Initialize state variables at the top of the component.
✅ Avoid unnecessary `useState` when values can be derived.

```
const router = useRouter(); // Always define router early
const initialQuery = router.query.q as string || "";
const [query, setQuery] = useState(initialQuery);
```

### 3.4 Using `useEffect` Properly

✅ Use `useEffect` only when necessary (e.g., fetching data).
✅ Separate `useEffect` hooks for different API calls to improve readability and reduce unnecessary re-renders.
✅ Always include dependencies to avoid unintended side effects.
✅ Use an early return pattern to prevent unnecessary execution.

```ts
useEffect(() => {
  if (!router.query.q) return; // Early return if no query is present
  setQuery(router.query.q as string);
}, [router.query.q]);
```

## 4. Code Formatting & Clean-Up

### 4.1 Always Format Code and Organize Imports Before Committing

Before committing your code, always:

✅ Run (Shift + Alt + O) to organize imports.
✅ Run (Shift + Alt + F) to format the code properly.

## 5. Performance Optimization

### 5.1 Using useMemo Properly
useMemo is used to memoize expensive calculations and prevent unnecessary re-computations. 
However, it should only be used when needed, as overusing it can make the code harder to read without significant benefits.

✅ When to Use useMemo
When performing expensive computations that depend on props or state.
When computing derived data that does not need to be re-calculated on every render.
When passing a stable reference to a child component to prevent unnecessary re-renders.

❌ When Not to Use useMemo
When the calculation is trivial (e.g., simple math, string concatenation).
When the memoized value is not being used in the render.
When the dependencies change frequently, making memoization ineffective.

```ts
Example 1: Memoizing an Expensive Computation
const filteredUsers = useMemo(() => {
  return users.filter(user => user.isActive);
}, [users]);
```
Here, useMemo ensures that filteredUsers is only recalculated when users changes, avoiding unnecessary filtering operations on every render.

```ts
Example 2: Avoiding Unnecessary Memoization
❌ Bad Usage (unnecessary memoization)

const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]);
```
✅ Better Approach (no need for useMemo)
```ts
const fullName = `${firstName} ${lastName}`;
```
Since string concatenation is not expensive, useMemo is unnecessary here.


Best Practices Summary
✅ Use useMemo for expensive computations or derived data.
✅ Avoid unnecessary memoization for simple calculations.
✅ Memoize objects and arrays when passing them to child components to prevent re-renders.
✅ Always provide correct dependency arrays to avoid stale values.
✅ Do not use useMemo prematurely—measure performance first.
