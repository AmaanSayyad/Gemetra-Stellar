# CSV Format Guide for Bulk Employee Upload

## Required Columns

The CSV file must contain the following columns in this exact order:

1. **name** - Employee's full name (required)
2. **email** - Valid email address (required)
3. **designation** - Job title/position (required)
4. **department** - Department name (optional, defaults to "Engineering")
5. **salary** - Salary amount as a number (required, must be > 0)
6. **wallet_address** - Valid Ethereum wallet address (required, must start with 0x)
7. **join_date** - Date in YYYY-MM-DD format (optional, defaults to today)
8. **status** - Either "active" or "inactive" (optional, defaults to "active")

## CSV Format Example

```csv
name,email,designation,department,salary,wallet_address,join_date,status
John Doe,john.doe@company.com,Senior Developer,Engineering,5000,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,2025-01-15,active
Jane Smith,jane.smith@company.com,Product Manager,Product,7500,0x8ba1f109551bD432803012645Hac136c22C19e0,2025-01-20,active
Bob Johnson,bob.johnson@company.com,Designer,Design,4500,0x1234567890123456789012345678901234567890,2025-02-01,inactive
```

## Column Details

### name
- **Type**: Text
- **Required**: Yes
- **Example**: `John Doe`
- **Validation**: Cannot be empty

### email
- **Type**: Email address
- **Required**: Yes
- **Example**: `john.doe@company.com`
- **Validation**: Must be a valid email format (contains @ and domain)

### designation
- **Type**: Text
- **Required**: Yes
- **Example**: `Senior Developer`, `Product Manager`, `Designer`
- **Validation**: Cannot be empty

### department
- **Type**: Text
- **Required**: No (defaults to "Engineering")
- **Example**: `Engineering`, `Design`, `Marketing`, `Operations`, `Sales`, `HR`, `Finance`
- **Validation**: None

### salary
- **Type**: Number
- **Required**: Yes
- **Example**: `5000`, `7500.50`
- **Validation**: Must be a positive number greater than 0

### wallet_address
- **Type**: Ethereum address
- **Required**: Yes
- **Format**: Must start with `0x` followed by 40 hexadecimal characters (42 characters total)
- **Example**: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- **Validation**: Must be a valid Ethereum address format

### join_date
- **Type**: Date
- **Required**: No (defaults to today's date)
- **Accepted Formats**:
  - `YYYY-MM-DD` (recommended): `2025-01-15`
  - `MM/DD/YYYY`: `01/15/2025`
  - `DD-MM-YYYY`: `15-01-2025`
  - `YYYY/MM/DD`: `2025/01/15`
- **Example**: `2025-01-15`

### status
- **Type**: Text
- **Required**: No (defaults to "active")
- **Allowed Values**: `active` or `inactive`
- **Example**: `active`

## Important Notes

1. **Header Row**: The first row must contain the column headers exactly as shown above (case-insensitive, but spelling must match)

2. **Comma Separated**: Values are separated by commas. If a value contains commas, wrap it in quotes:
   ```csv
   "Doe, John",john@company.com,Developer,Engineering,5000,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,2025-01-15,active
   ```

3. **No Spaces**: Avoid leading/trailing spaces in values (they will be trimmed automatically)

4. **Ethereum Addresses Only**: The wallet address must be a valid Ethereum address (starts with `0x` and is 42 characters long)

5. **Date Format**: While multiple date formats are accepted, `YYYY-MM-DD` is recommended for consistency

6. **File Size**: CSV files up to 10MB are supported

## Download Template

You can download a CSV template with sample data directly from the Bulk Upload modal in the application. Click the "Download Template" button to get a ready-to-use CSV file with example data.

## Common Errors

- **Missing required columns**: All columns listed above must be present in the header row
- **Invalid email format**: Email must contain @ and a valid domain
- **Invalid wallet address**: Must be a valid Ethereum address (42 characters, starts with 0x)
- **Invalid salary**: Must be a positive number
- **Column count mismatch**: Each row must have the same number of columns as the header

## Example CSV File

Save this as `employees.csv`:

```csv
name,email,designation,department,salary,wallet_address,join_date,status
John Doe,john.doe@company.com,Senior ,Engineering,5000,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,2025-01-15,active
Jane Smith,jane.smith@company.com,Product Manager,Product,7500,0x8ba1f109551bD432803012645Hac136c22C19e0,2025-01-20,active
Bob Johnson,bob.johnson@company.com,UI Designer,Design,4500,0x1234567890123456789012345678901234567890,2025-02-01,active
Alice Williams,alice.williams@company.com,Marketing Manager,Marketing,6000,0xabcdef1234567890abcdef1234567890abcdef12,2025-02-10,active
```
