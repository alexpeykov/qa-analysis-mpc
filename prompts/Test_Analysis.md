Generate a comprehensive test analysis report for:

JIRA Ticket: https://jira.paysera.net/browse/CORE-3820
Blocks and causes:https://jira.paysera.net/browse/CORE-4504 
Related to: https://jira.paysera.net/browse/CORE-3789 https://jira.paysera.net/browse/CORE-3528 
Mentioned in: https://intranet.paysera.net/pages/viewpage.action?pageId=278729706
Merge Request: https://gitlab.paysera.net/paysera/app-evpbank/-/merge_requests/11485


Follow these steps:

1. Use analyze_jira_ticket and analyze_jira_comments to understand the main jira ticket, as well as the tickets that are blocked or caused by the main ticket,"Related to" tickets and "Mentioned in". "Related to" will 
2. Use analyze_gitlab_mr and analyze_gitlab_changes to understand the code changes
3. Use generate_test_ideas and generate_test_cases to create test scenarios
4. Create a comprehensive markdown document with these sections:
   - Title: # [TICKET-KEY] - Test Analysis & Summary
   - Metadata (Date, links, status, priority)
   - Executive Summary
   - Impact
   - Root Cause Analysis (for bugs) or Feature Overview (for features)
   - Solution Implemented
   - Test Ideas (categorized)
   - Detailed Test Cases (with ID, priority, steps, expected results)
   - Test Data Requirements
   - Test Environment Setup
   - Risk Assessment
   - Success Criteria
   - Known Limitations
   - Related Issues & Future Work
   - Test Execution Checklist
   - Appendix: Key Code Changes
   - Contact & Escalation
   
5. Use convert_markdown_to_html with include_css: true to create professional HTML
6. Save both files:
   - /Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/[TICKET-KEY]_Test_Analysis.md
   - /Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/[TICKET-KEY]_Test_Analysis.html

The HTML will automatically include:
- Professional gradient header with title and date
- Auto-generated table of contents from H2 headings
- Modern purple gradient styling
- Responsive design
- Back-to-top button
- Beautiful tables and code blocks

At the end, provide a summary with file paths and statistics.
