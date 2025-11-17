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
import { createTunnel } from "tunnel-ssh";
import fs from "fs";

// Environment variables for credentials
const JIRA_URL = process.env.JIRA_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const GITLAB_URL = process.env.GITLAB_URL;
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const TESTRAIL_URL = process.env.TESTRAIL_URL;
const TESTRAIL_EMAIL = process.env.TESTRAIL_EMAIL;
const TESTRAIL_API_KEY = process.env.TESTRAIL_API_KEY;

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
};

/**
 * QA Analysis Server Class
 */
class QAAnalysisServer {
  private server: Server;
  private jiraClient?: AxiosInstance;
  private gitlabClient?: AxiosInstance;
  private testrailClient?: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "qa-analysis-server",
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
                enum: ["gateway", "evp_lt"],
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
                enum: ["gateway", "evp_lt"],
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
                enum: ["gateway", "evp_lt"],
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
                enum: ["gateway", "evp_lt"],
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
          case "query_database":
            return await this.queryDatabase(request.params.arguments);
          case "list_tables":
            return await this.listTables(request.params.arguments);
          case "describe_table":
            return await this.describeTable(request.params.arguments);
          case "get_table_data":
            return await this.getTableData(request.params.arguments);
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("QA Analysis MCP server running on stdio");
  }
}

const server = new QAAnalysisServer();
server.run().catch(console.error);
