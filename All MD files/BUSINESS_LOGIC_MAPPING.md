# Business Logic Mapping

## Excel Formula → Function Mapping

### OTP Generation

| Excel Formula | Plain English | Function Name | Sample Input | Sample Output |
|--------------|---------------|---------------|--------------|---------------|
| `=RANDBETWEEN(100000,999999)` | Generate random integer from 100000 to 999999 | `generateOTP()` | N/A | `"456789"` |
| `=LEN(A1)=6` | Check if string length equals 6 | `validateOTPFormat(otp)` | `"123456"` | `true` |
| `=LEN(A1)=6` | Check if string length equals 6 | `validateOTPFormat(otp)` | `"12345"` | `false` |

### OTP Expiry Calculation

| Excel Formula | Plain English | Function Name | Sample Input | Sample Output |
|--------------|---------------|---------------|--------------|---------------|
| `=NOW()+TIME(0,10,0)` | Add 10 minutes to current time | `calculateOTPExpiry()` | N/A | `Date("2025-01-15T10:15:00Z")` |
| `=NOW()>=B1` | Check if current time is greater than or equal to expiry | `isOTPExpired(expiresAt)` | `Date("2025-01-15T09:00:00Z")` (past) | `true` |
| `=NOW()>=B1` | Check if current time is greater than or equal to expiry | `isOTPExpired(expiresAt)` | `Date("2025-01-15T11:00:00Z")` (future) | `false` |

### OTP Verification

| Excel Formula | Plain English | Function Name | Sample Input | Sample Output |
|--------------|---------------|---------------|--------------|---------------|
| `=A1=B1` | Check if input OTP exactly matches stored OTP | `verifyOTPMatch(inputOTP, storedOTP)` | `"123456"`, `"123456"` | `true` |
| `=A1=B1` | Check if input OTP exactly matches stored OTP | `verifyOTPMatch(inputOTP, storedOTP)` | `"123456"`, `"654321"` | `false` |

### Attempt Management

| Excel Formula | Plain English | Function Name | Sample Input | Sample Output |
|--------------|---------------|---------------|--------------|---------------|
| `=A1>=3` | Check if attempts are greater than or equal to 3 | `isAttemptsExceeded(attempts)` | `3` | `true` |
| `=A1>=3` | Check if attempts are greater than or equal to 3 | `isAttemptsExceeded(attempts)` | `2` | `false` |
| `=3-A1` | Subtract current attempts from maximum (3) | `calculateRemainingAttempts(attempts)` | `1` | `2` |
| `=3-A1` | Subtract current attempts from maximum (3) | `calculateRemainingAttempts(attempts)` | `3` | `0` |

### Cooldown Calculation

| Excel Formula | Plain English | Function Name | Sample Input | Sample Output |
|--------------|---------------|---------------|--------------|---------------|
| `=MAX(0,(B1-NOW())*86400)` | Calculate seconds remaining until expiry, minimum 0 | `calculateCooldownSeconds(expiresAt)` | `Date("2025-01-15T10:05:00Z")` (now: 10:00) | `300` (5 min) |
| `=MAX(0,(B1-NOW())*86400)` | Calculate seconds remaining until expiry, minimum 0 | `calculateCooldownSeconds(expiresAt)` | `Date("2025-01-15T09:00:00Z")` (expired) | `0` |

## Edge Cases Handled

### OTP Generation
- ✅ Always generates exactly 6 digits
- ✅ Handles random number generation with proper range
- ✅ Zero-padding for edge cases (not needed but handled)

### OTP Validation
- ✅ Empty string → false
- ✅ Non-numeric characters → false
- ✅ Wrong length → false
- ✅ Special characters/spaces → false

### Expiry Calculation
- ✅ Handles timezone differences
- ✅ Accounts for millisecond precision
- ✅ Edge case: exact current time (considered expired for safety)

### Attempt Management
- ✅ Negative attempts → handled by constraints (min: 0)
- ✅ Attempts exceeding max → capped at 3
- ✅ Remaining attempts never negative

### Cooldown
- ✅ Expired dates return 0
- ✅ Future dates return positive seconds
- ✅ Handles millisecond to second conversion

## Error Behaviors (Excel-like)

| Excel Error | Description | Implementation | Justification |
|-------------|-------------|----------------|---------------|
| `#DIV/0!` | Division by zero | N/A (not applicable for OTP) | Not used in OTP calculations |
| `#VALUE!` | Invalid value type | Type checking in Zod validation | Handled at API validation layer |
| `#NUM!` | Invalid number | Regex validation for OTP format | `validateOTPFormat()` checks format |
| `#REF!` | Invalid reference | Database lookup errors | Handled in service layer with try-catch |

## Excel Function Equivalents

### String Functions
- `LEN()` → `string.length`
- `MID()` → `string.slice()`
- `CONCATENATE()` → Template literals or `string.concat()`

### Math Functions
- `RANDBETWEEN()` → `Math.floor(Math.random() * (max - min + 1)) + min`
- `MAX()` → `Math.max()`
- `MIN()` → `Math.min()`

### Date/Time Functions
- `NOW()` → `new Date()`
- `TIME()` → Manual millisecond calculation
- Date comparison → `Date.getTime()` comparison

### Logical Functions
- `AND()` → `&&` operator
- `OR()` → `||` operator
- `IF()` → Ternary operator or `if` statements

