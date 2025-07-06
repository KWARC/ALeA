# 1. General Guidelines

## 1.1. Write small functions

## 1.2. Prefer stateless functions
Prioritize functions outside components over those inside components that use component state.

## 1.3. Use constants
Use descriptive names for constants. For example, instead of:
```
start = end + 14*3600
```
Use:
```
const SEC_PER_HOUR = 3600;
const WAIT_DURATION_HRS = 14;
end_timestamp_sec = start_timestamp_sec + WAIT_DURATION_HRS * SEC_PER_HOUR;
```

# 2. Writing APIs

## 2.1. Use only HTTP GET and POST methods
Avoid using other methods like DELETE, PATCH, PUT, etc., as they can be confusing and limiting. Use descriptive API names instead of relying on HTTP methods for better readability and flexibility.

Use GET methods only when both conditions are met:
1. The API doesn't require a body
2. The API is purely for reading and doesn't update any resources

## 2.2. Prefer query parameters or HTTP body over Dynamic Segments
While Next.js offers Dynamic Routes, using query parameters allows for a flatter, more readable directory structure.

## 2.3. Organize your APIs
Group APIs related to a resource or feature in a single directory for better organization.

## 2.4. Authentication & Authorization

### 2.4.1. Authentication
Derive IDs/emails from authentication tokens or retrieve them from the database using token-provided IDs. Don't use IDs from body or query params.

### 2.4.2. Authorization
Implement specific authorization requirements for each API.

## 2.5. Returning Errors
Use appropriate error codes based on the situation. Provide simple, helpful messages for debugging.

### 2.5.1. Error codes
| Error Type                                     | Code |
| ---------------------------------------------- | ---- |
| Invalid params (query, body, or path segment)  | 422  |
| Couldn't find or decode user token             | 401  |
| Unauthorized Access                            | 403  |
| Already exists                                 | 409  |
| Unknown                                        | 500  |

### 2.5.2. Avoid sending JSON responses with errors
Prefer simple error messages over JSON responses.

### 2.5.3. Provide informative error messages
Avoid uninformative messages that merely restate the error code.

## 2.6. Database Interactions

### 2.6.1. Never use `SELECT *`
Specify required fields to optimize database performance and prevent accidental exposure of sensitive information.

### 2.6.2. Minimize database requests
Use joins in SQL queries or leverage ORM features to reduce the number of database requests.

### 2.6.3. Use transactions when appropriate
Implement transactions for sets of related database operations to maintain consistency in case of partial failures.

## 2.7. Returning API errors outside handler
There are some common operations that are performed by several APIs such as checking the request type ('GET' or 'POST'), retrieving user id from token or running a database query. In such scenarios we can create two kinds of helper functions. Lets call them `error-finders` and `error-senders`. The difference between the two is that `error-finders` would just return an appropriate value to indicate error but an `error-sender` would make a `res.status` call to send the error in the API response. 

Such functions (`error-senders`) are tricky to get right, so **we try to avoid creating such functions unless they are used many-many times**. The following a sample `error-handler`. 
```typescript
function checkIfPostOrSetError(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send({ message: `Only ${type} requests allowed` });
    return false;
  }
  return true;
}
```

### 2.7.1. `error-senders` must return a `falsy` value
This is to ensure that the API handler that called this function can early return based on the returned value. **This early return is crucial to ensure that the API handler only makes one `res.status` call. Multiple `res.status` calls in the same API handler can result in undefined behaviour and hard-to-debug errors.**

### 2.7.2. `error-senders` must have something similar to `SetError` in the name so that the caller knows to return early
You should also try to specify the error being returned. e.g. `executeAndEndSet500OnError`

### 2.7.3. Create `error-sender` from `error-finder` when appropriate
There are some scenarios where it is useful to have both kinds of functions. In such cases, use the `error-finder` to create the `error-sender`. For example, consider the following :
```javascript
/* error-finder */
export async function getUserId(req: NextApiRequest) {
  const userInfo = await getUserInfo(req);
  if(!userInfo) return undefined;   // In case of error in getting userInfo, return `undefined`
  return userInfo.userId; 
}

/* error-sender */
export async function getUserIdOrSetError(req, res) {
  const userId = await getUserId(req);
  if (!userId) res.status(403).send({ message: 'Could not get userId' });
  return userId;
}
```
For most APIs, the `error-sender` would suffice. But some APIs which behave differently based on whether user is logged-in or not, the `eeor-finder` does the job. 

### 2.7.4. Don't make a function both an `error-reporter` and `error-sender`
```diff
- function getFauEmail(req, res) {
-   const { userId }  = await decode token(req);
-   if(!userId) {
-      res.status(403).end();
-      return undefined;
-   }
-   if (userId.length!==8) return {error: 'Not FAU ID'};
-   return `{userId}@fau.de`;
- }
```
This will make it tricky for the caller to do error handling while ensuring the `res.status` is called just once.

### 2.7.5. Composition of `error-senders`
**If a helper function uses an `error-sender` it becomes an `error-sender` itself and all the above guidelines must be applied to it.**
Consider the following incorrectly written helper function:

```diff
-export async function addRemoveMember(memberId: string, aclId: string, req, res) {
-  const userId = await getUserIdOrSetError(req, res);
-  if (!userId) return;
-  if (!aclId || !memberId) {
-    return {error: 422}
-  } 
-  ...
-  return true;
-}
```

Consider how the caller of this function will have to take care of the error cases and ensure a single `res.status` call. This complication arises because this now both an `error-finder` and an `error-sender`. The following is well composed `error-sender`

```diff
+export async function getUserIdIfAnyAuthorizedOrSetError(
+  req: NextApiRequest,
+  res: NextApiResponse,
+  resourceActions: ResourceActionParams[]
+) {
+  const userId = await getUserIdOrSetError(req, res);
+  if (!userId) return;
+  if (await isUserIdAuthorizedForAny(userId, resourceActions)) return userId;
+
+  return res.status(403).send('unauthorized');
+}
```

# 3. API Specifications
Document API specifications to facilitate frontend usage.

## 3.1. Define types for request body and response
Use these types when implementing the APIs.

## 3.2. Create wrapper functions for API calls
Implement clean functions that abstract implementation details, exposing only the necessary request and response formats. Ensure these functions are properly typed for clarity.
