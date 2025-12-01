# Test Plan Creation Prompt Template

Use this prompt to create comprehensive, professional test plans following industry standards and organizational requirements.

═══════════════════════════════════════════════════════════
⬇️ YOUR INPUT GOES HERE ⬇️
═══════════════════════════════════════════════════════════

**JIRA Epic:** [Epic URL or Key - e.g., https://jira.company.net/browse/CORE-5640]

**Related JIRA Tickets:** 
- [TICKET-1 URL]
- [TICKET-2 URL]
- [TICKET-3 URL]
- [Add more as needed]

**Documentation URLs (Optional):** 
- Business Requirements: [URL or "none"]
- Technical Specifications: [URL or "none"]
- Mission/Context Documentation: [URL or "none"]

**Additional Context (Optional):**
- Target Implementation Date: [Date if known, or "TBD"]
- Priority Override: [If different from JIRA priority]
- Special Considerations: [Any specific requirements or constraints]

═══════════════════════════════════════════════════════════
⬆️ YOUR INPUT ENDS HERE ⬆️
═══════════════════════════════════════════════════════════

## Pre-Processing Instructions

Before creating the test plan, you MUST:

1. **Analyze All JIRA Tickets:**
   - Use `analyze_jira_ticket` tool for each ticket
   - Use `analyze_jira_comments` tool for each ticket
   - Extract: assignees, reporters, watchers, linked issues
   - Identify: priorities, status, components, labels
   - Gather: descriptions, acceptance criteria, technical details

2. **Extract Stakeholders Automatically:**
   - **QA Lead:** Look for QA team members in assignees/watchers
   - **Product Owner:** Check ticket reporter or project owner fields
   - **Developers:** Identify from assignees across tickets
   - **Business Analyst:** Find from ticket creators or requirements authors
   - **DevOps:** Look for infrastructure-related assignees
   - If not found in tickets, check documentation for team mentions

3. **Extract Key Requirements:**
   - Parse acceptance criteria from all tickets
   - Identify functional requirements from descriptions
   - Extract technical requirements from specifications
   - Consolidate into 5-10 main requirements
   - Group related requirements together

4. **Analyze Documentation (if provided):**
   - Use `web_fetch` tool to retrieve documentation content
   - Extract: business context, technical details, compliance requirements
   - Identify: stakeholder mentions, team structure, project goals
   - Gather: regulatory requirements, performance targets, constraints

5. **Determine Project Context:**
   - **Project Name:** Extract from epic title or description
   - **Implementation Date:** Find in ticket fields or documentation
   - **Priority:** Use highest priority from tickets
   - **Impact:** Derive from business requirements and ticket descriptions

6. **Synthesize Information:**
   - Consolidate all extracted data into organized sections
   - Cross-reference information across tickets for consistency
   - Fill in gaps using logical inference from context
   - Prioritize information from official sources (epic > tickets > docs)

═══════════════════════════════════════════════════════════

## Automated Workflow

Execute these steps IN ORDER before generating the test plan:

### Step 1: Data Collection (Use MCP Tools)

```
FOR EACH ticket in [Epic + Related Tickets]:
  - analyze_jira_ticket(ticket_key)
  - analyze_jira_comments(ticket_key)
  - Store: assignee, reporter, description, acceptance criteria, priority, status
  
IF documentation_urls provided:
  - web_fetch(each_url)
  - Extract: team mentions, requirements, technical details
```

### Step 2: Stakeholder Identification

```
From collected JIRA data:
  - QA_Lead = person with QA role in assignees/watchers
  - Product_Owner = epic reporter OR person with PO role
  - Developers = all assignees across tickets (group by name)
  - Business_Analyst = requirements author OR BA role
  - DevOps = infrastructure/deployment related assignees

From documentation:
  - Look for "Team:" sections
  - Parse organizational charts if present
  - Extract email signatures and roles

Result: Complete stakeholder table with names and roles
```

### Step 3: Requirements Extraction

```
From JIRA tickets:
  - Parse "Acceptance Criteria" sections
  - Extract "Description" key points
  - Identify scope from ticket summaries
  - Note any "must have" or "should have" statements

From documentation:
  - Parse "Requirements" or "Objectives" sections
  - Extract numbered requirement lists
  - Identify compliance/regulatory requirements

Consolidate:
  - Group similar requirements
  - Remove duplicates
  - Prioritize based on ticket priority and labels
  - Create 5-10 main requirement categories

Result: Comprehensive requirements list organized by category
```

### Step 4: Context Building

```
Extract Project Name:
  - Use epic title (remove ticket key)
  - If unclear, derive from component names

Extract Implementation Date:
  - Check epic "Due Date" field
  - Check ticket "Target Date" custom fields
  - Look for dates in descriptions
  - Parse documentation for timeline mentions
  - If not found, calculate: 6-8 weeks from today for medium projects

Extract Priority:
  - Use highest priority from all tickets
  - Override if explicitly provided in Additional Context

Extract Impact:
  - Summarize from epic description
  - Include: affected users, systems, business value
  - Mention regulatory/compliance if applicable

Result: Complete project context section
```

### Step 5: Generate Test Plan

Now proceed with creating the comprehensive test plan using ALL extracted information.

═══════════════════════════════════════════════════════════

## Instructions for Test Plan Generation

Create a comprehensive test plan following this exact structure:

### 1. DOCUMENT HEADER
- Epic/Project title
- Version 1.0
- Created date
- Status: Draft
- Priority level
- Related tickets table

---

### 2. STAKEHOLDERS

#### Project Team Table
Include:
- Role | Name | Responsibilities
- QA Lead, Developers, Product Owner, DevOps, Business Analyst

#### External Stakeholders Table
Include:
- Stakeholder | Interest | Involvement
- Compliance, Operations, Finance, Support, Auditors

---

### 3. TESTING OBJECTIVES

#### Primary Objectives (5 main objectives)
1. **Data Integrity Validation**
2. **Functional Correctness**
3. **Regulatory Compliance** (if applicable)
4. **Performance Validation**
5. **Risk Mitigation**

#### Success Criteria
Quantifiable metrics (100%, 0 defects, 95%+ pass rate, etc.)

---

### 4. TYPES OF TESTING

Detail 8 testing types:
1. **Functional Testing** - Scope, Focus Areas, Test Approach
2. **Integration Testing** - Scope, Focus Areas, Test Approach
3. **Data Migration Testing** - Scope, Focus Areas, Test Approach (if applicable)
4. **Regression Testing** - Scope, Focus Areas, Test Approach
5. **Performance Testing** - Scope, Focus Areas, Test Approach
6. **Security Testing** - Scope, Focus Areas, Test Approach
7. **User Acceptance Testing (UAT)** - Scope, Focus Areas, Test Approach
8. **Compliance Testing** - Scope, Focus Areas, Test Approach (if regulatory)

---

### 5. TESTING START CRITERIA

Comprehensive checklist organized by:
- **Development Readiness** (code complete, reviews, unit tests)
- **Environment Preparation** (environments, data, tools, monitoring)
- **Documentation Completion** (specs, BRD, test cases, known issues)
- **Test Data Preparation** (accounts, scenarios, baselines)
- **Team Readiness** (training, access, communication, schedules)

---

### 6. TESTING COMPLETION CRITERIA

Comprehensive exit criteria:
- **Test Execution Metrics** (coverage percentages)
- **Defect Resolution** (severity thresholds)
- **Quality Gates** (precision, validation, preservation)
- **Performance Benchmarks** (timing, SLA, no degradation)
- **Regulatory Compliance** (if applicable)
- **Operational Readiness** (monitoring, rollback, training)
- **Stakeholder Approvals** (all required sign-offs)
- **Documentation Deliverables** (reports, validation docs)

---

### 7. RESOURCE DESCRIPTION

#### Human Resources
- **QA Team** (3-4 resources) - roles, count, skills, availability
- **Development Team** - roles, count, availability
- **DevOps Team** - roles, count, availability
- **Business Stakeholders** - roles, count, availability

#### Technical Resources
- **Test Environments** - DEV, QA, Staging, Production
- **Infrastructure** - Databases, Servers, Monitoring
- **Test Tools** - Postman, JMeter, TestRail, JIRA, etc.

#### Test Data Resources
- Volume requirements
- Variety specifications
- Reference data

---

### 8. TESTING SCHEDULE

#### Timeline Overview Table
| Phase | Start Date | End Date | Duration | Status |
Include 10-12 phases

#### Key Milestones Table
| Milestone | Target Date | Dependencies | Deliverables |

#### Daily Schedule (during active testing)
Time-based activity breakdown

#### Critical Dates
List 5-10 critical deadlines

---

### 9. TESTING PHASES

Detail 9 phases (or adjust based on project):
1. **Test Planning** - Objectives, Activities, Deliverables, Exit Criteria
2. **Test Preparation** - Objectives, Activities, Deliverables, Exit Criteria
3. **Integration Testing** - Objectives, Activities, Deliverables, Exit Criteria
4. **System Testing** - Objectives, Activities, Deliverables, Exit Criteria
5. **Performance Testing** - Objectives, Activities, Deliverables, Exit Criteria
6. **User Acceptance Testing** - Objectives, Activities, Deliverables, Exit Criteria
7. **Pre-Production Validation** - Objectives, Activities, Deliverables, Exit Criteria
8. **Production Deployment** - Objectives, Activities, Deliverables, Exit Criteria
9. **Post-Deployment Validation** - Objectives, Activities, Deliverables, Exit Criteria

---

### 10. TESTING SCOPE

#### In Scope
Organize by tickets/components:
- Component 1: Detailed requirements (✅ checkboxes)
- Component 2: Detailed requirements (✅ checkboxes)
- Component 3: Detailed requirements (✅ checkboxes)

#### Out of Scope
List what's NOT covered (❌ checkboxes)

---

### 11. TEST SCENARIOS

Create 10-15 detailed scenarios:
- **Scenario Name**
- **Objective**
- **Preconditions**
- **Test Steps** (numbered)
- **Expected Results**
- **Priority** (Critical/High/Medium/Low)

Cover:
- Standard/happy path scenarios
- Negative/edge cases
- Performance scenarios
- Integration scenarios
- Regression scenarios

---

### 12. RISK & MITIGATION

#### Risk Matrix Table
| Risk ID | Description | Probability | Impact | Risk Score | Mitigation | Owner |
List 15-20 risks

#### Detailed Mitigation Plans
For top 3-5 critical risks:
- **Pre-action:** What to do before
- **During action:** What to monitor/control
- **Post-action:** What to validate/verify
- **Rollback trigger:** When to abort
- **Recovery time:** Expected recovery duration

---

### 13. DEFECT TRACKING & RISK CLASSES

#### Defect Severity Classification Table
| Severity | Definition | Response Time | Example |
- Critical (P1)
- High (P2)
- Medium (P3)
- Low (P4)

#### Defect Priority Classification Table
| Priority | Criteria | Action Required |

#### Defect Workflow
Text diagram of workflow

#### Defect Tracking Process
1. Identification
2. Logging
3. Triage
4. Resolution
5. Verification
6. Metrics Tracking

#### Defect Report Template
Complete template with all fields

---

### 14. TEST DATA MANAGEMENT

#### Test Data Strategy
- Data Requirements (volume, variety)
- Test Data Sources table
- Data Management Process (4 steps)
  1. Data Preparation
  2. Data Loading
  3. Data Maintenance
  4. Data Security

#### Test Data Sets
Define 5-7 sets:
- Set 1: Purpose, accounts, characteristics, usage
- Set 2: Purpose, accounts, characteristics, usage
- etc.

#### Data Validation Scripts
SQL examples for:
- Pre-execution validation
- Post-execution validation

---

### 15. TESTING ON DIFFERENT PLATFORMS

#### Platform Coverage
1. **Operating Systems** - Server and client side
2. **Web Browsers** - Desktop and mobile tables
3. **Mobile Applications** - iOS and Android details
4. **Database Platforms** - Primary DB configuration
5. **API Platforms** - REST API testing details

#### Cross-Platform Test Scenarios
3-5 scenarios covering multi-platform validation

---

### 16. REPORTS AND DOCUMENTATION

#### Test Reports (5 types)
1. **Daily Test Execution Report**
   - Frequency, Audience, Content, Format
2. **Weekly Test Summary Report**
   - Frequency, Audience, Content, Format
3. **Test Completion Report**
   - Timing, Audience, Content sections, Format
4. **UAT Sign-off Report**
   - Timing, Audience, Content, Format
5. **Post-Implementation Validation Report**
   - Timing, Audience, Content sections, Format

#### Documentation Deliverables
- Pre-Testing (6 documents)
- During Testing (5 documents)
- Post-Testing (9 documents)

#### Reporting Schedule Table
| Report Type | Frequency | Distribution Day | Recipients |

---

### 17. QUALITY CRITERIA

#### Quality Gates
5 gates with criteria and decisions:
1. Development Complete → Integration Testing
2. Integration Complete → System Testing
3. System Complete → Performance/UAT
4. UAT Complete → Pre-Production
5. Production Ready → Go-Live

#### Acceptance Criteria
By category:
- Data Quality (metrics)
- Functional Quality (metrics)
- Performance Quality (metrics)
- Compliance Quality (metrics, if applicable)

#### Quality Metrics
- Test Coverage Metrics
- Defect Metrics
- Test Execution Metrics
- Performance Metrics

---

### 18. ADDITIONAL ACTIVITIES

Detail 8 activities:
1. **Knowledge Transfer** - Objective, activities, schedule, deliverables
2. **Stakeholder Communication** - Regular updates, critical comms
3. **Test Automation** - Scope, tools, coverage, benefits
4. **Lessons Learned** - Timing, participants, process, topics
5. **Regulatory Audit Preparation** - Activities, documentation, timeline (if applicable)
6. **Production Monitoring Setup** - Pre-setup, monitoring focus, alerts
7. **Rollback Plan** - Scenarios, procedure, testing, target time
8. **Continuous Improvement** - Reviews, metrics, optimization

---

### 19. APPROVAL AND SIGN-OFF

#### Test Plan Approvals Table
| Role | Name | Signature | Date |

#### Change History Table
| Version | Date | Author | Description |

---

### 20. APPENDICES

#### Appendix A: Acronyms and Definitions
Table of terms used

#### Appendix B: References
- Regulatory documents (if applicable)
- Project documents
- JIRA tickets

#### Appendix C: Contact Information
- Project team contacts
- Escalation paths
- Support links

---

### DOCUMENT FOOTER

- Test Plan Version
- Status
- Next Review Date
- Confidentiality statement

---

## FORMATTING GUIDELINES

1. **Professional Tone:** Clear, technical, no conversational language
2. **Comprehensive Tables:** Use tables for structured information
3. **Checkboxes:** Use ✅ for in-scope, ❌ for out-of-scope, [ ] for criteria
4. **Consistent Headers:** Use ## for main sections, ### for subsections, #### for sub-subsections
5. **Priority Indicators:** Use **Critical**, **High**, **Medium**, **Low**
6. **Dates:** Use consistent format (YYYY-MM-DD or spelled out)
7. **Metrics:** Use specific numbers (100%, ≥95%, ≤2, etc.)
8. **Code Blocks:** Use ```sql for SQL, ``` for diagrams
9. **Horizontal Rules:** Use --- to separate major sections
10. **Emphasis:** Use **bold** for important terms, not italics

---

## QUALITY CHECKLIST

Before finalizing, verify:
- [ ] All 20 sections included and complete
- [ ] Tables properly formatted with headers
- [ ] Dates consistent and realistic
- [ ] Names and roles filled in from provided info
- [ ] Metrics are quantifiable and measurable
- [ ] Cross-references between sections accurate
- [ ] No placeholder text like [TBD] remains
- [ ] Approval table matches stakeholder list
- [ ] Change history includes version 1.0 entry
- [ ] File saved as: `test_plans/[EPIC-KEY]_[Project_Name]_Test_Plan.md`

---

## EXAMPLE FILE NAMING

- `test_plans/CORE-5640_BGN_to_EUR_Migration_Test_Plan.md`
- `test_plans/PROJ-1234_Payment_Gateway_Integration_Test_Plan.md`
- `test_plans/SEC-9876_Security_Enhancement_Test_Plan.md`

---

## ADAPTATION NOTES

**For Non-Migration Projects:**
- Remove "migration" specific sections
- Adjust timeline to match project type
- Modify test scenarios to fit functionality

**For Smaller Projects:**
- Consolidate some sections
- Reduce number of test scenarios to 5-7
- Simplify resource requirements
- Shorten timeline

**For Larger/Complex Projects:**
- Expand test scenarios to 15-20
- Add more detailed risk analysis
- Include additional testing phases
- Extend timeline appropriately

**For Regulatory Projects:**
- Emphasize compliance sections
- Add detailed audit preparation
- Include regulatory stakeholders
- Expand compliance testing section

**For Performance-Critical Projects:**
- Expand performance testing section
- Add detailed performance scenarios
- Include load/stress testing details
- Define clear performance baselines

---

## OUTPUT INSTRUCTIONS

1. Generate the complete test plan in markdown format
2. Save to `test_plans/` directory with appropriate filename
3. Ensure all sections from 1-20 are present
4. Fill in all provided information from input section
5. Use professional, technical language throughout
6. Make all tables and checklists complete and functional
7. Ensure dates and timelines are realistic and sequential
8. Cross-reference related sections appropriately
9. Include specific examples where applicable
10. Maintain consistent formatting throughout

---

## SUCCESS CRITERIA

A successful test plan will:
✅ Be 30-50+ pages of comprehensive content
✅ Include all 20 required sections
✅ Have no placeholder or incomplete sections
✅ Use consistent professional formatting
✅ Provide actionable, specific guidance
✅ Include quantifiable metrics and criteria
✅ Be ready for immediate stakeholder review
✅ Serve as a complete testing roadmap
✅ Be usable without additional clarification
✅ Follow industry best practices

---

**Remember:** A test plan is a living document. Version 1.0 should be comprehensive enough to guide the entire testing effort while allowing for updates as needed.
