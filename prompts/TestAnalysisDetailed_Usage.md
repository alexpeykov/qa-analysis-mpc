# 📚 TestAnalysisDetailed.md - Usage Guide

## Overview
This template provides a comprehensive structure for analyzing merge requests and creating detailed test analysis reports. It ensures consistency and completeness across all QA analysis work.

## When to Use This Template
Use this template whenever you need to:
- Analyze a GitLab merge request for testing
- Create a comprehensive test plan
- Document technical changes for QA purposes
- Generate test cases based on code changes
- Provide recommendations for testing approach

## How to Use

### Step 1: Gather Information
Before filling out the template, collect:
- Jira ticket key and details
- GitLab merge request number and details
- Code changes (diffs)
- Unit test information
- Service/configuration changes

### Step 2: Fill in the Template Sections

#### Section 1: Merge Request Information
Replace these placeholders:
- `{TICKET-KEY}` - Jira ticket key (e.g., CORE-5721)
- `{Title of the Change}` - Brief title of what's being changed
- `{MR_NUMBER}` - GitLab MR number
- `{GITLAB_MR_URL}` - Full URL to GitLab MR
- `{STATUS}` - Current MR status (OPEN, MERGED, CLOSED)
- `{AUTHOR_NAME}` - Developer who created the MR
- `{TARGET_BRANCH}` - Target branch (usually master/main)
- `{SOURCE_BRANCH}` - Source branch name
- `{JIRA_TICKET_URL}` - Full URL to Jira ticket
- `{MR_TITLE}` - Full title from GitLab MR
- `{MR_DESCRIPTION}` - Description from GitLab MR
- `{TEST_PLAN_FROM_MR}` - Test plan section from MR description

#### Section 2: Technical Change Summary
Fill in the statistics and details:
- `{FILES_CHANGED}` - Number of files modified
- `{NEW_SERVICES}` - Count of new services/classes
- `{NEW_VALIDATORS}` - Count of new validators
- `{MODIFIED_SERVICES}` - Count of modified services
- `{NEW_UNIT_TESTS}` - Count of new test files

For each subsection, replace example content with actual details:
- List all new services with their purpose and key methods
- Document all validators and their validation rules
- Describe modified services and what changed
- List configuration file updates
- Document any database changes
- List new test files with line counts

#### Section 3: QA Recommendations & Actions
Customize based on the actual changes:
- Update pre-testing actions with specific commands for this project
- Identify critical paths specific to this feature
- List security concerns relevant to the changes
- Document data validation scenarios
- Create regression testing checklist
- Provide actual commands for running tests and checking configuration
- Define test data requirements

#### Section 4: Test Cases
Create test cases organized into logical categories:
- Use emojis for visual categorization (🎯, 👤, 🔄, 🔒, etc.)
- Prioritize with: 🔴 Critical, 🟡 High, 🟢 Medium, ⚪ Low
- Number test cases sequentially (TC-001, TC-002, etc.)
- Write detailed steps and expected results
- Group related test cases into categories

#### Section 5: Testing Recommendations
Organize test cases by priority:
- **Priority 1:** Must execute (critical functionality)
- **Priority 2:** Should execute (important scenarios)
- **Priority 3:** Nice to have (edge cases, if time permits)

#### Section 6: Summary
Fill in final statistics and sign-off:
- Update all count fields
- Set current date
- Mark MR status
- Identify any risks or concerns
- Use sign-off checklist before testing begins

## Example Workflow

### 1. Analyze GitLab MR
```
Use MCP tools to get MR details:
- get_merge_request
- get_merge_request_diffs
```

### 2. Analyze Jira Ticket
```
Use MCP tools to get ticket details:
- analyze_jira_ticket
- analyze_jira_comments
```

### 3. Generate Test Ideas
```
Use analysis to create test scenarios covering:
- Functional testing
- Edge cases
- Integration points
- Security concerns
- Performance impacts
```

### 4. Fill Template
Work through each section systematically, replacing placeholders with actual content.

### 5. Review and Refine
- Ensure all placeholders are replaced
- Verify test cases are comprehensive
- Check that commands are accurate
- Validate links work correctly

## Tips for Effective Use

### Be Specific
- Don't use generic descriptions
- Include actual file paths, method names, class names
- Provide real commands that can be executed
- Reference specific line numbers when relevant

### Be Comprehensive
- Cover all aspects of the change
- Think about integration points
- Consider security implications
- Don't forget regression testing

### Be Practical
- Focus on what actually needs testing
- Prioritize realistically
- Provide actionable recommendations
- Include helpful debugging commands

### Use Formatting
- Use tables for structured information
- Use code blocks for commands
- Use lists for steps and requirements
- Use emojis for visual scanning

## Quality Checklist

Before finalizing your analysis, verify:
- [ ] All placeholders replaced with actual values
- [ ] All URLs are valid and working
- [ ] Commands are tested and correct
- [ ] Test cases are numbered sequentially
- [ ] Categories make logical sense
- [ ] Priorities are assigned appropriately
- [ ] Expected results are clear and measurable
- [ ] Technical details are accurate
- [ ] Recommendations are actionable
- [ ] Summary statistics match the content

## Common Mistakes to Avoid

1. **Leaving placeholders unfilled** - Always replace all {PLACEHOLDERS}
2. **Generic test cases** - Make them specific to the actual changes
3. **Missing commands** - Always provide real, executable commands
4. **Unclear expected results** - Be specific about what should happen
5. **No prioritization** - Always categorize by priority
6. **Missing technical details** - Include method signatures, file paths, etc.
7. **Forgetting regression testing** - Always consider existing functionality
8. **No risk assessment** - Identify potential issues

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-02 | Initial template creation |

## Support

For questions or improvements to this template:
- Review example analyses in `test_analysis/` directory
- Check the HTML version for visual reference
- Consult the QA Analysis MCP Server documentation
