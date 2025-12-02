# 🔍 {TICKET-KEY} Test Analysis
**{Title of the Change}**

---

## 📋 Merge Request Information

| Field | Value |
|-------|-------|
| **MR Number** | [#{MR_NUMBER}]({GITLAB_MR_URL}) |
| **Status** | {STATUS} |
| **Author** | {AUTHOR_NAME} |
| **Target Branch** | `{TARGET_BRANCH}` |
| **Source Branch** | `{SOURCE_BRANCH}` |
| **Jira Ticket** | [{TICKET_KEY}]({JIRA_TICKET_URL}) |

### Title
{MR_TITLE}

### Description
{MR_DESCRIPTION}

**Test Plan:** {TEST_PLAN_FROM_MR}

---

## 🔧 Technical Change Summary

### Statistics

| Metric | Count |
|--------|-------|
| Files Changed | {FILES_CHANGED} |
| New Services | {NEW_SERVICES} |
| New Validators | {NEW_VALIDATORS} |
| Modified Services | {MODIFIED_SERVICES} |
| New Unit Tests | {NEW_UNIT_TESTS} |

### What Was Modified in the System

#### 1. New Services/Classes Created
{List all new services, classes, or components}

**Example:**
- **ServiceName** (`path/to/Service.php`)
  - Purpose: {What this service does}
  - Key Methods:
    - `methodName(params): returnType` - {Description}
  - Dependencies: {Services it depends on}

#### 2. New Validators Added
{List all new validators}

**Example:**
- **ValidatorName**
  - Purpose: {What it validates}
  - Validation Rules:
    - {Rule 1}
    - {Rule 2}
  - Exceptions Thrown:
    - `ExceptionType` - {When thrown}

#### 3. Modified Services
{List modified existing services}

**Example:**
- **ServiceName**
  - Changes Made:
    - {Change 1}
    - {Change 2}
  - New Methods Added:
    - `methodName(params): returnType` - {Description}

#### 4. Configuration Updates
{List configuration file changes}

**Example:**
- **services.xml:** {What was added/modified}
- **validators.xml:** {What was added/modified}
- **routing.xml:** {What was added/modified}

#### 5. Database Changes
{List any database migrations, schema changes, or data modifications}

**Example:**
- Migration: `{migration_name}`
  - Tables Modified: {table_names}
  - Changes: {description of changes}

#### 6. New Unit/Integration Tests
{List new test files with line counts}

**Example:**
- `ServiceNameTest.php` ({LINE_COUNT} lines)
- `ValidatorNameTest.php` ({LINE_COUNT} lines)

### ⚠️ Breaking Changes
{List any breaking changes or note if there are none}

---

## 💡 QA Recommendations & Actions

### Pre-Testing Actions

1. **Review Unit Tests**
   - Ensure all {NUMBER} unit test files pass successfully
   - Command: `{COMMAND_TO_RUN_TESTS}`

2. **Check Service Configuration**
   - Verify services are properly wired in dependency injection
   - Command: `{COMMAND_TO_CHECK_CONFIG}`

3. **Understand {FEATURE} Flow**
   - Review the order of operations
   - Identify critical paths

4. **Prepare Test Data**
   - {Data Type 1}: {Description of what's needed}
   - {Data Type 2}: {Description of what's needed}
   - {Data Type 3}: {Description of what's needed}

### Testing Focus Areas

#### 🎯 Critical Path Testing
- {Critical test scenario 1}
- {Critical test scenario 2}
- {Critical test scenario 3}

#### 🔒 Security Testing
- {Security test scenario 1}
- {Security test scenario 2}
- {Security test scenario 3}

#### ✅ Data Validation Testing
- Test with null/empty {field_name}
- Test with invalid {field_name}
- Test with edge cases for {field_name}

#### ⚡ Performance Testing (if applicable)
- {Performance test scenario 1}
- {Performance test scenario 2}

### Regression Testing

- [ ] Test existing {feature} functionality to ensure no regressions
- [ ] Verify {Component A} still works correctly with new dependencies
- [ ] Test {Component B}'s existing methods
- [ ] Verify integration with {External System}

### Helpful Commands & Tools

**Run Unit Tests:**
```bash
{COMMAND_TO_RUN_UNIT_TESTS}
```

**Check Service Configuration:**
```bash
{COMMAND_TO_CHECK_SERVICES}
```

**Verify {Something} Registration:**
```bash
{COMMAND_TO_VERIFY}
```

**Clear Cache (if needed):**
```bash
{COMMAND_TO_CLEAR_CACHE}
```

### Test Data Requirements

| Test Scenario | Required Data |
|---------------|---------------|
| {Scenario 1} | {Data requirements 1} |
| {Scenario 2} | {Data requirements 2} |
| {Scenario 3} | {Data requirements 3} |
| {Scenario 4} | {Data requirements 4} |

**📝 Note:** {Any important notes about the test data or testing approach}

---

## ✅ Test Cases

### 🎯 Category 1: {Category Name - e.g., Core Functionality Tests}

| Test Case | Priority | Type | Steps | Expected Results |
|-----------|----------|------|-------|------------------|
| **TC-001: {Test Case Name}** | 🔴 Critical | Functional | 1. {Step 1}<br>2. {Step 2}<br>3. {Step 3}<br>4. {Step 4} | ✓ {Expected result 1}<br>✓ {Expected result 2}<br>✓ {Expected result 3} |
| **TC-002: {Test Case Name}** | 🟡 High | Functional | 1. {Step 1}<br>2. {Step 2}<br>3. {Step 3} | ✓ {Expected result 1}<br>✓ {Expected result 2} |
| **TC-003: {Test Case Name}** | 🟢 Medium | Validation | 1. {Step 1}<br>2. {Step 2}<br>3. {Step 3} | ✓ {Expected result 1}<br>✓ {Expected result 2} |

### 👤 Category 2: {Category Name - e.g., Validation Tests}

| Test Case | Priority | Type | Steps | Expected Results |
|-----------|----------|------|-------|------------------|
| **TC-004: {Test Case Name}** | 🔴 Critical | Validation | 1. {Step 1}<br>2. {Step 2}<br>3. {Step 3} | ✓ {Expected result 1}<br>✓ {Expected result 2} |
| **TC-005: {Test Case Name}** | 🟡 High | Validation | 1. {Step 1}<br>2. {Step 2} | ✓ {Expected result 1}<br>✓ {Expected result 2} |

### 🔄 Category 3: {Category Name - e.g., Integration Tests}

| Test Case | Priority | Type | Steps | Expected Results |
|-----------|----------|------|-------|------------------|
| **TC-006: {Test Case Name}** | 🔴 Critical | Integration | 1. {Step 1}<br>2. {Step 2}<br>3. {Step 3} | ✓ {Expected result 1}<br>✓ {Expected result 2} |
| **TC-007: {Test Case Name}** | 🟡 High | Integration | 1. {Step 1}<br>2. {Step 2} | ✓ {Expected result 1}<br>✓ {Expected result 2} |

---

## 📌 Testing Recommendations

### Priority 1 - Critical (Must Execute)
- **TC-001:** {Brief description}
- **TC-002:** {Brief description}
- **TC-003:** {Brief description}

### Priority 2 - Important (Should Execute)
- **TC-004:** {Brief description}
- **TC-005:** {Brief description}

### Priority 3 - Nice to Have (If Time Permits)
- **TC-006:** {Brief description}

### Additional Recommendations
- {Recommendation 1}
- {Recommendation 2}
- {Recommendation 3}

---

## 📋 Summary

### Final Statistics

| Metric | Value |
|--------|-------|
| Test Categories | {COUNT} |
| Total Test Cases | {COUNT} |
| Files Modified | {COUNT} |
| New Components | {COUNT} |

### Testing Status
- **Report Generated:** {DATE}
- **Analysis Tool:** QA Analysis MCP Server
- **MR Status:** {STATUS}
- **Ready for Testing:** {YES/NO}

### Key Risks & Concerns
{List any identified risks or concerns}
- {Risk 1}
- {Risk 2}

### Sign-off
- [ ] All unit tests passing
- [ ] Service configuration verified
- [ ] Test data prepared
- [ ] Test cases reviewed and approved
- [ ] Ready to begin testing

---

## 📚 References

- **Jira Ticket:** [{TICKET_KEY}]({JIRA_URL})
- **GitLab MR:** [!{MR_NUMBER}]({GITLAB_URL})
- **Related Documentation:** {LINKS}
- **Previous Related Changes:** {LINKS if applicable}

---

**Template Version:** 1.0  
**Last Updated:** {DATE}  
**Created by:** QA Analysis MCP Server
