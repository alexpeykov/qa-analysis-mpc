## ⬇️⬇️⬇️ START PROMPT HERE ⬇️⬇️⬇️

```
═══════════════════════════════════════════════════════════
⬇️ YOUR INPUT GOES HERE ⬇️
═══════════════════════════════════════════════════════════

JIRA Ticket: CORE-5534
GitLab Project: paysera/app-evpbank
GitLab MR Number: 11952

Optional (leave as "none" if not applicable):
- Related Tickets: none
- Documentation URLs: none

═══════════════════════════════════════════════════════════
⬆️ YOUR INPUT ENDS HERE ⬆️
═══════════════════════════════════════════════════════════

Using qa-analysis-mcp tools, generate a comprehensive test analysis following these steps:

**STEP 1: Analyze JIRA Context**
1. Use analyze_jira_ticket with ticket_key: [JIRA Ticket from above]
2. Use analyze_jira_comments with ticket_key: [JIRA Ticket from above]

**STEP 2: Analyze GitLab Context**  
3. Use analyze_gitlab_mr with project_id: [GitLab Project from above], mr_iid: [GitLab MR Number from above]
4. Use analyze_gitlab_changes with project_id: [GitLab Project from above], mr_iid: [GitLab MR Number from above]

**STEP 3: Generate Test Ideas**
5. Use generate_test_ideas with:
   - jira_ticket_key: [JIRA Ticket from above]
   - gitlab_project_id: [GitLab Project from above]
   - gitlab_mr_iid: [GitLab MR Number from above]
   - focus_areas: ['functional', 'integration', 'edge-cases', 'regression', 'security', 'performance']

**STEP 4: Generate Detailed Test Cases**
6. Use generate_test_cases with:
   - jira_ticket_key: [JIRA Ticket from above]
   - gitlab_project_id: [GitLab Project from above]
   - gitlab_mr_iid: [GitLab MR Number from above]
   - test_type: 'all'

**STEP 5: Create Markdown File**

Create a markdown file with the comprehensive summary and save it to:
/Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/[TICKET-KEY]_Test_Analysis_Complete.md

**STEP 6: Provide Comprehensive Summary**

Present a detailed summary report including:

### 📋 Ticket Information
- **Ticket:** [TICKET-KEY]
- **MR:** #[MR-NUMBER]  
- **Status:** [from JIRA]
- **Priority:** [from JIRA]
- **Assignee:** [from JIRA]

### 🎯 Issue Summary
[Brief summary from JIRA description - 2-3 sentences]

### 🔍 Root Cause (from investigation)
[Key findings from JIRA comments about the root cause]

### 💡 Solution Implemented
**Files Modified:** [COUNT] files
[List key files changed and their purpose]

**Technical Changes:**
- [Summarize main technical changes from GitLab MR]

### 🧪 Test Coverage Analysis
**Test Ideas Generated:** [COUNT] across 6 categories
- Functional: [COUNT] ideas
- Integration: [COUNT] ideas
- Edge Cases: [COUNT] ideas
- Regression: [COUNT] ideas
- Security: [COUNT] ideas
- Performance: [COUNT] ideas

**Test Cases Created:** [COUNT] detailed test cases
[List test case IDs and titles]

### ⚠️ Testing Focus Areas
[Highlight the most critical areas that need testing attention based on the analysis]

### 📊 Key Metrics
- MCP Tool Calls Used: 6
- Execution Time: ~30-60 seconds
- Files Analyzed: [COUNT]
- Comments Reviewed: [COUNT]

### 📄 Output Files
- Markdown Report: /Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/[TICKET-KEY]_Test_Analysis_Complete.md

---

**IMPORTANT:** Execute all steps automatically. Do NOT ask for approval between steps. Present all findings in a clear, organized summary.
```

## ⬆️⬆️⬆️ END PROMPT HERE ⬆️⬆️⬆️