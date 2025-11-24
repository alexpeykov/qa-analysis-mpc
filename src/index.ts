#!/usr/bin/env node

/**
 * QA Analysis MCP Server
 * Integrates with Jira, GitLab, and TestRail for comprehensive QA workflow automation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import mysql from "mysql2/promise";
import pg from "pg";
import { createTunnel } from "tunnel-ssh";
import fs from "fs";
import { marked } from "marked";
import Docker from "dockerode";

const { Pool } = pg;

// Environment variables for credentials
const JIRA_URL = process.env.JIRA_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const GITLAB_URL = process.env.GITLAB_URL;
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const TESTRAIL_URL = process.env.TESTRAIL_URL;
const TESTRAIL_EMAIL = process.env.TESTRAIL_EMAIL;
const TESTRAIL_API_KEY = process.env.TESTRAIL_API_KEY;
const CONFLUENCE_URL = process.env.CONFLUENCE_URL;
const CONFLUENCE_EMAIL = process.env.CONFLUENCE_EMAIL;
const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN;

// MySQL Environment variables - Gateway Database
const MYSQL_HOST = process.env.MYSQL_HOST;
const MYSQL_PORT = process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;
const MYSQL_USER = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;

// MySQL Environment variables - EVP_LT Database
const EVP_LT_HOST = process.env.EVP_LT_HOST;
const EVP_LT_PORT = process.env.EVP_LT_PORT ? parseInt(process.env.EVP_LT_PORT) : 3306;
const EVP_LT_DATABASE = process.env.EVP_LT_DATABASE;
const EVP_LT_USER = process.env.EVP_LT_USER;
const EVP_LT_PASSWORD = process.env.EVP_LT_PASSWORD;

// MySQL Environment variables - Gateway_REMOTE Database
const GATEWAY_REMOTE_HOST = process.env.GATEWAY_REMOTE_HOST;
const GATEWAY_REMOTE_PORT = process.env.GATEWAY_REMOTE_PORT ? parseInt(process.env.GATEWAY_REMOTE_PORT) : 3306;
const GATEWAY_REMOTE_DATABASE = process.env.GATEWAY_REMOTE_DATABASE;
const GATEWAY_REMOTE_USER = process.env.GATEWAY_REMOTE_USER;
const GATEWAY_REMOTE_PASSWORD = process.env.GATEWAY_REMOTE_PASSWORD;

// PostgreSQL Environment variables
const POSTGRES_HOST = process.env.POSTGRES_HOST;
const POSTGRES_PORT = process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT) : 5432;
const POSTGRES_DATABASE = process.env.POSTGRES_DATABASE;
const POSTGRES_USER = process.env.POSTGRES_USER;
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;

// SSH Tunnel Environment variables
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = process.env.SSH_PORT ? parseInt(process.env.SSH_PORT) : 22;
const SSH_USER = process.env.SSH_USER;
const SSH_KEY_PATH = process.env.SSH_KEY_PATH;
const USE_SSH_TUNNEL = process.env.USE_SSH_TUNNEL === 'true';

// Database configurations
const DB_CONFIGS: { [key: string]: { host: string; port: number; database: string; user: string; password: string } } = {
  gateway: {
    host: MYSQL_HOST || '',
    port: MYSQL_PORT,
    database: MYSQL_DATABASE || '',
    user: MYSQL_USER || '',
    password: MYSQL_PASSWORD || '',
  },
  evp_lt: {
    host: EVP_LT_HOST || '',
    port: EVP_LT_PORT,
    database: EVP_LT_DATABASE || '',
    user: EVP_LT_USER || '',
    password: EVP_LT_PASSWORD || '',
  },
  gateway_remote: {
    host: GATEWAY_REMOTE_HOST || '',
    port: GATEWAY_REMOTE_PORT,
    database: GATEWAY_REMOTE_DATABASE || '',
    user: GATEWAY_REMOTE_USER || '',
    password: GATEWAY_REMOTE_PASSWORD || '',
  },
};

/**
 * QA Analysis Server Class
 */
class QAAnalysisServer {
  private server: Server;
  private jiraClient?: AxiosInstance;
  private gitlabClient?: AxiosInstance;
  private testrailClient?: AxiosInstance;
  private confluenceClient?: AxiosInstance;
  private dockerClient?: Docker;

  constructor() {
    this.server = new Server(
      {
        name: "qa-analysis-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize API clients
    this.initializeClients();
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private initializeClients() {
    // Initialize Jira client
    if (JIRA_URL && JIRA_EMAIL && JIRA_API_TOKEN) {
      this.jiraClient = axios.create({
        baseURL: JIRA_URL,
        auth: {
          username: JIRA_EMAIL,
          password: JIRA_API_TOKEN,
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
    }

    // Initialize GitLab client
    if (GITLAB_URL && GITLAB_TOKEN) {
      this.gitlabClient = axios.create({
        baseURL: GITLAB_URL,
        headers: {
          'PRIVATE-TOKEN': GITLAB_TOKEN,
        },
      });
    }

    // Initialize TestRail client
    if (TESTRAIL_URL && TESTRAIL_EMAIL && TESTRAIL_API_KEY) {
      this.testrailClient = axios.create({
        baseURL: `${TESTRAIL_URL}/index.php?/api/v2`,
        auth: {
          username: TESTRAIL_EMAIL,
          password: TESTRAIL_API_KEY,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Initialize Docker client
    try {
      this.dockerClient = new Docker();
    } catch (error) {
      // Docker not available - this is optional
      console.error("[Docker] Docker client not available:", error);
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "analyze_jira_ticket",
          description: "Analyze a Jira ticket including description, acceptance criteria, and comments",
          inputSchema: {
            type: "object",
            properties: {
              ticket_key: {
                type: "string",
                description: "Jira ticket key (e.g., PROJ-123)",
              },
            },
            required: ["ticket_key"],
          },
        },
        {
          name: "analyze_jira_comments",
          description: "Analyze comments on a Jira ticket for additional context and discussions",
          inputSchema: {
            type: "object",
            properties: {
              ticket_key: {
                type: "string",
                description: "Jira ticket key (e.g., PROJ-123)",
              },
            },
            required: ["ticket_key"],
          },
        },
        {
          name: "extract_jira_requirements",
          description: "Extract and analyze requirements from a Jira ticket",
          inputSchema: {
            type: "object",
            properties: {
              ticket_key: {
                type: "string",
                description: "Jira ticket key (e.g., PROJ-123)",
              },
            },
            required: ["ticket_key"],
          },
        },
        {
          name: "analyze_gitlab_mr",
          description: "Analyze a GitLab merge request including code changes, files modified, and diffs",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "string",
                description: "GitLab project ID or path (e.g., 'group/project')",
              },
              mr_iid: {
                type: "number",
                description: "Merge request IID (internal ID visible in URL)",
              },
            },
            required: ["project_id", "mr_iid"],
          },
        },
        {
          name: "analyze_gitlab_changes",
          description: "Analyze detailed code changes in a GitLab merge request",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "string",
                description: "GitLab project ID or path (e.g., 'group/project')",
              },
              mr_iid: {
                type: "number",
                description: "Merge request IID",
              },
            },
            required: ["project_id", "mr_iid"],
          },
        },
        {
          name: "analyze_test_plan",
          description: "Analyze test plan from Jira ticket or GitLab MR description",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                enum: ["jira", "gitlab"],
                description: "Source of the test plan (jira or gitlab)",
              },
              identifier: {
                type: "string",
                description: "Jira ticket key or GitLab project_id/mr_iid format (e.g., 'group/project/123')",
              },
            },
            required: ["source", "identifier"],
          },
        },
        {
          name: "generate_test_ideas",
          description: "Generate test ideas based on Jira ticket and GitLab merge request analysis",
          inputSchema: {
            type: "object",
            properties: {
              jira_ticket_key: {
                type: "string",
                description: "Jira ticket key (e.g., PROJ-123)",
              },
              gitlab_project_id: {
                type: "string",
                description: "GitLab project ID or path",
              },
              gitlab_mr_iid: {
                type: "number",
                description: "GitLab merge request IID",
              },
              focus_areas: {
                type: "array",
                items: { type: "string" },
                description: "Optional focus areas (e.g., ['security', 'performance', 'edge-cases'])",
              },
            },
            required: ["jira_ticket_key", "gitlab_project_id", "gitlab_mr_iid"],
          },
        },
        {
          name: "generate_test_cases",
          description: "Generate detailed test cases based on analysis",
          inputSchema: {
            type: "object",
            properties: {
              jira_ticket_key: {
                type: "string",
                description: "Jira ticket key",
              },
              gitlab_project_id: {
                type: "string",
                description: "GitLab project ID or path",
              },
              gitlab_mr_iid: {
                type: "number",
                description: "GitLab merge request IID",
              },
              test_type: {
                type: "string",
                enum: ["functional", "integration", "regression", "smoke", "all"],
                description: "Type of test cases to generate",
              },
            },
            required: ["jira_ticket_key", "gitlab_project_id", "gitlab_mr_iid"],
          },
        },
        {
          name: "get_testrail_test_cases",
          description: "Get test cases from a TestRail test suite",
          inputSchema: {
            type: "object",
            properties: {
              suite_id: {
                type: "number",
                description: "TestRail suite ID",
              },
            },
            required: ["suite_id"],
          },
        },
        {
          name: "create_testrail_test_case",
          description: "Create a new test case in TestRail",
          inputSchema: {
            type: "object",
            properties: {
              section_id: {
                type: "number",
                description: "TestRail section ID where test case should be created",
              },
              title: {
                type: "string",
                description: "Test case title",
              },
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    content: { type: "string" },
                    expected: { type: "string" },
                  },
                },
                description: "Test steps with expected results",
              },
              priority: {
                type: "number",
                description: "Priority (1=Low, 2=Medium, 3=High, 4=Critical)",
              },
            },
            required: ["section_id", "title", "steps"],
          },
        },
        {
          name: "create_testrail_section",
          description: "Create a new section (folder) in TestRail",
          inputSchema: {
            type: "object",
            properties: {
              suite_id: {
                type: "number",
                description: "TestRail suite ID where section should be created",
              },
              name: {
                type: "string",
                description: "Section name",
              },
              parent_id: {
                type: "number",
                description: "Parent section ID (optional, for nested sections)",
              },
            },
            required: ["suite_id", "name"],
          },
        },
        {
          name: "get_testrail_sections",
          description: "Get all sections from a TestRail suite",
          inputSchema: {
            type: "object",
            properties: {
              suite_id: {
                type: "number",
                description: "TestRail suite ID",
              },
            },
            required: ["suite_id"],
          },
        },
        {
          name: "get_testrail_test_run",
          description: "Get details about a specific TestRail test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail run ID",
              },
            },
            required: ["run_id"],
          },
        },
        {
          name: "get_testrail_test_results",
          description: "Get test results from a TestRail test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail run ID",
              },
            },
            required: ["run_id"],
          },
        },
        {
          name: "get_testrail_suites",
          description: "Get all test suites from a TestRail project",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail project ID (default: 14)",
              },
            },
            required: [],
          },
        },
        {
          name: "get_testrail_suite",
          description: "Get details of a specific test suite by ID",
          inputSchema: {
            type: "object",
            properties: {
              suite_id: {
                type: "number",
                description: "TestRail Suite ID to retrieve",
              },
            },
            required: ["suite_id"],
          },
        },
        {
          name: "add_testrail_suite",
          description: "Create a new test suite in the specified project",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail Project ID where the suite will be created",
              },
              name: {
                type: "string",
                description: "Name of the test suite",
              },
              description: {
                type: "string",
                description: "Description of the test suite (optional)",
              },
            },
            required: ["project_id", "name"],
          },
        },
        {
          name: "update_testrail_suite",
          description: "Update an existing test suite",
          inputSchema: {
            type: "object",
            properties: {
              suite_id: {
                type: "number",
                description: "TestRail Suite ID to update",
              },
              name: {
                type: "string",
                description: "New name for the test suite (optional)",
              },
              description: {
                type: "string",
                description: "New description for the test suite (optional)",
              },
            },
            required: ["suite_id"],
          },
        },
        // TestRail Cases - Extended
        {
          name: "get_testrail_case",
          description: "Retrieves complete details for a single test case including steps, expected results, and prerequisites. REQUIRED: caseId.",
          inputSchema: {
            type: "object",
            properties: {
              case_id: {
                type: "number",
                description: "TestRail Case ID",
              },
            },
            required: ["case_id"],
          },
        },
        {
          name: "get_testrail_cases",
          description: "Retrieves test cases list with basic fields only (excludes steps/expected results for performance). REQUIRED: projectId, suiteId. OPTIONAL: limit (default 50), offset (default 0). Use getCase for full details.",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail Project ID",
              },
              suite_id: {
                type: "number",
                description: "TestRail Suite ID",
              },
              limit: {
                type: "number",
                description: "Number of cases to return per page (default: 50)",
              },
              offset: {
                type: "number",
                description: "Offset for pagination (default: 0)",
              },
            },
            required: ["project_id", "suite_id"],
          },
        },
        {
          name: "update_testrail_case",
          description: "Updates an existing test case. REQUIRED: caseId. OPTIONAL: title, typeId, priorityId, templateId, customSteps, customExpected, customStepsSeparated, etc. Only specified fields will be updated.",
          inputSchema: {
            type: "object",
            properties: {
              case_id: {
                type: "number",
                description: "TestRail Case ID",
              },
              title: {
                type: "string",
                description: "Test case title",
              },
              type_id: {
                type: "number",
                description: "Test case type ID",
              },
              priority_id: {
                type: "number",
                description: "Test case priority ID",
              },
              template_id: {
                type: "number",
                description: "Template ID (use 2 for custom_steps_separated support)",
              },
              custom_steps: {
                type: "string",
                description: "Test case steps",
              },
              custom_expected: {
                type: "string",
                description: "Expected results",
              },
              custom_steps_separated: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    content: { type: "string" },
                    expected: { type: "string" },
                  },
                },
                description: "Separated test steps array (requires template_id=2)",
              },
            },
            required: ["case_id"],
          },
        },
        {
          name: "delete_testrail_case",
          description: "Deletes a test case from TestRail",
          inputSchema: {
            type: "object",
            properties: {
              case_id: {
                type: "number",
                description: "TestRail Case ID",
              },
            },
            required: ["case_id"],
          },
        },
        {
          name: "get_testrail_case_types",
          description: "Retrieves all available test case types in TestRail",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "get_testrail_case_fields",
          description: "Retrieves all available test case fields in TestRail",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        // TestRail Sections - Extended
        {
          name: "get_testrail_section",
          description: "Retrieves details of a specific section by ID",
          inputSchema: {
            type: "object",
            properties: {
              section_id: {
                type: "number",
                description: "TestRail Section ID",
              },
            },
            required: ["section_id"],
          },
        },
        {
          name: "update_testrail_section",
          description: "Updates an existing section",
          inputSchema: {
            type: "object",
            properties: {
              section_id: {
                type: "number",
                description: "TestRail Section ID",
              },
              name: {
                type: "string",
                description: "Section name",
              },
              description: {
                type: "string",
                description: "Section description",
              },
            },
            required: ["section_id"],
          },
        },
        {
          name: "delete_testrail_section",
          description: "Deletes a section",
          inputSchema: {
            type: "object",
            properties: {
              section_id: {
                type: "number",
                description: "TestRail Section ID",
              },
            },
            required: ["section_id"],
          },
        },
        // TestRail Runs - Extended
        {
          name: "get_testrail_runs",
          description: "Retrieves all test runs for a specified TestRail project",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail Project ID",
              },
              limit: {
                type: "number",
                description: "The number of runs to return per page",
              },
              offset: {
                type: "number",
                description: "The offset to start returning runs",
              },
            },
            required: ["project_id"],
          },
        },
        {
          name: "add_testrail_run",
          description: "Creates a new test run in a TestRail project",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail Project ID",
              },
              suite_id: {
                type: "number",
                description: "Suite ID (required for multi-suite projects)",
              },
              name: {
                type: "string",
                description: "Test run name",
              },
              description: {
                type: "string",
                description: "Test run description",
              },
              include_all: {
                type: "boolean",
                description: "Include all test cases from the suite",
              },
              case_ids: {
                type: "array",
                items: { type: "number" },
                description: "Specific case IDs to include",
              },
            },
            required: ["project_id", "name"],
          },
        },
        {
          name: "update_testrail_run",
          description: "Updates an existing test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail Run ID",
              },
              name: {
                type: "string",
                description: "Test run name",
              },
              description: {
                type: "string",
                description: "Test run description",
              },
            },
            required: ["run_id"],
          },
        },
        {
          name: "close_testrail_run",
          description: "Closes (completes) an existing test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail Run ID to close",
              },
            },
            required: ["run_id"],
          },
        },
        {
          name: "delete_testrail_run",
          description: "Deletes a test run permanently",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail Run ID to delete",
              },
            },
            required: ["run_id"],
          },
        },
        // TestRail Tests
        {
          name: "get_testrail_tests",
          description: "Retrieves a list of tests for a test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail Run ID",
              },
              limit: {
                type: "number",
                description: "Number of tests to return per page (default: 50)",
              },
              offset: {
                type: "number",
                description: "Offset for pagination (default: 0)",
              },
            },
            required: ["run_id"],
          },
        },
        {
          name: "get_testrail_test",
          description: "Retrieves complete details for a single test, including all fields such as status, type, and results",
          inputSchema: {
            type: "object",
            properties: {
              test_id: {
                type: "number",
                description: "TestRail Test ID",
              },
            },
            required: ["test_id"],
          },
        },
        // TestRail Results
        {
          name: "get_testrail_results",
          description: "Retrieves test results for a specific test",
          inputSchema: {
            type: "object",
            properties: {
              test_id: {
                type: "number",
                description: "TestRail Test ID",
              },
              limit: {
                type: "number",
                description: "The number of results to return per page",
              },
            },
            required: ["test_id"],
          },
        },
        {
          name: "get_testrail_results_for_case",
          description: "Retrieves test results for a specific test case in a test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail Run ID",
              },
              case_id: {
                type: "number",
                description: "TestRail Case ID",
              },
              limit: {
                type: "number",
                description: "The number of results to return per page",
              },
            },
            required: ["run_id", "case_id"],
          },
        },
        {
          name: "add_testrail_result_for_case",
          description: "Adds a test result for a specific test case in a test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail Run ID",
              },
              case_id: {
                type: "number",
                description: "TestRail Case ID",
              },
              status_id: {
                type: "number",
                description: "Status ID (1:Pass, 2:Blocked, 3:Untested, 4:Retest, 5:Fail)",
              },
              comment: {
                type: "string",
                description: "Comment for the test result",
              },
              elapsed: {
                type: "string",
                description: "Time spent testing (e.g., '30s', '2m 30s')",
              },
            },
            required: ["run_id", "case_id"],
          },
        },
        {
          name: "add_testrail_results_for_cases",
          description: "Adds test results for multiple test cases in a test run",
          inputSchema: {
            type: "object",
            properties: {
              run_id: {
                type: "number",
                description: "TestRail Run ID",
              },
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    case_id: { type: "number" },
                    status_id: { type: "number" },
                    comment: { type: "string" },
                  },
                },
                description: "Array of test case results to add",
              },
            },
            required: ["run_id", "results"],
          },
        },
        // TestRail Plans
        {
          name: "get_testrail_plans",
          description: "Retrieves all test plans for a specified TestRail project",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail Project ID",
              },
              limit: {
                type: "number",
                description: "The number of plans to return per page",
              },
            },
            required: ["project_id"],
          },
        },
        {
          name: "get_testrail_plan",
          description: "Retrieves details of a specific test plan by ID",
          inputSchema: {
            type: "object",
            properties: {
              plan_id: {
                type: "number",
                description: "TestRail Plan ID",
              },
            },
            required: ["plan_id"],
          },
        },
        {
          name: "add_testrail_plan",
          description: "Creates a new test plan in a TestRail project",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail Project ID",
              },
              name: {
                type: "string",
                description: "Test plan name",
              },
              description: {
                type: "string",
                description: "Test plan description",
              },
            },
            required: ["project_id", "name"],
          },
        },
        {
          name: "update_testrail_plan",
          description: "Updates an existing test plan",
          inputSchema: {
            type: "object",
            properties: {
              plan_id: {
                type: "number",
                description: "TestRail Plan ID",
              },
              name: {
                type: "string",
                description: "Test plan name",
              },
              description: {
                type: "string",
                description: "Test plan description",
              },
            },
            required: ["plan_id"],
          },
        },
        {
          name: "close_testrail_plan",
          description: "Closes (completes) an existing test plan",
          inputSchema: {
            type: "object",
            properties: {
              plan_id: {
                type: "number",
                description: "TestRail Plan ID to close",
              },
            },
            required: ["plan_id"],
          },
        },
        {
          name: "delete_testrail_plan",
          description: "Deletes a test plan permanently",
          inputSchema: {
            type: "object",
            properties: {
              plan_id: {
                type: "number",
                description: "TestRail Plan ID to delete",
              },
            },
            required: ["plan_id"],
          },
        },
        // TestRail Milestones
        {
          name: "get_testrail_milestones",
          description: "Retrieves all milestones for a specified TestRail project",
          inputSchema: {
            type: "object",
            properties: {
              project_id: {
                type: "number",
                description: "TestRail Project ID",
              },
            },
            required: ["project_id"],
          },
        },
        {
          name: "query_database",
          description: "Execute a SQL query on the configured MySQL database (READ-ONLY: SELECT queries only)",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "SQL SELECT query to execute",
              },
              database_name: {
                type: "string",
                enum: ["gateway", "evp_lt", "gateway_remote"],
                description: "Database to query (default: gateway)",
              },
              limit: {
                type: "number",
                description: "Maximum number of rows to return (default: 100, max: 1000)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "list_tables",
          description: "List all tables in the configured MySQL database",
          inputSchema: {
            type: "object",
            properties: {
              database_name: {
                type: "string",
                enum: ["gateway", "evp_lt", "gateway_remote"],
                description: "Database to list tables from (default: gateway)",
              },
            },
            required: [],
          },
        },
        {
          name: "describe_table",
          description: "Get the structure/schema of a specific database table",
          inputSchema: {
            type: "object",
            properties: {
              table_name: {
                type: "string",
                description: "Name of the table to describe",
              },
              database_name: {
                type: "string",
                enum: ["gateway", "evp_lt", "gateway_remote"],
                description: "Database containing the table (default: gateway)",
              },
            },
            required: ["table_name"],
          },
        },
        {
          name: "get_table_data",
          description: "Fetch data from a specific table with optional filtering",
          inputSchema: {
            type: "object",
            properties: {
              table_name: {
                type: "string",
                description: "Name of the table to query",
              },
              database_name: {
                type: "string",
                enum: ["gateway", "evp_lt", "gateway_remote"],
                description: "Database containing the table (default: gateway)",
              },
              limit: {
                type: "number",
                description: "Number of rows to return (default: 10, max: 1000)",
              },
              where: {
                type: "string",
                description: "Optional WHERE clause (without the 'WHERE' keyword)",
              },
            },
            required: ["table_name"],
          },
        },
        {
          name: "convert_markdown_to_html",
          description: "Convert Markdown content to HTML format. Supports standard Markdown syntax including headers, lists, code blocks, tables, links, images, and more.",
          inputSchema: {
            type: "object",
            properties: {
              markdown: {
                type: "string",
                description: "Markdown content to convert to HTML",
              },
              include_css: {
                type: "boolean",
                description: "Whether to include basic CSS styling (default: false)",
              },
              sanitize: {
                type: "boolean",
                description: "Whether to sanitize HTML output (default: true)",
              },
            },
            required: ["markdown"],
          },
        },
        {
          name: "generate_html_test_report",
          description: "Generate a complete HTML test analysis report from Jira ticket, GitLab MR, test ideas, and test cases data. This tool generates the full HTML in one call.",
          inputSchema: {
            type: "object",
            properties: {
              ticket_key: {
                type: "string",
                description: "Jira ticket key (e.g., CORE-5440)",
              },
              jira_data: {
                type: "object",
                description: "Jira ticket analysis data from analyze_jira_ticket",
              },
              jira_comments: {
                type: "array",
                description: "Jira comments data from analyze_jira_comments",
              },
              gitlab_mr_data: {
                type: "object",
                description: "GitLab MR data from analyze_gitlab_mr",
              },
              gitlab_changes_data: {
                type: "object",
                description: "GitLab changes data from analyze_gitlab_changes",
              },
              test_ideas: {
                type: "object",
                description: "Test ideas from generate_test_ideas",
              },
              test_cases: {
                type: "array",
                description: "Test cases from generate_test_cases",
              },
            },
            required: ["ticket_key", "jira_data", "gitlab_mr_data", "test_ideas", "test_cases"],
          },
        },
        // Docker Container Operations
        {
          name: "list_docker_containers",
          description: "List all Docker containers (running and stopped)",
          inputSchema: {
            type: "object",
            properties: {
              all: {
                type: "boolean",
                description: "Show all containers (default shows just running)",
              },
            },
            required: [],
          },
        },
        {
          name: "start_docker_container",
          description: "Start a Docker container",
          inputSchema: {
            type: "object",
            properties: {
              container_id: {
                type: "string",
                description: "Container ID or name",
              },
            },
            required: ["container_id"],
          },
        },
        {
          name: "stop_docker_container",
          description: "Stop a Docker container",
          inputSchema: {
            type: "object",
            properties: {
              container_id: {
                type: "string",
                description: "Container ID or name",
              },
            },
            required: ["container_id"],
          },
        },
        {
          name: "remove_docker_container",
          description: "Remove a Docker container",
          inputSchema: {
            type: "object",
            properties: {
              container_id: {
                type: "string",
                description: "Container ID or name",
              },
              force: {
                type: "boolean",
                description: "Force removal of running container",
              },
            },
            required: ["container_id"],
          },
        },
        {
          name: "get_docker_container_logs",
          description: "Get logs from a Docker container",
          inputSchema: {
            type: "object",
            properties: {
              container_id: {
                type: "string",
                description: "Container ID or name",
              },
              tail: {
                type: "number",
                description: "Number of lines from the end of logs (default: 100)",
              },
            },
            required: ["container_id"],
          },
        },
        {
          name: "inspect_docker_container",
          description: "Get detailed information about a Docker container",
          inputSchema: {
            type: "object",
            properties: {
              container_id: {
                type: "string",
                description: "Container ID or name",
              },
            },
            required: ["container_id"],
          },
        },
        // Docker Image Operations
        {
          name: "list_docker_images",
          description: "List all Docker images",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "pull_docker_image",
          description: "Pull a Docker image from registry",
          inputSchema: {
            type: "object",
            properties: {
              image_name: {
                type: "string",
                description: "Image name (e.g., nginx:latest)",
              },
            },
            required: ["image_name"],
          },
        },
        {
          name: "remove_docker_image",
          description: "Remove a Docker image",
          inputSchema: {
            type: "object",
            properties: {
              image_id: {
                type: "string",
                description: "Image ID or name",
              },
              force: {
                type: "boolean",
                description: "Force removal",
              },
            },
            required: ["image_id"],
          },
        },
        // Docker Network Operations
        {
          name: "list_docker_networks",
          description: "List all Docker networks",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "create_docker_network",
          description: "Create a Docker network",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Network name",
              },
              driver: {
                type: "string",
                description: "Network driver (default: bridge)",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "remove_docker_network",
          description: "Remove a Docker network",
          inputSchema: {
            type: "object",
            properties: {
              network_id: {
                type: "string",
                description: "Network ID or name",
              },
            },
            required: ["network_id"],
          },
        },
        // Docker Volume Operations
        {
          name: "list_docker_volumes",
          description: "List all Docker volumes",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "create_docker_volume",
          description: "Create a Docker volume",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Volume name",
              },
              driver: {
                type: "string",
                description: "Volume driver (default: local)",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "remove_docker_volume",
          description: "Remove a Docker volume",
          inputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Volume name",
              },
              force: {
                type: "boolean",
                description: "Force removal",
              },
            },
            required: ["name"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "analyze_jira_ticket":
            return await this.analyzeJiraTicket(request.params.arguments);
          case "analyze_jira_comments":
            return await this.analyzeJiraComments(request.params.arguments);
          case "extract_jira_requirements":
            return await this.extractJiraRequirements(request.params.arguments);
          case "analyze_gitlab_mr":
            return await this.analyzeGitLabMR(request.params.arguments);
          case "analyze_gitlab_changes":
            return await this.analyzeGitLabChanges(request.params.arguments);
          case "analyze_test_plan":
            return await this.analyzeTestPlan(request.params.arguments);
          case "generate_test_ideas":
            return await this.generateTestIdeas(request.params.arguments);
          case "generate_test_cases":
            return await this.generateTestCases(request.params.arguments);
          case "get_testrail_test_cases":
            return await this.getTestRailTestCases(request.params.arguments);
          case "create_testrail_test_case":
            return await this.createTestRailTestCase(request.params.arguments);
          case "create_testrail_section":
            return await this.createTestRailSection(request.params.arguments);
          case "get_testrail_sections":
            return await this.getTestRailSections(request.params.arguments);
          case "get_testrail_test_run":
            return await this.getTestRailTestRun(request.params.arguments);
          case "get_testrail_test_results":
            return await this.getTestRailTestResults(request.params.arguments);
          case "get_testrail_suites":
            return await this.getTestRailSuites(request.params.arguments);
          case "get_testrail_suite":
            return await this.getTestRailSuite(request.params.arguments);
          case "add_testrail_suite":
            return await this.addTestRailSuite(request.params.arguments);
          case "update_testrail_suite":
            return await this.updateTestRailSuite(request.params.arguments);
          // Extended TestRail handlers
          case "get_testrail_case":
            return await this.getTestRailCase(request.params.arguments);
          case "get_testrail_cases":
            return await this.getTestRailCases(request.params.arguments);
          case "update_testrail_case":
            return await this.updateTestRailCase(request.params.arguments);
          case "delete_testrail_case":
            return await this.deleteTestRailCase(request.params.arguments);
          case "get_testrail_case_types":
            return await this.getTestRailCaseTypes(request.params.arguments);
          case "get_testrail_case_fields":
            return await this.getTestRailCaseFields(request.params.arguments);
          case "get_testrail_section":
            return await this.getTestRailSection(request.params.arguments);
          case "update_testrail_section":
            return await this.updateTestRailSection(request.params.arguments);
          case "delete_testrail_section":
            return await this.deleteTestRailSection(request.params.arguments);
          case "get_testrail_runs":
            return await this.getTestRailRuns(request.params.arguments);
          case "add_testrail_run":
            return await this.addTestRailRun(request.params.arguments);
          case "update_testrail_run":
            return await this.updateTestRailRun(request.params.arguments);
          case "close_testrail_run":
            return await this.closeTestRailRun(request.params.arguments);
          case "delete_testrail_run":
            return await this.deleteTestRailRun(request.params.arguments);
          case "get_testrail_tests":
            return await this.getTestRailTests(request.params.arguments);
          case "get_testrail_test":
            return await this.getTestRailTest(request.params.arguments);
          case "get_testrail_results":
            return await this.getTestRailResults(request.params.arguments);
          case "get_testrail_results_for_case":
            return await this.getTestRailResultsForCase(request.params.arguments);
          case "add_testrail_result_for_case":
            return await this.addTestRailResultForCase(request.params.arguments);
          case "add_testrail_results_for_cases":
            return await this.addTestRailResultsForCases(request.params.arguments);
          case "get_testrail_plans":
            return await this.getTestRailPlans(request.params.arguments);
          case "get_testrail_plan":
            return await this.getTestRailPlan(request.params.arguments);
          case "add_testrail_plan":
            return await this.addTestRailPlan(request.params.arguments);
          case "update_testrail_plan":
            return await this.updateTestRailPlan(request.params.arguments);
          case "close_testrail_plan":
            return await this.closeTestRailPlan(request.params.arguments);
          case "delete_testrail_plan":
            return await this.deleteTestRailPlan(request.params.arguments);
          case "get_testrail_milestones":
            return await this.getTestRailMilestones(request.params.arguments);
          case "query_database":
            return await this.queryDatabase(request.params.arguments);
          case "list_tables":
            return await this.listTables(request.params.arguments);
          case "describe_table":
            return await this.describeTable(request.params.arguments);
          case "get_table_data":
            return await this.getTableData(request.params.arguments);
          case "convert_markdown_to_html":
            return await this.convertMarkdownToHtml(request.params.arguments);
          case "generate_html_test_report":
            return await this.generateHtmlTestReport(request.params.arguments);
          // Docker handlers
          case "list_docker_containers":
            return await this.listDockerContainers(request.params.arguments);
          case "start_docker_container":
            return await this.startDockerContainer(request.params.arguments);
          case "stop_docker_container":
            return await this.stopDockerContainer(request.params.arguments);
          case "remove_docker_container":
            return await this.removeDockerContainer(request.params.arguments);
          case "get_docker_container_logs":
            return await this.getDockerContainerLogs(request.params.arguments);
          case "inspect_docker_container":
            return await this.inspectDockerContainer(request.params.arguments);
          case "list_docker_images":
            return await this.listDockerImages(request.params.arguments);
          case "pull_docker_image":
            return await this.pullDockerImage(request.params.arguments);
          case "remove_docker_image":
            return await this.removeDockerImage(request.params.arguments);
          case "list_docker_networks":
            return await this.listDockerNetworks(request.params.arguments);
          case "create_docker_network":
            return await this.createDockerNetwork(request.params.arguments);
          case "remove_docker_network":
            return await this.removeDockerNetwork(request.params.arguments);
          case "list_docker_volumes":
            return await this.listDockerVolumes(request.params.arguments);
          case "create_docker_volume":
            return await this.createDockerVolume(request.params.arguments);
          case "remove_docker_volume":
            return await this.removeDockerVolume(request.params.arguments);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            content: [
              {
                type: "text",
                text: `API Error: ${error.response?.data?.errorMessages || error.response?.data?.message || error.message}`,
              },
            ],
            isError: true,
          };
        }
        throw error;
      }
    });
  }

  private async analyzeJiraTicket(args: any) {
    if (!this.jiraClient) {
      throw new McpError(ErrorCode.InternalError, "Jira client not initialized. Please configure JIRA credentials.");
    }

    const ticketKey = String(args.ticket_key);
    const response = await this.jiraClient.get(`/rest/api/2/issue/${ticketKey}`);
    const issue = response.data;

    const analysis = {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description || "No description provided",
      issue_type: issue.fields.issuetype?.name,
      status: issue.fields.status?.name,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName || "Unassigned",
      reporter: issue.fields.reporter?.displayName,
      created: issue.fields.created,
      updated: issue.fields.updated,
      labels: issue.fields.labels || [],
      components: issue.fields.components?.map((c: any) => c.name) || [],
      acceptance_criteria: this.extractAcceptanceCriteria(issue.fields.description),
      custom_fields: this.extractCustomFields(issue.fields),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async analyzeJiraComments(args: any) {
    if (!this.jiraClient) {
      throw new McpError(ErrorCode.InternalError, "Jira client not initialized.");
    }

    const ticketKey = String(args.ticket_key);
    const response = await this.jiraClient.get(`/rest/api/2/issue/${ticketKey}/comment`);
    
    const comments = response.data.comments.map((comment: any) => ({
      id: comment.id,
      author: comment.author.displayName,
      created: comment.created,
      updated: comment.updated,
      body: comment.body,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ total: comments.length, comments }, null, 2),
        },
      ],
    };
  }

  private async extractJiraRequirements(args: any) {
    if (!this.jiraClient) {
      throw new McpError(ErrorCode.InternalError, "Jira client not initialized.");
    }

    const ticketKey = String(args.ticket_key);
    const response = await this.jiraClient.get(`/rest/api/2/issue/${ticketKey}`);
    const issue = response.data;

    const requirements = {
      functional_requirements: this.extractFunctionalRequirements(issue.fields.description),
      non_functional_requirements: this.extractNonFunctionalRequirements(issue.fields.description),
      acceptance_criteria: this.extractAcceptanceCriteria(issue.fields.description),
      user_stories: this.extractUserStories(issue.fields.description),
      edge_cases: this.extractEdgeCases(issue.fields.description),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(requirements, null, 2),
        },
      ],
    };
  }

  private async analyzeGitLabMR(args: any) {
    if (!this.gitlabClient) {
      throw new McpError(ErrorCode.InternalError, "GitLab client not initialized.");
    }

    const projectId = encodeURIComponent(String(args.project_id));
    const mrIid = Number(args.mr_iid);

    const response = await this.gitlabClient.get(`/api/v4/projects/${projectId}/merge_requests/${mrIid}`);
    const mr = response.data;

    const analysis = {
      title: mr.title,
      description: mr.description || "No description",
      state: mr.state,
      author: mr.author?.name,
      source_branch: mr.source_branch,
      target_branch: mr.target_branch,
      created_at: mr.created_at,
      updated_at: mr.updated_at,
      merged_at: mr.merged_at,
      web_url: mr.web_url,
      changes_count: mr.changes_count,
      user_notes_count: mr.user_notes_count,
      upvotes: mr.upvotes,
      downvotes: mr.downvotes,
      labels: mr.labels || [],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async analyzeGitLabChanges(args: any) {
    if (!this.gitlabClient) {
      throw new McpError(ErrorCode.InternalError, "GitLab client not initialized.");
    }

    const projectId = encodeURIComponent(String(args.project_id));
    const mrIid = Number(args.mr_iid);

    const response = await this.gitlabClient.get(
      `/api/v4/projects/${projectId}/merge_requests/${mrIid}/changes`
    );
    const changes = response.data;

    const analysis = {
      files_changed: changes.changes?.length || 0,
      changes: changes.changes?.map((change: any) => ({
        old_path: change.old_path,
        new_path: change.new_path,
        new_file: change.new_file,
        renamed_file: change.renamed_file,
        deleted_file: change.deleted_file,
        diff: change.diff,
      })) || [],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async analyzeTestPlan(args: any) {
    const source = String(args.source);
    const identifier = String(args.identifier);

    if (source === "jira") {
      if (!this.jiraClient) {
        throw new McpError(ErrorCode.InternalError, "Jira client not initialized.");
      }

      const response = await this.jiraClient.get(`/rest/api/2/issue/${identifier}`);
      const testPlan = this.extractTestPlan(response.data.fields.description);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ source: "jira", test_plan: testPlan }, null, 2),
          },
        ],
      };
    } else if (source === "gitlab") {
      if (!this.gitlabClient) {
        throw new McpError(ErrorCode.InternalError, "GitLab client not initialized.");
      }

      const [projectId, mrIid] = identifier.split("/").slice(-2);
      const response = await this.gitlabClient.get(
        `/api/v4/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
      );
      const testPlan = this.extractTestPlan(response.data.description);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ source: "gitlab", test_plan: testPlan }, null, 2),
          },
        ],
      };
    }

    throw new McpError(ErrorCode.InvalidParams, "Invalid source. Must be 'jira' or 'gitlab'");
  }

  private async generateTestIdeas(args: any) {
    const jiraTicketKey = String(args.jira_ticket_key);
    const gitlabProjectId = String(args.gitlab_project_id);
    const gitlabMrIid = Number(args.gitlab_mr_iid);
    const focusAreas = args.focus_areas || [];

    // Gather information from both sources
    const jiraData = await this.analyzeJiraTicket({ ticket_key: jiraTicketKey });
    const gitlabData = await this.analyzeGitLabChanges({ 
      project_id: gitlabProjectId, 
      mr_iid: gitlabMrIid 
    });

    const jiraAnalysis = JSON.parse(jiraData.content[0].text);
    const gitlabAnalysis = JSON.parse(gitlabData.content[0].text);

    const testIdeas = {
      summary: `Test ideas for ${jiraTicketKey}`,
      functional_tests: this.generateFunctionalTestIdeas(jiraAnalysis, gitlabAnalysis),
      edge_case_tests: this.generateEdgeCaseTestIdeas(jiraAnalysis, gitlabAnalysis),
      integration_tests: this.generateIntegrationTestIdeas(jiraAnalysis, gitlabAnalysis),
      regression_tests: this.generateRegressionTestIdeas(jiraAnalysis, gitlabAnalysis),
      security_tests: focusAreas.includes("security") ? this.generateSecurityTestIdeas(jiraAnalysis, gitlabAnalysis) : [],
      performance_tests: focusAreas.includes("performance") ? this.generatePerformanceTestIdeas(jiraAnalysis, gitlabAnalysis) : [],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(testIdeas, null, 2),
        },
      ],
    };
  }

  private async generateTestCases(args: any) {
    const jiraTicketKey = String(args.jira_ticket_key);
    const gitlabProjectId = String(args.gitlab_project_id);
    const gitlabMrIid = Number(args.gitlab_mr_iid);
    const testType = String(args.test_type || "all");

    const testIdeas = await this.generateTestIdeas({
      jira_ticket_key: jiraTicketKey,
      gitlab_project_id: gitlabProjectId,
      gitlab_mr_iid: gitlabMrIid,
    });

    const ideas = JSON.parse(testIdeas.content[0].text);
    const testCases = this.convertIdeasToTestCases(ideas, testType);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(testCases, null, 2),
        },
      ],
    };
  }

  private async getTestRailTestCases(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const suiteId = Number(args.suite_id);
    const projectId = args.project_id || 2; // Default to project 2
    const response = await this.testrailClient.get(`/get_cases/${projectId}&suite_id=${suiteId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createTestRailTestCase(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const sectionId = Number(args.section_id);
    const payload = {
      title: String(args.title),
      custom_steps_separated: args.steps,
      priority_id: args.priority || 2,
    };

    const response = await this.testrailClient.post(`/add_case/${sectionId}`, payload);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createTestRailSection(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const suiteId = Number(args.suite_id);
    const projectId = args.project_id || 14; // Default to project 14
    const payload: any = {
      suite_id: suiteId,
      name: String(args.name),
    };

    if (args.parent_id) {
      payload.parent_id = Number(args.parent_id);
    }

    const response = await this.testrailClient.post(`/add_section/${projectId}`, payload);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTestRailSections(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const suiteId = Number(args.suite_id);
    const projectId = args.project_id || 14; // Default to project 14
    const response = await this.testrailClient.get(`/get_sections/${projectId}?suite_id=${suiteId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTestRailTestRun(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const runId = Number(args.run_id);
    const response = await this.testrailClient.get(`/get_run/${runId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTestRailTestResults(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const runId = Number(args.run_id);
    const response = await this.testrailClient.get(`/get_results_for_run/${runId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTestRailSuites(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const projectId = args.project_id || 14; // Default to project 14
    const response = await this.testrailClient.get(`/get_suites/${projectId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getTestRailSuite(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const suiteId = Number(args.suite_id);
    const response = await this.testrailClient.get(`/get_suite/${suiteId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async addTestRailSuite(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const projectId = Number(args.project_id);
    const payload: any = {
      name: String(args.name),
    };

    if (args.description) {
      payload.description = String(args.description);
    }

    const response = await this.testrailClient.post(`/add_suite/${projectId}`, payload);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateTestRailSuite(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }

    const suiteId = Number(args.suite_id);
    const payload: any = {};

    if (args.name) {
      payload.name = String(args.name);
    }

    if (args.description) {
      payload.description = String(args.description);
    }

    const response = await this.testrailClient.post(`/update_suite/${suiteId}`, payload);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  // Extended TestRail Methods

  private async getTestRailCase(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const caseId = Number(args.case_id);
    const response = await this.testrailClient.get(`/get_case/${caseId}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailCases(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const projectId = Number(args.project_id);
    const suiteId = Number(args.suite_id);
    const limit = Number(args.limit || 50);
    const offset = Number(args.offset || 0);
    const response = await this.testrailClient.get(`/get_cases/${projectId}&suite_id=${suiteId}&limit=${limit}&offset=${offset}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async updateTestRailCase(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const caseId = Number(args.case_id);
    const payload: any = {};
    if (args.title) payload.title = String(args.title);
    if (args.type_id) payload.type_id = Number(args.type_id);
    if (args.priority_id) payload.priority_id = Number(args.priority_id);
    if (args.template_id) payload.template_id = Number(args.template_id);
    if (args.custom_steps) payload.custom_steps = String(args.custom_steps);
    if (args.custom_expected) payload.custom_expected = String(args.custom_expected);
    if (args.custom_steps_separated) payload.custom_steps_separated = args.custom_steps_separated;
    const response = await this.testrailClient.post(`/update_case/${caseId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async deleteTestRailCase(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const caseId = Number(args.case_id);
    await this.testrailClient.post(`/delete_case/${caseId}`);
    return { content: [{ type: "text", text: `Case ${caseId} deleted successfully` }] };
  }

  private async getTestRailCaseTypes(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const response = await this.testrailClient.get('/get_case_types');
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailCaseFields(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const response = await this.testrailClient.get('/get_case_fields');
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailSection(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const sectionId = Number(args.section_id);
    const response = await this.testrailClient.get(`/get_section/${sectionId}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async updateTestRailSection(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const sectionId = Number(args.section_id);
    const payload: any = {};
    if (args.name) payload.name = String(args.name);
    if (args.description) payload.description = String(args.description);
    const response = await this.testrailClient.post(`/update_section/${sectionId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async deleteTestRailSection(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const sectionId = Number(args.section_id);
    await this.testrailClient.post(`/delete_section/${sectionId}`);
    return { content: [{ type: "text", text: `Section ${sectionId} deleted successfully` }] };
  }

  private async getTestRailRuns(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const projectId = Number(args.project_id);
    let url = `/get_runs/${projectId}`;
    const params = [];
    if (args.limit) params.push(`limit=${Number(args.limit)}`);
    if (args.offset) params.push(`offset=${Number(args.offset)}`);
    if (params.length > 0) url += `&${params.join('&')}`;
    const response = await this.testrailClient.get(url);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async addTestRailRun(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const projectId = Number(args.project_id);
    const payload: any = { name: String(args.name) };
    if (args.suite_id) payload.suite_id = Number(args.suite_id);
    if (args.description) payload.description = String(args.description);
    if (args.include_all !== undefined) payload.include_all = Boolean(args.include_all);
    if (args.case_ids) payload.case_ids = args.case_ids;
    const response = await this.testrailClient.post(`/add_run/${projectId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async updateTestRailRun(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const runId = Number(args.run_id);
    const payload: any = {};
    if (args.name) payload.name = String(args.name);
    if (args.description) payload.description = String(args.description);
    const response = await this.testrailClient.post(`/update_run/${runId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async closeTestRailRun(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const runId = Number(args.run_id);
    const response = await this.testrailClient.post(`/close_run/${runId}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async deleteTestRailRun(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const runId = Number(args.run_id);
    await this.testrailClient.post(`/delete_run/${runId}`);
    return { content: [{ type: "text", text: `Run ${runId} deleted successfully` }] };
  }

  private async getTestRailTests(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const runId = Number(args.run_id);
    const limit = Number(args.limit || 50);
    const offset = Number(args.offset || 0);
    const response = await this.testrailClient.get(`/get_tests/${runId}&limit=${limit}&offset=${offset}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailTest(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const testId = Number(args.test_id);
    const response = await this.testrailClient.get(`/get_test/${testId}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailResults(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const testId = Number(args.test_id);
    let url = `/get_results/${testId}`;
    if (args.limit) url += `&limit=${Number(args.limit)}`;
    const response = await this.testrailClient.get(url);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailResultsForCase(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const runId = Number(args.run_id);
    const caseId = Number(args.case_id);
    let url = `/get_results_for_case/${runId}/${caseId}`;
    if (args.limit) url += `&limit=${Number(args.limit)}`;
    const response = await this.testrailClient.get(url);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async addTestRailResultForCase(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const runId = Number(args.run_id);
    const caseId = Number(args.case_id);
    const payload: any = {};
    if (args.status_id) payload.status_id = Number(args.status_id);
    if (args.comment) payload.comment = String(args.comment);
    if (args.elapsed) payload.elapsed = String(args.elapsed);
    const response = await this.testrailClient.post(`/add_result_for_case/${runId}/${caseId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async addTestRailResultsForCases(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const runId = Number(args.run_id);
    const payload = { results: args.results };
    const response = await this.testrailClient.post(`/add_results_for_cases/${runId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailPlans(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const projectId = Number(args.project_id);
    let url = `/get_plans/${projectId}`;
    if (args.limit) url += `&limit=${Number(args.limit)}`;
    const response = await this.testrailClient.get(url);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async getTestRailPlan(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const planId = Number(args.plan_id);
    const response = await this.testrailClient.get(`/get_plan/${planId}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async addTestRailPlan(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const projectId = Number(args.project_id);
    const payload: any = { name: String(args.name) };
    if (args.description) payload.description = String(args.description);
    const response = await this.testrailClient.post(`/add_plan/${projectId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async updateTestRailPlan(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const planId = Number(args.plan_id);
    const payload: any = {};
    if (args.name) payload.name = String(args.name);
    if (args.description) payload.description = String(args.description);
    const response = await this.testrailClient.post(`/update_plan/${planId}`, payload);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async closeTestRailPlan(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const planId = Number(args.plan_id);
    const response = await this.testrailClient.post(`/close_plan/${planId}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  private async deleteTestRailPlan(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const planId = Number(args.plan_id);
    await this.testrailClient.post(`/delete_plan/${planId}`);
    return { content: [{ type: "text", text: `Plan ${planId} deleted successfully` }] };
  }

  private async getTestRailMilestones(args: any) {
    if (!this.testrailClient) {
      throw new McpError(ErrorCode.InternalError, "TestRail client not initialized.");
    }
    const projectId = Number(args.project_id);
    const response = await this.testrailClient.get(`/get_milestones/${projectId}`);
    return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
  }

  // Helper methods for extraction and analysis

  private extractAcceptanceCriteria(description: string): string[] {
    if (!description) return [];
    const criteriaMatch = description.match(/acceptance criteria:?\s*([\s\S]*?)(?=\n\n|$)/i);
    if (!criteriaMatch) return [];
    return criteriaMatch[1].split('\n').filter(line => line.trim()).map(line => line.trim());
  }

  private extractCustomFields(fields: any): any {
    const customFields: any = {};
    for (const key in fields) {
      if (key.startsWith('customfield_')) {
        customFields[key] = fields[key];
      }
    }
    return customFields;
  }

  private extractFunctionalRequirements(description: string): string[] {
    if (!description) return [];
    const lines = description.split('\n').filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('must') || lower.includes('should') || lower.includes('shall');
    });
    return lines;
  }

  private extractNonFunctionalRequirements(description: string): string[] {
    if (!description) return [];
    const lines = description.split('\n').filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('performance') || lower.includes('security') || 
             lower.includes('scalability') || lower.includes('reliability');
    });
    return lines;
  }

  private extractUserStories(description: string): string[] {
    if (!description) return [];
    const storyMatch = description.match(/as a.*?i want.*?so that/gi);
    return storyMatch || [];
  }

  private extractEdgeCases(description: string): string[] {
    if (!description) return [];
    const edgeMatch = description.match(/edge case:?\s*([\s\S]*?)(?=\n\n|$)/i);
    if (!edgeMatch) return [];
    return edgeMatch[1].split('\n').filter(line => line.trim());
  }

  private extractTestPlan(description: string): string {
    if (!description) return "No test plan found";
    const testPlanMatch = description.match(/test plan:?\s*([\s\S]*?)(?=\n\n|$)/i);
    return testPlanMatch ? testPlanMatch[1].trim() : "No test plan found";
  }

  private generateFunctionalTestIdeas(jiraAnalysis: any, gitlabAnalysis: any): string[] {
    const ideas = [
      `Verify ${jiraAnalysis.summary} works as expected`,
      `Test basic functionality described in the ticket`,
      `Validate acceptance criteria are met`,
    ];

    if (gitlabAnalysis.files_changed > 0) {
      ideas.push(`Test all modified components: ${gitlabAnalysis.files_changed} files changed`);
    }

    return ideas;
  }

  private generateEdgeCaseTestIdeas(jiraAnalysis: any, gitlabAnalysis: any): string[] {
    return [
      "Test with empty/null inputs",
      "Test with maximum allowed values",
      "Test with special characters",
      "Test concurrent operations",
      "Test with invalid data types",
    ];
  }

  private generateIntegrationTestIdeas(jiraAnalysis: any, gitlabAnalysis: any): string[] {
    return [
      "Test integration with dependent systems",
      "Test API endpoints if modified",
      "Test database interactions",
      "Test third-party service integrations",
    ];
  }

  private generateRegressionTestIdeas(jiraAnalysis: any, gitlabAnalysis: any): string[] {
    return [
      "Verify existing functionality still works",
      "Test related features that might be affected",
      "Run smoke tests on critical paths",
    ];
  }

  private generateSecurityTestIdeas(jiraAnalysis: any, gitlabAnalysis: any): string[] {
    return [
      "Test authentication and authorization",
      "Test input validation and sanitization",
      "Test for SQL injection vulnerabilities",
      "Test for XSS vulnerabilities",
      "Test data encryption",
    ];
  }

  private generatePerformanceTestIdeas(jiraAnalysis: any, gitlabAnalysis: any): string[] {
    return [
      "Test response time under normal load",
      "Test system behavior under high load",
      "Test resource utilization",
      "Test scalability",
    ];
  }

  private convertIdeasToTestCases(ideas: any, testType: string): any[] {
    const testCases: any[] = [];
    const categories = testType === "all" 
      ? ["functional_tests", "edge_case_tests", "integration_tests", "regression_tests"]
      : [`${testType}_tests`];

    for (const category of categories) {
      const categoryIdeas = ideas[category] || [];
      categoryIdeas.forEach((idea: string, index: number) => {
        testCases.push({
          id: `TC-${category}-${index + 1}`,
          title: idea,
          type: category.replace('_tests', ''),
          priority: "Medium",
          steps: [
            {
              step: 1,
              action: `Prepare test data for: ${idea}`,
              expected: "Test data is ready",
            },
            {
              step: 2,
              action: `Execute test: ${idea}`,
              expected: "Test executes successfully",
            },
            {
              step: 3,
              action: "Verify results",
              expected: "Results match expected behavior",
            },
          ],
        });
      });
    }

    return testCases;
  }

  // MySQL Database Methods

  private async getMySQLConnection(dbName: string = 'gateway') {
    const dbConfig = DB_CONFIGS[dbName];
    
    if (!dbConfig || !dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
      throw new McpError(
        ErrorCode.InternalError,
        `Database '${dbName}' not configured. Please set the required environment variables.`
      );
    }

    // If SSH tunnel is enabled, create tunnel first
    if (USE_SSH_TUNNEL) {
      if (!SSH_HOST || !SSH_USER || !SSH_KEY_PATH) {
        throw new McpError(
          ErrorCode.InternalError,
          "SSH tunnel enabled but SSH configuration incomplete. Please set SSH_HOST, SSH_USER, and SSH_KEY_PATH."
        );
      }

      try {
        // Read SSH private key
        const privateKey = fs.readFileSync(SSH_KEY_PATH);

        // Create SSH tunnel configuration
        const tunnelOptions = {
          autoClose: false,
          reconnectOnError: true
        };

        const sshOptions = {
          host: SSH_HOST,
          port: SSH_PORT,
          username: SSH_USER,
          privateKey: privateKey,
        };

        const serverOptions = {
          port: 0 // Auto-assign local port
        };

        const forwardOptions = {
          srcAddr: '127.0.0.1',
          srcPort: 0,
          dstAddr: dbConfig.host,
          dstPort: dbConfig.port,
        };

        // Create tunnel
        const [server, connection] = await createTunnel(
          tunnelOptions,
          serverOptions,
          sshOptions,
          forwardOptions
        );

        const localPort = (server.address() as any).port;

        // Connect to MySQL through the tunnel (localhost)
        const mysqlConnection = await mysql.createConnection({
          host: '127.0.0.1',
          port: localPort,
          user: dbConfig.user,
          password: dbConfig.password,
          database: dbConfig.database,
        });

        // Store tunnel info for cleanup
        (mysqlConnection as any)._sshServer = server;
        (mysqlConnection as any)._sshConnection = connection;

        return mysqlConnection;
      } catch (error: any) {
        throw new McpError(
          ErrorCode.InternalError,
          `SSH tunnel error for database '${dbName}': ${error.message}`
        );
      }
    }

    // Direct connection (no SSH tunnel)
    return await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
  }

  private async closeMySQLConnection(connection: any) {
    try {
      await connection.end();
      
      // Clean up SSH tunnel if it exists
      if (connection._sshServer) {
        connection._sshServer.close();
      }
      if (connection._sshConnection) {
        connection._sshConnection.end();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async queryDatabase(args: any) {
    const query = String(args.query).trim();
    const limit = Math.min(Number(args.limit) || 100, 1000);
    const dbName = String(args.database_name || 'gateway');

    // Security: Only allow SELECT queries
    if (!query.toLowerCase().startsWith('select')) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Only SELECT queries are allowed. This is a READ-ONLY database connection."
      );
    }

    const connection = await this.getMySQLConnection(dbName);
    
    try {
      // Add LIMIT if not present
      let finalQuery = query;
      if (!query.toLowerCase().includes('limit')) {
        finalQuery = `${query} LIMIT ${limit}`;
      }

      const [rows] = await connection.execute(finalQuery);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query: finalQuery,
              row_count: Array.isArray(rows) ? rows.length : 0,
              data: rows,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Database query error: ${error.message}`
      );
    } finally {
      await connection.end();
    }
  }

  private async listTables(args: any) {
    const dbName = String(args.database_name || 'gateway');
    const connection = await this.getMySQLConnection(dbName);
    
    try {
      const [rows] = await connection.execute('SHOW TABLES');
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              database: dbName,
              table_count: Array.isArray(rows) ? rows.length : 0,
              tables: rows,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error listing tables: ${error.message}`
      );
    } finally {
      await connection.end();
    }
  }

  private async describeTable(args: any) {
    const tableName = String(args.table_name);
    const dbName = String(args.database_name || 'gateway');
    
    // Basic sanitization - only allow alphanumeric, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(tableName)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Invalid table name. Only alphanumeric characters, underscores, and hyphens are allowed."
      );
    }

    const connection = await this.getMySQLConnection(dbName);
    
    try {
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      const [indexes] = await connection.execute(`SHOW INDEXES FROM ${tableName}`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              database: dbName,
              table: tableName,
              columns: columns,
              indexes: indexes,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error describing table: ${error.message}`
      );
    } finally {
      await connection.end();
    }
  }

  private async getTableData(args: any) {
    const tableName = String(args.table_name);
    const limit = Math.min(Number(args.limit) || 10, 1000);
    const whereClause = args.where ? String(args.where) : null;
    const dbName = String(args.database_name || 'gateway');
    
    // Basic sanitization - only allow alphanumeric, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(tableName)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Invalid table name. Only alphanumeric characters, underscores, and hyphens are allowed."
      );
    }

    const connection = await this.getMySQLConnection(dbName);
    
    try {
      let query = `SELECT * FROM ${tableName}`;
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }
      query += ` LIMIT ${limit}`;

      const [rows] = await connection.execute(query);
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM ${tableName}${whereClause ? ` WHERE ${whereClause}` : ''}`
      );
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              table: tableName,
              total_rows: Array.isArray(countResult) && countResult.length > 0 ? (countResult[0] as any).total : 0,
              returned_rows: Array.isArray(rows) ? rows.length : 0,
              limit: limit,
              where: whereClause || "none",
              data: rows,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error fetching table data: ${error.message}`
      );
    } finally {
      await connection.end();
    }
  }

  // Markdown to HTML Conversion

  private async convertMarkdownToHtml(args: any) {
    const markdown = String(args.markdown);
    const includeCss = Boolean(args.include_css ?? false);
    const sanitize = Boolean(args.sanitize ?? true);

    try {
      // Configure marked options
      marked.setOptions({
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert \n to <br>
      });

      // Convert markdown to HTML
      let html = await marked.parse(markdown);

      // Sanitize HTML if requested (basic sanitization)
      if (sanitize) {
        html = this.sanitizeHtml(html);
      }

      // Add CSS if requested
      if (includeCss) {
        html = this.wrapHtmlWithCss(html);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              html: html,
              original_length: markdown.length,
              html_length: html.length,
              options: {
                include_css: includeCss,
                sanitize: sanitize,
              }
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Markdown conversion error: ${error.message}`
      );
    }
  }

  private sanitizeHtml(html: string): string {
    // Basic HTML sanitization - remove potentially dangerous tags and attributes
    // Note: For production use, consider using a library like DOMPurify
    let sanitized = html;
    
    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove inline event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
    
    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    return sanitized;
  }

  private wrapHtmlWithCss(html: string): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Extract title from first h1 tag or use default
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const documentTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'Test Analysis & Summary';
    
    // Add IDs to h2 headings for TOC navigation
    html = this.addIdsToHeadings(html);
    
    // Generate table of contents from h2 headings
    const toc = this.generateTableOfContents(html);

    const css = `
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.8;
  color: #2c3e50;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  min-height: 100vh;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  text-align: center;
  border-bottom: 4px solid #5a67d8;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.header .meta {
  opacity: 0.9;
  font-size: 1.1em;
  margin-top: 10px;
}

.toc-container {
  background: #f8f9fa;
  border-left: 5px solid #667eea;
  margin: 30px 40px;
  padding: 25px 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.toc-container h2 {
  color: #667eea;
  margin-bottom: 15px;
  font-size: 1.5em;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.toc-list {
  list-style: none;
  padding: 0;
}

.toc-list li {
  margin: 10px 0;
  padding-left: 20px;
  position: relative;
}

.toc-list li:before {
  content: "▸";
  position: absolute;
  left: 0;
  color: #667eea;
  font-weight: bold;
}

.toc-list a {
  color: #5a67d8;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  display: block;
  padding: 5px 10px;
  border-radius: 4px;
}

.toc-list a:hover {
  color: #764ba2;
  background: #e9ecef;
  padding-left: 15px;
  transform: translateX(5px);
}

.content {
  padding: 40px;
}

h1, h2, h3, h4, h5, h6 {
  margin-top: 30px;
  margin-bottom: 20px;
  font-weight: 600;
  line-height: 1.3;
  color: #2c3e50;
}

h1 {
  font-size: 2.5em;
  color: #667eea;
  border-bottom: 3px solid #667eea;
  padding-bottom: 15px;
  margin-top: 0;
}

h2 {
  font-size: 2em;
  color: #5a67d8;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 12px;
  padding-top: 40px;
  margin-top: 50px;
  position: relative;
}

h2:before {
  content: "";
  position: absolute;
  top: 0;
  left: -40px;
  right: -40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e9ecef, transparent);
}

h3 {
  font-size: 1.5em;
  color: #764ba2;
  border-left: 4px solid #667eea;
  padding-left: 15px;
  margin-top: 25px;
}

h4 {
  font-size: 1.25em;
  color: #5a67d8;
  margin-top: 20px;
}

h5 {
  font-size: 1.1em;
  color: #6c757d;
}

h6 {
  font-size: 1em;
  color: #6c757d;
  font-style: italic;
}

p {
  margin-bottom: 18px;
  line-height: 1.8;
}

strong {
  color: #667eea;
  font-weight: 600;
}

a {
  color: #667eea;
  text-decoration: none;
  border-bottom: 1px dotted #667eea;
  transition: all 0.3s ease;
}

a:hover {
  color: #764ba2;
  border-bottom: 1px solid #764ba2;
}

code {
  padding: 3px 8px;
  margin: 0 2px;
  font-size: 90%;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  color: #2d3436;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

pre {
  padding: 20px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.6;
  background: #2d3436;
  color: #dfe6e9;
  border-radius: 8px;
  margin: 20px 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-left: 4px solid #667eea;
}

pre code {
  padding: 0;
  background: transparent;
  color: #dfe6e9;
  box-shadow: none;
}

blockquote {
  padding: 15px 20px;
  color: #6c757d;
  border-left: 5px solid #667eea;
  background: #f8f9fa;
  margin: 20px 0;
  border-radius: 0 6px 6px 0;
  font-style: italic;
}

table {
  border-spacing: 0;
  border-collapse: collapse;
  margin: 25px 0;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

table th,
table td {
  padding: 12px 16px;
  border: 1px solid #dee2e6;
  text-align: left;
}

table th {
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-transform: uppercase;
  font-size: 0.9em;
  letter-spacing: 0.5px;
}

table tr {
  background-color: white;
  transition: all 0.3s ease;
}

table tr:nth-child(even) {
  background-color: #f8f9fa;
}

table tr:hover {
  background-color: #e9ecef;
  transform: scale(1.01);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

ul, ol {
  padding-left: 30px;
  margin: 15px 0;
}

li {
  margin: 8px 0;
  line-height: 1.7;
}

li::marker {
  color: #667eea;
  font-weight: bold;
}

img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin: 20px 0;
}

hr {
  height: 2px;
  padding: 0;
  margin: 40px 0;
  background: linear-gradient(90deg, transparent, #667eea, transparent);
  border: 0;
}

.section-divider {
  margin: 60px 0;
  height: 3px;
  background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* Scroll behavior */
html {
  scroll-behavior: smooth;
}

/* Back to top button */
.back-to-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  font-size: 24px;
  border: none;
  opacity: 0;
  pointer-events: none;
}

.back-to-top:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}

/* Print styles */
@media print {
  body {
    background: white;
    padding: 0;
  }
  
  .container {
    box-shadow: none;
  }
  
  .back-to-top {
    display: none;
  }
  
  .toc-container {
    page-break-after: always;
  }
}

/* Responsive */
@media (max-width: 768px) {
  body {
    padding: 10px;
  }
  
  .header {
    padding: 30px 20px;
  }
  
  .header h1 {
    font-size: 2em;
  }
  
  .content {
    padding: 20px;
  }
  
  .toc-container {
    margin: 20px;
    padding: 20px;
  }
  
  h2:before {
    left: -20px;
    right: -20px;
  }
}
</style>
`;

    return `<html lang="en"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
  
${css}

</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 ${documentTitle}</h1>
      <div class="meta">Test Analysis &amp; Summary Report</div>
      <div class="meta">${currentDate}</div>
    </div>
    
    <div class="content">
      ${html}
    </div>
  </div>
  
  <a href="#" class="back-to-top" title="Back to top">↑</a>
  
  <script>
    window.addEventListener('scroll', function() {
      const backToTop = document.querySelector('.back-to-top');
      if (window.pageYOffset > 300) {
        backToTop.style.opacity = '1';
        backToTop.style.pointerEvents = 'all';
      } else {
        backToTop.style.opacity = '0';
        backToTop.style.pointerEvents = 'none';
      }
    });
  </script>


</body></html>`;
  }

  private addIdsToHeadings(html: string): string {
    // Add IDs to h2 headings for TOC navigation
    let counter = 0;
    return html.replace(/<h2>(.*?)<\/h2>/gi, (match, content) => {
      counter++;
      const id = `section-${counter}`;
      return `<h2 id="${id}">${content}</h2>`;
    });
  }

  private generateTableOfContents(html: string): string {
    // Extract h2 headings for TOC
    const h2Regex = /<h2[^>]*id=["']([^"']*)["'][^>]*>(.*?)<\/h2>/gi;
    const matches = [...html.matchAll(h2Regex)];
    
    if (matches.length === 0) {
      return ''; // No TOC if no h2 headings
    }

    const tocItems = matches.map(match => {
      const id = match[1];
      const title = match[2].replace(/<[^>]*>/g, ''); // Strip HTML tags
      return `<li><a href="#${id}">${title}</a></li>`;
    }).join('\n        ');

    return `<div class="toc-container">
      <h2>📋 Table of Contents</h2>
      <ul class="toc-list">
        ${tocItems}
      </ul>
    </div>`;
  }

  // HTML Test Report Generation

  private async generateHtmlTestReport(args: any) {
    try {
      const ticketKey = String(args.ticket_key);
      const jiraData = args.jira_data;
      const jiraComments = args.jira_comments || [];
      const gitlabMrData = args.gitlab_mr_data;
      const gitlabChangesData = args.gitlab_changes_data || { files_changed: 0, changes: [] };
      const testIdeas = args.test_ideas;
      const testCases = args.test_cases || [];

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Extract priority level for badge
      const priorityLevel = jiraData.priority?.toLowerCase() || 'medium';

      // Build HTML
      const html = this.buildTestReportHtml({
        ticketKey,
        jiraData,
        jiraComments,
        gitlabMrData,
        gitlabChangesData,
        testIdeas,
        testCases,
        currentDate,
        priorityLevel,
      });

      return {
        content: [
          {
            type: "text",
            text: html,
          },
        ],
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `HTML report generation error: ${error.message}`
      );
    }
  }

  private buildTestReportHtml(data: any): string {
    const {
      ticketKey,
      jiraData,
      jiraComments,
      gitlabMrData,
      gitlabChangesData,
      testIdeas,
      testCases,
      currentDate,
      priorityLevel,
    } = data;

    // Count test ideas by category
    const functionalCount = testIdeas.functional_tests?.length || 0;
    const integrationCount = testIdeas.integration_tests?.length || 0;
    const edgeCaseCount = testIdeas.edge_case_tests?.length || 0;
    const regressionCount = testIdeas.regression_tests?.length || 0;
    const securityCount = testIdeas.security_tests?.length || 0;
    const performanceCount = testIdeas.performance_tests?.length || 0;
    const totalIdeas = functionalCount + integrationCount + edgeCaseCount + regressionCount + securityCount + performanceCount;

    // Build test ideas HTML
    const testIdeasHtml = this.buildTestIdeasHtml(testIdeas);
    
    // Build test cases HTML
    const testCasesHtml = this.buildTestCasesHtml(testCases);

    // Build modified files HTML
    const modifiedFilesHtml = this.buildModifiedFilesHtml(gitlabChangesData);

    // Build comments HTML
    const rootCauseHtml = this.buildRootCauseHtml(jiraComments);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${ticketKey} Test Analysis Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .meta {
            opacity: 0.9;
            font-size: 1.1em;
            margin: 5px 0;
        }
        
        .meta a {
            color: white;
            text-decoration: underline;
        }
        
        .content {
            padding: 40px;
        }
        
        .toc {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 40px;
            border-left: 4px solid #667eea;
        }
        
        .toc h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        .toc ul {
            list-style: none;
            padding: 0;
        }
        
        .toc li {
            margin: 10px 0;
        }
        
        .toc a {
            color: #5a67d8;
            text-decoration: none;
            font-size: 1.1em;
            transition: all 0.2s;
            display: block;
            padding: 8px 12px;
            border-radius: 4px;
        }
        
        .toc a:hover {
            background: #e9ecef;
            transform: translateX(10px);
        }
        
        section {
            margin: 50px 0;
            scroll-margin-top: 20px;
        }
        
        h2 {
            color: #667eea;
            font-size: 2em;
            margin: 40px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        
        h3 {
            color: #764ba2;
            font-size: 1.5em;
            margin: 25px 0 15px 0;
            border-left: 4px solid #667eea;
            padding-left: 15px;
        }
        
        p {
            margin: 15px 0;
            line-height: 1.8;
        }
        
        a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.9em;
            font-weight: 600;
            margin: 0 5px;
        }
        
        .badge-priority-high { background: #ff6b6b; color: white; }
        .badge-priority-medium { background: #ffd93d; color: #2c3e50; }
        .badge-priority-low { background: #6bcf7f; color: white; }
        .badge-status { background: #4ecdc4; color: white; }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .info-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .info-card strong {
            color: #667eea;
            display: block;
            margin-bottom: 8px;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 8px 0;
            line-height: 1.7;
        }
        
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #2d3436;
            color: #dfe6e9;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        th, td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }
        
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.9em;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .back-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: all 0.3s;
            font-size: 24px;
        }
        
        .back-to-top:hover {
            transform: translateY(-5px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .back-to-top { display: none; }
        }
        
        @media (max-width: 768px) {
            body { padding: 10px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 1.8em; }
            .content { padding: 20px; }
            .toc { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 ${ticketKey} Test Analysis Report</h1>
            <div class="meta">
                <a href="${jiraData.custom_fields?.customfield_10020 || `https://jira.paysera.net/browse/${ticketKey}`}" target="_blank">${ticketKey}</a> • 
                <a href="${gitlabMrData.web_url}" target="_blank">MR !${gitlabMrData.web_url.split('/').pop()}</a>
            </div>
            <div class="meta">Generated: ${currentDate}</div>
        </div>
        
        <div class="content">
            <div class="toc">
                <h2>📑 Table of Contents</h2>
                <ul>
                    <li><a href="#ticket-information">📋 Ticket Information</a></li>
                    <li><a href="#issue-summary">🎯 Issue Summary</a></li>
                    <li><a href="#root-cause">🔍 Root Cause Analysis</a></li>
                    <li><a href="#solution-implemented">💡 Solution Implemented</a></li>
                    <li><a href="#test-coverage">🧪 Test Coverage Analysis</a></li>
                    <li><a href="#test-ideas">💭 Test Ideas</a></li>
                    <li><a href="#test-cases">📝 Detailed Test Cases</a></li>
                    <li><a href="#metrics">📊 Key Metrics</a></li>
                </ul>
            </div>
            
            <section id="ticket-information">
                <h2>📋 Ticket Information</h2>
                <div class="info-grid">
                    <div class="info-card">
                        <strong>Ticket</strong>
                        <a href="https://jira.paysera.net/browse/${ticketKey}" target="_blank">${ticketKey}</a>
                    </div>
                    <div class="info-card">
                        <strong>Merge Request</strong>
                        <a href="${gitlabMrData.web_url}" target="_blank">!${gitlabMrData.web_url.split('/').pop()}</a>
                    </div>
                    <div class="info-card">
                        <strong>Status</strong>
                        <span class="badge badge-status">${jiraData.status || 'Unknown'}</span>
                    </div>
                    <div class="info-card">
                        <strong>Priority</strong>
                        <span class="badge badge-priority-${priorityLevel}">${jiraData.priority || 'Medium'}</span>
                    </div>
                    <div class="info-card">
                        <strong>Assignee</strong>
                        ${jiraData.assignee || 'Unassigned'}
                    </div>
                    <div class="info-card">
                        <strong>Reporter</strong>
                        ${jiraData.reporter || 'Unknown'}
                    </div>
                </div>
            </section>
            
            <section id="issue-summary">
                <h2>🎯 Issue Summary</h2>
                <p><strong>${jiraData.summary}</strong></p>
                <p>${this.extractFirstSentences(jiraData.description, 3)}</p>
            </section>
            
            <section id="root-cause">
                <h2>🔍 Root Cause Analysis</h2>
                ${rootCauseHtml}
            </section>
            
            <section id="solution-implemented">
                <h2>💡 Solution Implemented</h2>
                <h3>Files Modified</h3>
                <p><strong>${gitlabChangesData.files_changed}</strong> files changed</p>
                ${modifiedFilesHtml}
                
                <h3>Technical Changes</h3>
                <p>View full changes in <a href="${gitlabMrData.web_url}" target="_blank">Merge Request !${gitlabMrData.web_url.split('/').pop()}</a></p>
            </section>
            
            <section id="test-coverage">
                <h2>🧪 Test Coverage Analysis</h2>
                <div class="info-grid">
                    <div class="info-card">
                        <strong>Total Test Ideas</strong>
                        ${totalIdeas} ideas
                    </div>
                    <div class="info-card">
                        <strong>Functional Tests</strong>
                        ${functionalCount}
                    </div>
                    <div class="info-card">
                        <strong>Integration Tests</strong>
                        ${integrationCount}
                    </div>
                    <div class="info-card">
                        <strong>Edge Cases</strong>
                        ${edgeCaseCount}
                    </div>
                    <div class="info-card">
                        <strong>Regression Tests</strong>
                        ${regressionCount}
                    </div>
                    <div class="info-card">
                        <strong>Security Tests</strong>
                        ${securityCount}
                    </div>
                </div>
            </section>
            
            <section id="test-ideas">
                <h2>💭 Test Ideas</h2>
                ${testIdeasHtml}
            </section>
            
            <section id="test-cases">
                <h2>📝 Detailed Test Cases</h2>
                ${testCasesHtml}
            </section>
            
            <section id="metrics">
                <h2>📊 Key Metrics</h2>
                <div class="info-grid">
                    <div class="info-card">
                        <strong>MCP Tools Used</strong>
                        6 tools
                    </div>
                    <div class="info-card">
                        <strong>Files Analyzed</strong>
                        ${gitlabChangesData.files_changed} files
                    </div>
                    <div class="info-card">
                        <strong>Comments Reviewed</strong>
                        ${jiraComments.length} comments
                    </div>
                    <div class="info-card">
                        <strong>Test Cases Created</strong>
                        ${testCases.length} cases
                    </div>
                </div>
            </section>
        </div>
    </div>
    
    <a href="#" class="back-to-top" title="Back to top">↑</a>
    
    <script>
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        
        window.addEventListener('scroll', () => {
            const backToTop = document.querySelector('.back-to-top');
            if (window.pageYOffset > 300) {
                backToTop.style.opacity = '1';
            } else {
                backToTop.style.opacity = '0';
            }
        });
    </script>
</body>
</html>`;
  }

  private extractFirstSentences(text: string, count: number = 3): string {
    if (!text) return 'No description provided';
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, count).join('. ') + '.';
  }

  private buildTestIdeasHtml(testIdeas: any): string {
    const sections = [
      { key: 'functional_tests', title: 'Functional Tests', icon: '⚙️' },
      { key: 'integration_tests', title: 'Integration Tests', icon: '🔗' },
      { key: 'edge_case_tests', title: 'Edge Cases', icon: '🎯' },
      { key: 'regression_tests', title: 'Regression Tests', icon: '🔄' },
      { key: 'security_tests', title: 'Security Tests', icon: '🔒' },
      { key: 'performance_tests', title: 'Performance Tests', icon: '⚡' },
    ];

    let html = '';
    for (const section of sections) {
      const ideas = testIdeas[section.key] || [];
      if (ideas.length > 0) {
        html += `<h3>${section.icon} ${section.title}</h3><ul>`;
        ideas.forEach((idea: string) => {
          html += `<li>${idea}</li>`;
        });
        html += '</ul>';
      }
    }
    return html || '<p>No test ideas generated</p>';
  }

  private buildTestCasesHtml(testCases: any[]): string {
    if (!testCases || testCases.length === 0) {
      return '<p>No test cases generated</p>';
    }

    let html = '';
    testCases.forEach((tc: any, index: number) => {
      html += `
        <div class="info-card" style="margin-bottom: 20px;">
          <h3>${tc.id}: ${tc.title}</h3>
          <p><strong>Type:</strong> ${tc.type} | <strong>Priority:</strong> ${tc.priority}</p>
          <ol>
            ${tc.steps.map((step: any) => `
              <li>
                <strong>Action:</strong> ${step.action}<br>
                <strong>Expected:</strong> ${step.expected}
              </li>
            `).join('')}
          </ol>
        </div>
      `;
    });

    return html;
  }

  private buildModifiedFilesHtml(gitlabChangesData: any): string {
    if (!gitlabChangesData.changes || gitlabChangesData.changes.length === 0) {
      return '<p>No files modified</p>';
    }

    let html = '<ul>';
    gitlabChangesData.changes.forEach((change: any) => {
      const icon = change.new_file ? '🆕' : change.deleted_file ? '❌' : '📝';
      html += `<li>${icon} <code>${change.new_path || change.old_path}</code></li>`;
    });
    html += '</ul>';
    return html;
  }

  private buildRootCauseHtml(jiraComments: any[]): string {
    if (!jiraComments || jiraComments.length === 0) {
      return '<p>No additional comments available</p>';
    }

    let html = '';
    jiraComments.forEach((comment: any) => {
      html += `
        <div class="info-card" style="margin-bottom: 15px;">
          <p><strong>${comment.author}</strong> - ${new Date(comment.created).toLocaleDateString()}</p>
          <p>${comment.body}</p>
        </div>
      `;
    });

    return html;
  }

  // Docker Methods

  private async listDockerContainers(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const all = Boolean(args.all ?? true);
    const containers = await this.dockerClient.listContainers({ all });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(containers, null, 2),
        },
      ],
    };
  }

  private async startDockerContainer(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const containerId = String(args.container_id);
    const container = this.dockerClient.getContainer(containerId);
    await container.start();

    return {
      content: [
        {
          type: "text",
          text: `Container ${containerId} started successfully`,
        },
      ],
    };
  }

  private async stopDockerContainer(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const containerId = String(args.container_id);
    const container = this.dockerClient.getContainer(containerId);
    await container.stop();

    return {
      content: [
        {
          type: "text",
          text: `Container ${containerId} stopped successfully`,
        },
      ],
    };
  }

  private async removeDockerContainer(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const containerId = String(args.container_id);
    const force = Boolean(args.force ?? false);
    const container = this.dockerClient.getContainer(containerId);
    await container.remove({ force });

    return {
      content: [
        {
          type: "text",
          text: `Container ${containerId} removed successfully`,
        },
      ],
    };
  }

  private async getDockerContainerLogs(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const containerId = String(args.container_id);
    const tail = Number(args.tail ?? 100);
    const container = this.dockerClient.getContainer(containerId);
    
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      follow: false,
    });

    return {
      content: [
        {
          type: "text",
          text: logs.toString(),
        },
      ],
    };
  }

  private async inspectDockerContainer(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const containerId = String(args.container_id);
    const container = this.dockerClient.getContainer(containerId);
    const info = await container.inspect();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  }

  private async listDockerImages(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const images = await this.dockerClient.listImages();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(images, null, 2),
        },
      ],
    };
  }

  private async pullDockerImage(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const imageName = String(args.image_name);
    const stream = await this.dockerClient.pull(imageName);

    // Wait for pull to complete
    await new Promise<void>((resolve, reject) => {
      this.dockerClient!.modem.followProgress(stream, (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return {
      content: [
        {
          type: "text",
          text: `Image ${imageName} pulled successfully`,
        },
      ],
    };
  }

  private async removeDockerImage(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const imageId = String(args.image_id);
    const force = Boolean(args.force ?? false);
    const image = this.dockerClient.getImage(imageId);
    await image.remove({ force });

    return {
      content: [
        {
          type: "text",
          text: `Image ${imageId} removed successfully`,
        },
      ],
    };
  }

  private async listDockerNetworks(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const networks = await this.dockerClient.listNetworks();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(networks, null, 2),
        },
      ],
    };
  }

  private async createDockerNetwork(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const name = String(args.name);
    const driver = String(args.driver ?? 'bridge');
    
    const network = await this.dockerClient.createNetwork({
      Name: name,
      Driver: driver,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ id: network.id, name }, null, 2),
        },
      ],
    };
  }

  private async removeDockerNetwork(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const networkId = String(args.network_id);
    const network = this.dockerClient.getNetwork(networkId);
    await network.remove();

    return {
      content: [
        {
          type: "text",
          text: `Network ${networkId} removed successfully`,
        },
      ],
    };
  }

  private async listDockerVolumes(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const volumes = await this.dockerClient.listVolumes();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(volumes.Volumes || [], null, 2),
        },
      ],
    };
  }

  private async createDockerVolume(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const name = String(args.name);
    const driver = String(args.driver ?? 'local');
    
    const volume = await this.dockerClient.createVolume({
      Name: name,
      Driver: driver,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ name: volume.Name }, null, 2),
        },
      ],
    };
  }

  private async removeDockerVolume(args: any) {
    if (!this.dockerClient) {
      throw new McpError(ErrorCode.InternalError, "Docker client not initialized.");
    }

    const name = String(args.name);
    const force = Boolean(args.force ?? false);
    const volume = this.dockerClient.getVolume(name);
    await volume.remove({ force });

    return {
      content: [
        {
          type: "text",
          text: `Volume ${name} removed successfully`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("QA Analysis MCP server running on stdio");
  }
}

const server = new QAAnalysisServer();
server.run().catch(console.error);
