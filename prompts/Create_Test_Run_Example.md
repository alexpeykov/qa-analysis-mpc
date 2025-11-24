# TestRail Test Run Creation - Example Usage

## Template
Use the `Create_Test_Run_Testrail.md` prompt as a template and fill in your specific details.

## Example 1: Test Run with Specific Test Cases

```
Create a new test run in TestRail Nova Tribe suite with the following details:

- Name: CORE-3280 - Assign partner on client merge - Regression Test
- Reference: https://jira.paysera.net/browse/CORE-3280
- Description: Regression testing for partner assignment functionality after client merge changes. Testing all scenarios including same partner merge, different partner merge, and partner info verification.
- Test cases to include: C12345, C12346, C12347, C12348, C12349

Use the saved configuration in testrail-config.json (projectId: 2, suiteId: 14).
```

## Example 2: Test Run with All Test Cases from Suite

```
Create a new test run in TestRail Nova Tribe suite with the following details:

- Name: Sprint 45 - Full Regression Test
- Reference: https://jira.paysera.net/browse/CORE-5534
- Description: Complete regression testing for Sprint 45 release, covering all functionality in Nova Tribe suite.
- Test cases to include: All test cases from the suite

Use the saved configuration in testrail-config.json (projectId: 2, suiteId: 14).
```

## How It Works

When you provide this prompt to Cline with the qa-analysis-mcp server:

1. Cline will use the `add_testrail_run` tool
2. The tool will create a test run with:
   - `project_id`: 2 (from config)
   - `suite_id`: 14 (from config)
   - `name`: Your provided test run name
   - `description`: Your description with reference link
   - `case_ids`: Array of test case IDs (if specific cases provided)
   - `include_all`: true (if no specific cases, includes all from suite)

3. You'll receive back:
   - The created test run ID
   - URL to access the test run in TestRail
   - Confirmation of successful creation

## Notes

- Test case IDs should be provided without the "C" prefix in the array (e.g., [12345, 12346])
- For multi-suite projects like Nova Tribe, the suite_id is required
- The reference field typically contains the Jira ticket URL
- You can create multiple test runs for the same suite if needed
