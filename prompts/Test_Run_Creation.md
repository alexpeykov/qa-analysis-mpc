# TestRail Test Run Creation Prompt

Create a new test run in TestRail Nova Tribe suite (Suite ID: 14, Project ID: 2) with the following details:

## Test Run Details
- **Name**: Test case folder
- **Reference**: AC-1234
- **Description**: https://jira.paysera.net/browse/AC-740

## Test Cases to Include
**Folder(s)**: Test case folder

---

## Instructions for AI

1. First, get all sections from the suite to find the section ID(s) for the specified folder(s):
   ```
   use_mcp_tool: get_testrail_sections
   - project_id: 2
   - suite_id: 14
   ```

2. Get all test case IDs from the specified folder(s):
   ```
   use_mcp_tool: get_testrail_cases
   - project_id: 2
   - suite_id: 14
   - Filter by section_id from step 1
   ```

3. Extract case IDs from the response

4. Create the test run with the extracted case IDs:
   ```
   use_mcp_tool: add_testrail_run
   - project_id: 2
   - suite_id: 14
   - name: [from user input]
   - description: [from user input]
   - refs: [from user input - just the ticket key like "CORE-1234"]
   - include_all: false
   - case_ids: [array of case IDs from step 3]
   ```

5. Verify the test run was created successfully

## Example Usage

```markdown
Create a new test run in TestRail Nova Tribe suite with the following details:

- Name: Client Merge Testing Sprint 45
- Reference: CORE-1234
- Description: https://jira.paysera.net/browse/CORE-1234

Folder: Test case folder
```

## Notes
- The `refs` field should contain only the ticket key (e.g., "CORE-1234"), not "Reference: CORE-1234"
- If multiple folders are specified, collect case IDs from all of them
- Always set `include_all: false` when using specific case IDs
- The tool will automatically use Suite ID 14 (Nova Tribe) and Project ID 2
