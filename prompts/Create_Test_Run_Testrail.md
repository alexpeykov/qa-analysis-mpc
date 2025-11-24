Create a new test run in TestRail Nova Tribe suite with the following details:

- Name: [Test Run Name]
- Reference: [Jira ticket URL or reference]
- Description: [Detailed description of what this test run covers]
- Test cases to include: [List of test case IDs to include in the run, e.g., C1234, C1235, C1236]

Use the saved configuration in testrail-config.json (projectId: 2, suiteId: 14).

Instructions:
1. Use the add_testrail_run tool to create the test run
2. Include the suite_id since this is a multi-suite project
3. Set include_all to false and provide specific case_ids if test cases are listed
4. If no specific test cases are provided, set include_all to true to include all cases from the suite
5. Return the created test run ID and URL for reference
