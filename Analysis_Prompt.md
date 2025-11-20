# COMPREHENSIVE TICKET & MR ANALYSIS PROMPT

## Instructions:

Please provide a comprehensive analysis of the following:

**Jira Ticket:** [TICKET-KEY]  
**Merge Request IID:** [MR-NUMBER]

---

## Step 1: Analyze Using QA-Analysis MCP Tools

Use the qa-analysis-mcp MCP tools to gather information:

1. **Analyze the Jira ticket** including:
   - Description and requirements
   - Acceptance criteria
   - Comments and discussions
   - Use: `analyze_jira_ticket` and `extract_jira_requirements`

2. **Analyze the GitLab merge request** including:
   - Code changes and files modified
   - Implementation details
   - Diffs and change patterns
   - Use: `analyze_gitlab_mr` and `analyze_gitlab_changes`

3. **Generate comprehensive test ideas** based on:
   - Functional requirements from the ticket
   - Code changes in the MR
   - Security considerations
   - Performance implications
   - Edge cases and boundary conditions
   - Use: `generate_test_ideas`

4. **Generate detailed test cases** covering:
   - Functional testing
   - Integration testing
   - Regression testing
   - Smoke testing
   - Use: `generate_test_cases`

---

## Step 2: Generate Short Summary

Create a concise executive summary (2-3 paragraphs) that includes:
- What the issue/feature is about
- Root cause or main objective
- Impact on users/system
- Solution implemented or proposed

---

## Step 3: Create Markdown File

Create a comprehensive Markdown file named `[TICKET-KEY]_Test_Analysis.md` with the following structure:

### Required Sections:

1. **Header Information**
   - Date
   - JIRA link with ticket key
   - GitLab MR link
   - Status, Priority, Component
   - Labels/Tags

2. **Executive Summary**
   - Brief overview of the issue/feature
   - Impact assessment
   - Key findings

3. **Root Cause Analysis** (for bugs) or **Feature Overview** (for new features)
   - The problem/requirement
   - Technical details
   - Evidence/supporting information

4. **Solution Implemented** or **Implementation Plan**
   - Core fix/feature description
   - Technical approach
   - Scope of changes

5. **Test Ideas**
   - At least 5-8 high-level test scenarios
   - Each with objective and key scenarios

6. **Detailed Test Cases**
   - At least 10-14 detailed test cases
   - Include: Priority, Type, Preconditions, Test Steps, Expected Results
   - Cover functional, regression, edge cases, performance, etc.

7. **Test Data Requirements**
   - Fixtures needed
   - Database states
   - Test environment data

8. **Test Environment Setup**
   - Local environment setup
   - Staging environment setup
   - Production monitoring considerations

9. **Risk Assessment**
   - High risk areas
   - Mitigation strategies

10. **Success Criteria**
    - Functional criteria
    - Performance criteria
    - Business criteria

11. **Test Execution Checklist**
    - Checkbox list of all test activities

12. **Additional Sections** (as needed)
    - Known limitations
    - Related issues
    - Appendices
    - Contact information

---

## Step 4: Convert Markdown to HTML

Convert the Markdown file to HTML with the **same structure and styling** as `/Users/employee/Documents/CORE-5534_Test_Analysis.html`

### HTML Requirements:

**File name:** `[TICKET-KEY]_Test_Analysis.html`  
**Location:** `/Users/employee/Documents/`

**Style Features to Include:**
- Gradient purple header (`#667eea` to `#764ba2`)
- White content container with rounded corners and shadow
- Table of Contents with smooth scroll navigation
- Properly styled headings with color hierarchy (h1: `#667eea`, h2: `#5a67d8`, h3: `#764ba2`)
- Code blocks with dark background (`#2d3436`) and gradient inline code (`#ffeaa7` to `#fdcb6e`)
- Styled tables with gradient headers
- Hover effects on links and table rows
- Back to top button (fixed bottom-right corner)
- Responsive design
- Print styles

**Use the MCP tool:** `convert_markdown_to_html` with the markdown content and set `include_css: false` so you can apply the custom CSS from the template.

**Process:**
1. Read the template HTML file: `/Users/employee/Documents/CORE-5534_Test_Analysis.html`
2. Extract the CSS and HTML structure
3. Convert your markdown content to HTML
4. Inject the converted content into the template structure
5. Update the title and meta information
6. Generate the Table of Contents based on the headings
7. Save the file to `/Users/employee/Documents/[TICKET-KEY]_Test_Analysis.html`

---

## Example Usage:

```
Please provide a comprehensive analysis of the following:

Jira Ticket: CORE-4991
GitLab Project: paysera/app-evpbank
Merge Request IID: 11850

[Follow all steps above to generate the analysis, markdown file, and HTML file]
```

---

## Available MCP Tools Reference:

### Jira Analysis:
- `analyze_jira_ticket` - Full ticket analysis
- `extract_jira_requirements` - Extract requirements
- `analyze_jira_comments` - Analyze comments

### GitLab Analysis:
- `analyze_gitlab_mr` - MR overview
- `analyze_gitlab_changes` - Detailed code changes

### Test Generation:
- `generate_test_ideas` - Generate test scenarios
- `generate_test_cases` - Generate detailed test cases

### Markdown Conversion:
- `convert_markdown_to_html` - Convert MD to HTML

---

## Deliverables:

1. ✅ **Short Summary** - Concise overview (displayed in chat)
2. ✅ **Markdown File** - `/Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/[TICKET-KEY]_Test_Analysis.md`
3. ✅ **HTML File** - `/Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/[TICKET-KEY]_Test_Analysis.html` (with template styling)

**All files should have consistent content and maintain the same level of detail and professionalism as the CORE-5534 example.**
