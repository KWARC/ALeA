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

### 1.2 Styling Pattern with sx (Recommended)

To keep components clean, readable, and scalable, follow a **"static styles + local overrides"** pattern.

#### 1.2.1 Centralize Static Styles

Define static styles in a dedicated object **near the bottom of the file**.

```typescript
const loListStyles = {
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: 1.5,
    mb: 1,
    borderRadius: 2,
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    }
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 1,
    mb: 2,
    flexWrap: 'wrap',
  }
};
```
✅ Keeps JSX clean  
✅ Improves readability  


#### 1.2.2 Prefer sx Composition Over Style Functions

When a small part of the style **depends on local state**, do not convert the entire style into a function.

❌ Avoid:

```typescript
listItem: (isActive: boolean) => ({
  backgroundColor: isActive ? 'green' : 'white',
});
```

✅ Prefer sx composition :

```jsx
<Paper
  sx={{
    ...loListStyles.listItem,
    color: isActive ? 'green' : 'white',
  }}
/>
```


#### 1.2.3 Use sx Array for Conditional Overrides

MUI allows sx to be an array. Later entries override earlier ones.

```jsx
<Box
  sx={[
    styles.container,
    isSelected && { borderColor: 'primary.main' },
    isDisabled && { opacity: 0.5 },
  ]}
/>
```

This pattern is preferred over:

- multiple ternaries
- deeply nested conditions
- inline style objects

#### 1.2.4 Component-Level Style Ownership

Each component should own its styles.

❌ Avoid mixing **unrelated component styles**:

```typescript
// Two unrelated components in the same file, but all styles in one object
const styles = {
  navbar: { display: 'flex', p: 2},
  navbarItem: { color: 'white', ml: 2 },
  sidebar: { width: 250, bgcolor: '#f5f5f5', p: 2 },
  sidebarItem: { mb: 1, cursor: 'pointer' },
};
```
- Hard to tell which styles belong to which component
- Difficult to maintain as the file grows
- Risk of accidental overrides

✅ Recommended:

```typescript
// Component 1: Navbar
const navbarStyles = {
  root: { display: 'flex', p: 2 },
  item: { color: 'white', ml: 2, cursor: 'pointer' },
};

// Component 2: Sidebar
const sidebarStyles = {
  root: { width: 250, bgcolor: '#f5f5f5', p: 2 },
  item: { mb: 1, cursor: 'pointer' },
};
```

Benefits:
- Better encapsulation
- Easier refactoring
- Fewer merge conflicts
- Clear ownership

#### 1.2.5 Inline sx is fine for very simple, one-off styles

For tiny, one-line, self-contained style adjustments, it’s okay to write sx inline.\
**Examples:**
```jsx
<Box sx={{ p: 1, bgcolor: 'primary.light' }}>Hello</Box>

<Button sx={{ ml: 2 }}>Click me</Button>
```
#### Notes:

- Use inline sx only for trivial, non-reusable styles.

- For complex or reusable styles, always define a dedicated style object.

### 1.3 Color Palette Usage

#### 1.3.1 Always Use Theme Palette Tokens
**Examples:**
```jsx
<Box sx={{ color: 'text.primary', bgcolor: 'background.paper' }} />
```
#### 1.3.2 Use Gradients Defined in the Theme Palette

- Always use gradients defined under palette.gradients.

- Do not define gradient values directly inside components.

- If a required gradient is not available,**add a new gradient to the theme palette with a clear, semantic key.**

## NOTE: 
- Ensures light/dark mode compatibility for color being used

### 1.4 Typography

#### 1.4.1 Use Theme Typography Variants Only

#### 1.4.2 Font Sizes Should Come From Theme.
- Prefer MUI typography variants (T1,h1–h6, body1, body2, etc.) instead of defining custom font sizes.

- If a local override is required for typography-related properties (fontSize, lineHeight, fontWeight, etc.), ensure it is responsive across all breakpoints.
- Always verify typography on small, medium, and large screens.
❌ Avoid **single-screen overrides**:

#### 1.5 Use Shadows From the Central shadows.ts Array
- Always use shadow values defined in shadows.ts.
- Do not define custom boxShadow values inside components.
- If the required shadow intensity or opacity is not available, add a new entry to the shadows.ts array instead of creating ad-hoc shadows.
❌ Avoid:
```tsx
sx={{ boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}
```
✅ Prefer:
```tsx
sx={{ boxShadow: theme.shadows[2] }}
```


#### 1.6 Override Common Components in components.ts
- Commonly used components across the project must have their some of the styles overridden centrally.

## NOTE:
- Overrides for Button, TextField, and other frequently used components are already defined.
e.g button, textfield and others are already done.


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
