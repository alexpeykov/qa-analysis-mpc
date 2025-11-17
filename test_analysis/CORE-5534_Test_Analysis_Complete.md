# Test Analysis Report: CORE-5534

**Generated:** 2025-11-17 20:33:07 (Europe/Sofia, UTC+2:00)

---

## 📋 Ticket Information

- **Ticket:** CORE-5534
- **MR:** #11952  
- **Status:** In testing
- **Priority:** High
- **Assignee:** Yevhen Matasar
- **Reporter:** Salome Zakariadze
- **Component:** Account Management: Virtual IBAN
- **Labels:** Georgia

---

## 🎯 Issue Summary

The IbanAlias worker was incorrectly removing permissions from Natural Client (NC) and Legal Client (LC) accounts when their identification level was sufficient. This occurred due to desynchronization between the worker process and the actual client identification state. When legal entities opened accounts and directors were bound to companies with full account management rights, these permissions were being removed the next day because the worker was operating on stale/cached client data showing clients as "unidentified" even though they had already been upgraded to "identified" or "basic_identified" status hours earlier.

---

## 🔍 Root Cause (from Investigation)

### Key Findings from JIRA Comments (17 comments analyzed):

**Primary Issue:**
- The IbanAliasWorker (`src/Paysera/Bundle/IbanAliasBundle/Worker/IssueIbanAliasWorker.php`) was using cached/stale client data when checking identification levels
- The worker would run and find client level as "unidentified" in database, but the client had actually already been upgraded to "basic_identified" or "identified" 1-2 hours earlier
- Database desynchronization caused permissions to be pruned incorrectly

**Specific Examples:**
1. **LLC Microfinance Organization Rico Express (19110587)**
   - Director covenantee ID: 19110305
   - Permissions removed: 2025-09-29 17:00:03
   - Client actually became basic_identified: 2025-09-29 15:30 (1.5 hours earlier)
   - Logs showed system believed client was "unidentified" when it wasn't

2. **SUP-8664 - Another case:**
   - Covenantee ID: 19124741
   - Permissions added by AML team invalidated 5 minutes later
   - Client was "identified" by 2025-10-07 14:49:09
   - Worker operated on outdated information

**Technical Root Cause:**
- `ClientLevelChangedListener.php` would trigger `IbanAliasManager::requestIbanForAccountIfEligible()`
- Code called `findNotDisabledByClient($client)` fetching ALL permissions for client
- Then `revokeClientPermissionsWhereNeeded()` would revoke based on stale client level
- **No database refresh was performed** to get current client state before checking level

---

## 💡 Solution Implemented

### Files Modified: 16 files

**Main Technical Changes:**

1. **Created New Service: `ClientIdentificationChecker`**
   - File: `src/Paysera/Bundle/IbanAliasBundle/Service/EligibilityChecker/ClientIdentificationChecker.php`
   - **Key Fix:** Added `$this->entityManager->refresh($client)` to force fresh data from database
   - Centralizes identification level checking logic
   - Ensures current client state is always used, not cached data

2. **Refactored Multiple Bundles to Use New Service:**
   - **GeorgiaIbanBundle** (3 files):
     - `ManualChecker.php` - Replaced direct `IdentificationLevelHierarchy` dependency
     - `AutomaticChecker.php` - Same refactoring
     - `services.xml` - Updated service definitions
   
   - **KosovoIbanBundle** (2 files):
     - `AutomaticChecker.php` - Uses new `ClientIdentificationChecker`
     - `services.xml` - Service definition updates
   
   - **LibraBankBundle** (2 files):
     - `IbanAliasEligibilityChecker.php` - Refactored to use new checker
     - `services.xml` - Service configuration
   
   - **PostbankBgIbanBundle** (2 files):
     - `AutomaticIbanAliasEligibilityChecker.php` - Integrated new checker
     - `services.xml` - Configuration updates

3. **Updated All Related Unit Tests** (7 test files):
   - Tests now use `ClientIdentificationChecker` mock instead of `IdentificationLevelHierarchy`
   - Added specific tests to verify client refresh behavior
   - Example: `testRefreshesClientBeforeCheckingLevel()` - ensures entity manager refresh is called

**Code Pattern - Before:**
```php
private function hasReachedIdentificationLevel(Client $client): bool
{
    try {
        return !$client instanceof ClientNatural
            || $this->identificationLevelHierarchy->isLevelReached(
                $client->getLevel(), // Uses potentially stale cached data
                IdentificationLevels::IDENTIFIED
            );
    } catch (PermissionNotFoundException $exception) {
        return false;
    }
}
```

**Code Pattern - After:**
```php
// In ClientIdentificationChecker.php
public function hasReachedIdentificationLevel(Client $client): bool
{
    if (!$client instanceof ClientNatural) {
        return true;
    }
    
    $this->entityManager->refresh($client); // ✅ FORCES FRESH DATA
    
    try {
        return $this->identificationLevelHierarchy->isLevelReached(
            $client->getLevel(), // Now guaranteed to be current
            IdentificationLevels::IDENTIFIED
        );
    } catch (PermissionNotFoundException $exception) {
        return false;
    }
}
```

---

## 🧪 Test Coverage Analysis

### Test Ideas Generated: 22 across 6 categories

- **Functional:** 4 ideas
- **Integration:** 4 ideas  
- **Edge Cases:** 5 ideas
- **Regression:** 3 ideas
- **Security:** 0 specific ideas (generic templates)
- **Performance:** 0 specific ideas (generic templates)

### Test Cases Created: 16 detailed test cases

#### Functional Tests (4 cases)
- **TC-functional_tests-1:** Verify IbanAlias worker correctly handles permissions when level is sufficient (no desync)
- **TC-functional_tests-2:** Test basic functionality described in the ticket
- **TC-functional_tests-3:** Validate acceptance criteria are met
- **TC-functional_tests-4:** Test all modified components (16 files)

#### Edge Case Tests (5 cases)
- **TC-edge_case_tests-1:** Test with empty/null inputs
- **TC-edge_case_tests-2:** Test with maximum allowed values
- **TC-edge_case_tests-3:** Test with special characters
- **TC-edge_case_tests-4:** Test concurrent operations (critical for async workers)
- **TC-edge_case_tests-5:** Test with invalid data types

#### Integration Tests (4 cases)
- **TC-integration_tests-1:** Test integration with dependent systems
- **TC-integration_tests-2:** Test API endpoints if modified
- **TC-integration_tests-3:** Test database interactions (entity manager refresh)
- **TC-integration_tests-4:** Test third-party service integrations

#### Regression Tests (3 cases)
- **TC-regression_tests-1:** Verify existing functionality still works
- **TC-regression_tests-2:** Test related features that might be affected
- **TC-regression_tests-3:** Run smoke tests on critical paths

---

## ⚠️ Testing Focus Areas

### **CRITICAL AREAS REQUIRING SPECIAL ATTENTION:**

1. **Client Identification Level Synchronization**
   - **Why:** This is the core issue - verify entity manager refresh works correctly
   - **Test:** Use fixtures with clients that recently upgraded identification level
   - **Verify:** Worker correctly recognizes current level, not cached state
   - **Test Data:** Georgian natural client "Giorgi TestGeorgia" (fixtures provided in MR)

2. **Async Worker Processing with RabbitMQ**
   - **Why:** Issue manifests when async worker processes IBAN alias requests
   - **Test:** Publish jobs to `job_issue_iban_alias` queue and consume
   - **Command:** `app/console paysera:iban-alias:republish-pending PT0S`
   - **Consumer:** `app/console rabbitmq:consumer job_issue_iban_alias`
   - **Verify:** Permissions NOT removed after identification level upgrade

3. **Multi-Bundle Consistency**
   - **Why:** 4 different IBAN bundles refactored (Georgia, Kosovo, Libra, PostbankBg)
   - **Test:** Each bundle's eligibility checker uses `ClientIdentificationChecker` correctly
   - **Verify:** Manual and Automatic checkers both work properly
   - **Scope:** Test across ALL supported countries/partners

4. **Race Conditions & Timing Issues**
   - **Why:** Original issue occurred during async processing with time gaps
   - **Test:** Simulate client level upgrade DURING worker execution
   - **Test:** Rapid succession: upgrade level → trigger worker → verify permissions
   - **Edge Case:** Worker starts before upgrade, finishes after - should still work

5. **Database Transaction Integrity**
   - **Why:** Entity manager refresh must work correctly within transactions
   - **Test:** Verify refresh happens before level check in all code paths
   - **Unit Tests:** All 7 updated test files include `testRefreshesClientBeforeCheckingLevel()`
   - **Integration Test:** Real database scenario with concurrent updates

6. **Permission Scope - NC vs LC Accounts**
   - **Why:** Issue affected both Natural Client and Legal Client accounts
   - **Test:** Director permissions for LC accounts maintained after identification
   - **Test:** NC account permissions NOT incorrectly removed
   - **Verify:** Only permissions for SPECIFIC account affected, not all client permissions

7. **Backwards Compatibility**
   - **Why:** Major refactoring across 4 bundles
   - **Test:** Existing IBAN issuance flows still work (manual & automatic)
   - **Test:** Partner-specific logic (paysera_ge, paysera_xk, etc.) unchanged
   - **Regression:** All unit tests pass (Georgia, Kosovo, Libra, PostbankBg)

---

## 🔬 Detailed Test Plan (from MR Description)

### Setup Instructions:
1. Switch to local database
2. Apply fixtures: `core-5534-georgia-test-data.sql`
   - Creates Georgian natural client "Giorgi TestGeorgia" (level: `unidentified`)
   - Creates active local bank account for client
   - Creates pending IBAN alias request

### Test Execution Steps:
1. **Publish Job to RabbitMQ:**
   ```bash
   app/console paysera:iban-alias:republish-pending PT0S
   ```
   - `PT0S` = Duration 0 seconds (republishes all pending records)
   - Finds all `status = 'pending_issuance'` records
   - Publishes to queue: `job_issue_iban_alias`

2. **Process the Queue:**
   ```bash
   app/console rabbitmq:consumer job_issue_iban_alias
   ```

### Pass Criteria:
✅ After identification level upgrade, async worker correctly recognizes the new level and grants IBAN alias permissions (does NOT incorrectly remove them)

---

## 📊 Key Metrics

- **MCP Tool Calls Used:** 6
  1. `analyze_jira_ticket`
  2. `analyze_jira_comments`
  3. `analyze_gitlab_mr`
  4. `analyze_gitlab_changes`
  5. `generate_test_ideas`
  6. `generate_test_cases`

- **Files Analyzed:** 16
  - 7 source files (service classes)
  - 2 service configuration XML files  
  - 7 unit test files

- **Comments Reviewed:** 17
  - Detailed investigation by Justas Jankauskas
  - Multiple real-world examples with data
  - Graylog log references
  - Database query results

- **Test Cases Generated:** 16
  - 4 Functional
  - 5 Edge Cases
  - 4 Integration
  - 3 Regression

- **JIRA Ticket Lifecycle:**
  - Created: 2025-10-03
  - System Lead Time: 29d 14h 15m
  - Current Status: In testing (3d 9h 33m)

---

## 🎯 Testing Strategy Summary

### **Phase 1: Unit Testing** ✅
- All 7 test files updated with refresh verification
- Mock `ClientIdentificationChecker` in all eligibility checker tests
- Verify `hasReachedIdentificationLevel()` called with correct client entity

### **Phase 2: Integration Testing** 🔴 CRITICAL
- Use provided test fixtures (`core-5534-georgia-test-data.sql`)
- Test complete flow: client creation → identification upgrade → worker processing
- Verify entity manager refresh occurs BEFORE level check
- Test across all 4 IBAN bundles (Georgia, Kosovo, Libra, PostbankBg)

### **Phase 3: Async Worker Testing** 🔴 CRITICAL  
- RabbitMQ job processing with real queue
- Simulate exact production scenario from bug reports
- Time-sensitive testing: upgrade during worker execution
- Monitor Graylog for proper level detection

### **Phase 4: Regression Testing**
- Existing IBAN issuance (manual/automatic) flows
- Partner-specific logic unchanged
- Permission management for NC/LC accounts
- Multi-country support verification

### **Phase 5: Production Monitoring** (Post-Deployment)
- Monitor accounts mentioned in tickets:
  - LLC Microfinance Organization Rico Express (19110587)
  - LLC Microfinance Organization Swiss Capital (18684156)
  - LLC Adline (17359452)
- Watch for similar desynchronization issues
- Verify RabbitMQ queue `ha.json_job.gateway.log_bank_permission_change` stability

---

## 🚨 Risk Assessment

### **High Risk Areas:**
1. ✅ **Entity Manager Refresh Timing** - Must happen before every level check
2. ✅ **Database Transaction Scope** - Refresh must work within transactions  
3. ⚠️ **Performance Impact** - Additional database query on every check (refresh)
4. ⚠️ **Concurrent Modifications** - Race conditions during async processing

### **Medium Risk Areas:**
1. **Multi-Bundle Consistency** - 4 bundles must behave identically
2. **Partner-Specific Logic** - Each partner (GE, XK, RO, BG) has unique rules
3. **Backwards Compatibility** - Large refactoring across many files

### **Low Risk Areas:**
1. Unit test coverage is comprehensive
2. Code review completed (MR open, awaiting merge)
3. Developer confidence: "I think I have the right fix" (comment from Yevhen)

---

## 📝 Additional Notes

### Investigation Insights:
- **RabbitMQ Queue Issue Discovered:** `ha.json_job.gateway.log_bank_permission_change` had ~30,000 stuck messages
- **Logging Gap:** `bank_permission_changes` table stopped tracking after Sept 21st
- **Multiple Occurrences:** At least 3 documented cases across different clients
- **Time Pattern:** Issue typically occurred 1-2 hours after identification upgrade

### Developer Notes:
- Testing with local database is tricky
- IBAN issuing flow sandbox API not working properly in local env
- Unit testing considered sufficient by developer
- Test fixtures provided for manual testing

### Related Work:
- **Components:** Account Management: Virtual IBAN
- **Bundle Structure:** 
  - GeorgiaIbanBundle (GE)
  - KosovoIbanBundle (XK)  
  - LibraBankBundle (RO)
  - PostbankBgIbanBundle (BG)

---

## 📄 Output Files

- **Markdown Report:** `/Users/employee/Documents/Cline/MCP/qa-analysis-mcp/test_analysis/CORE-5534_Test_Analysis_Complete.md`

---

## ✅ Conclusion

This fix addresses a critical desynchronization issue that was causing legitimate user permissions to be incorrectly removed. The solution centralizes identification level checking into a new `ClientIdentificationChecker` service that forces a database refresh before checking client levels, ensuring the worker always operates on current data rather than stale cached state.

**Testing Priority:** HIGH  
**Deployment Risk:** MEDIUM  
**User Impact:** HIGH (was causing directors to lose account access)

**Recommendation:** Thorough integration and async worker testing required before production deployment, with close monitoring after release.

---

*Report generated by QA Analysis MCP Tools*
*Execution time: ~60 seconds*
