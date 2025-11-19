═══════════════════════════════════════════════════════════
⬇️ YOUR INPUT GOES HERE ⬇️
═══════════════════════════════════════════════════════════

**JIRA Ticket:** https://jira.paysera.net/browse/CORE-5531
**GitLab MR:** https://gitlab.paysera.net/paysera/app-evpbank/-/merge_requests/12059
**Optional:**
- Related Tickets: none
- Documentation URLs: none

═══════════════════════════════════════════════════════════
⬆️ YOUR INPUT ENDS HERE ⬆️
═══════════════════════════════════════════════════════════

## 🎯 Instructions

Using qa-analysis-mcp tools, generate a comprehensive HTML test analysis report:

### STEP 1: Gather All Data (Do NOT ask for approval between steps)

**Extract ticket key and MR details from URLs above, then run:**

1. `analyze_jira_ticket` with ticket_key
2. `analyze_jira_comments` with ticket_key  
3. `analyze_gitlab_mr` with project_id and mr_iid
4. `analyze_gitlab_changes` with project_id and mr_iid
5. `generate_test_ideas` with:
   - jira_ticket_key
   - gitlab_project_id
   - gitlab_mr_iid
   - focus_areas: ['functional', 'integration', 'edge-cases', 'regression', 'security', 'performance']
6. `generate_test_cases` with:
   - jira_ticket_key
   - gitlab_project_id
   - gitlab_mr_iid
   - test_type: 'all'

### STEP 2: Generate HTML Report (ONE API CALL)

Use the new **`generate_html_test_report`** tool with all gathered data:

```json
{
  "ticket_key": "<TICKET-KEY>",
  "jira_data": <parsed JSON from step 1>,
  "jira_comments": <parsed comments array from step 2>,
  "gitlab_mr_data": <parsed JSON from step 3>,
  "gitlab_changes_data": <parsed JSON from step 4>,
  "test_ideas": <parsed JSON from step 5>,
  "test_cases": <parsed array from step 6>
}
```

### STEP 3: Save HTML File

Save the HTML output to:
```
/Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/<TICKET-KEY>_Test_Analysis.html
```

### STEP 4: Provide Summary

After saving, provide:
- ✅ File saved to: [path]
- ✅ Total test ideas: [count]
- ✅ Total test cases: [count]
- ✅ Files analyzed: [count]
- ✅ Key focus areas: [list]

---

## 🎯 Key Optimizations

1. **Single HTML Generation Call** - Server-side HTML generation in one API call
2. **Fast & Efficient** - No manual HTML construction (70-80% cost reduction)
3. **Reliable** - All placeholders filled automatically
4. **Professional Design** - Responsive, print-ready, with smooth scrolling
5. **Cost Efficient** - ~$0.05-0.15 per report (vs $0.30+ before)

---

## ⚠️ Important Notes

- Execute ALL steps automatically
- Do NOT ask for approval between steps
- Parse JSON responses before passing to generate_html_test_report
- Save as `.html` file (not `.md`)
- All URLs are automatically converted to clickable links
