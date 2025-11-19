# QA Analysis MCP Server

A comprehensive Model Context Protocol (MCP) server for QA workflow automation, integrating Jira, GitLab, TestRail, databases (MySQL & PostgreSQL), Docker, and browser automation to streamline quality assurance processes.

## Overview

This MCP server provides tools for:
- **Jira Analysis** - Analyze tickets, extract requirements, and parse acceptance criteria
- **GitLab Analysis** - Review merge requests and code changes
- **TestRail Integration** - Manage test cases, sections, suites, and test runs
- **MySQL Database Access** - Query multiple databases through SSH tunnels
- **PostgreSQL Support** - Infrastructure for PostgreSQL database queries
- **Docker Management** - Full container, image, network, and volume management (15 tools)
- **Markdown Conversion** - Convert Markdown to styled HTML
- **Test Generation** - Automatically generate test ideas and test cases

## Optional Companion Servers

Enhance your QA workflow with these complementary MCP servers:
- **Chrome DevTools MCP** - Browser automation and testing
- **Context7** - Up-to-date library and framework documentation (100+ libraries)

See the [Companion Servers](#companion-servers) section for setup instructions.

## Features

### 🎫 Jira Integration

#### Tools
- `analyze_jira_ticket` - Comprehensive ticket analysis including description, acceptance criteria, status, priority, and custom fields
- `analyze_jira_comments` - Extract and analyze all comments from a ticket for additional context
- `extract_jira_requirements` - Parse functional/non-functional requirements, acceptance criteria, user stories, and edge cases

**Example Usage:**
```
"Analyze ticket CORE-5534"
"Extract requirements from PROJ-123"
"Get comments from ticket DEV-456"
```

---

### 🔀 GitLab Integration

#### Tools
- `analyze_gitlab_mr` - Analyze merge request metadata (title, description, state, branches, labels)
- `analyze_gitlab_changes` - Detailed code change analysis with file diffs

**Example Usage:**
```
"Analyze merge request 123 in project group/project"
"Show changes in MR 456"
```

---

### 🧪 TestRail Integration

#### Test Suite Management
- `get_testrail_suites` - List all test suites in a project
- `get_testrail_sections` - Get all sections from a suite
- `create_testrail_section` - Create new section/folder (supports nested sections)

#### Test Case Management
- `get_testrail_test_cases` - Retrieve test cases from a suite
- `create_testrail_test_case` - Create new test cases with steps and expected results

#### Test Execution
- `get_testrail_test_run` - Get test run details
- `get_testrail_test_results` - Retrieve test results from a run

**Example Usage:**
```
"Get all sections from suite 14"
"Create section '5534' in suite 14 under Launch pad"
"List test cases from suite 15"
```

---

### 📝 Markdown to HTML Converter

Convert Markdown content to clean, styled HTML with optional CSS styling and sanitization.

#### Tool
- `convert_markdown_to_html` - Convert Markdown to HTML
  - **Required:** `markdown` - Markdown content to convert
  - **Optional:** `include_css` - Include GitHub-style CSS (default: false)
  - **Optional:** `sanitize` - Sanitize HTML output for security (default: true)

#### Features
- ✅ GitHub Flavored Markdown (GFM) support
- ✅ Tables, code blocks, lists, headers, links, images
- ✅ Basic HTML sanitization (removes scripts, event handlers)
- ✅ Optional GitHub-style CSS
- ✅ Line breaks conversion

**Example Usage:**
```
"Convert this markdown to HTML: # Hello\n\nThis is **bold**"
"Convert this markdown to HTML with CSS: ## Test\n- Item 1\n- Item 2"
```

---

### 🗄️ MySQL Database Integration

#### Supported Databases
1. **Gateway Database** (default)
   - Host: evpbank.dev.docker
   - Database: gateway
   - 609+ tables

2. **EVP_LT Database**
   - Host: mokejimai.dev.docker
   - Database: evp_lt
   - 7,609+ cities and payment data

#### Database Tools
- `query_database` - Execute SELECT queries (read-only)
  - Optional `database_name` parameter: `gateway` (default) or `evp_lt`
  - Auto-limits results (default: 100, max: 1000)
  
- `list_tables` - List all tables in a database
  - Optional `database_name` parameter
  
- `describe_table` - Get table structure (columns, indexes)
  - Optional `database_name` parameter
  
- `get_table_data` - Fetch data from a table with optional filtering
  - Optional `database_name` parameter
  - Optional `where` clause
  - Optional `limit` (default: 10, max: 1000)

#### SSH Tunnel Support
All database connections automatically route through an SSH tunnel for security:
- SSH Host: Configured remote server
- Uses private key authentication
- Auto-reconnects on errors

**Example Usage:**
```
"List tables in evp_lt database"
"Get first 10 cities from evp_lt"
"Query clients where id = 123 in gateway database"
"Describe table 'users' in gateway"
```

---

### 🐳 Docker Management (NEW)

Complete Docker operations for managing containers, images, networks, and volumes in your test environments.

#### Container Operations (6 tools)
- `list_docker_containers` - List all Docker containers
  - Optional `all` parameter to show stopped containers (default: true)
  
- `start_docker_container` - Start a stopped container
  - Required: `container_id` - Container ID or name
  
- `stop_docker_container` - Stop a running container
  - Required: `container_id` - Container ID or name
  
- `remove_docker_container` - Remove a container
  - Required: `container_id` - Container ID or name
  - Optional: `force` - Force removal of running container
  
- `get_docker_container_logs` - Get container logs
  - Required: `container_id` - Container ID or name
  - Optional: `tail` - Number of lines from end (default: 100)
  
- `inspect_docker_container` - Get detailed container information
  - Required: `container_id` - Container ID or name

#### Image Operations (3 tools)
- `list_docker_images` - List all Docker images
  
- `pull_docker_image` - Pull an image from registry
  - Required: `image_name` - Image name (e.g., nginx:latest)
  
- `remove_docker_image` - Remove a Docker image
  - Required: `image_id` - Image ID or name
  - Optional: `force` - Force removal

#### Network Operations (3 tools)
- `list_docker_networks` - List all Docker networks
  
- `create_docker_network` - Create a Docker network
  - Required: `name` - Network name
  - Optional: `driver` - Network driver (default: bridge)
  
- `remove_docker_network` - Remove a Docker network
  - Required: `network_id` - Network ID or name

#### Volume Operations (3 tools)
- `list_docker_volumes` - List all Docker volumes
  
- `create_docker_volume` - Create a Docker volume
  - Required: `name` - Volume name
  - Optional: `driver` - Volume driver (default: local)
  
- `remove_docker_volume` - Remove a Docker volume
  - Required: `name` - Volume name
  - Optional: `force` - Force removal

**Example Usage:**
```
"List all docker containers"
"Start container my-test-db"
"Get logs from container nginx-server tail 50"
"Pull docker image postgres:15"
"List all docker networks"
"Create docker volume test-data"
```

---

### 🐘 PostgreSQL Support (NEW)

Infrastructure ready for PostgreSQL database operations.

#### Current Status
- ✅ PostgreSQL client library installed (`pg`)
- ✅ Environment variables configured
- ✅ Connection pool setup ready
- ⏳ Query tools can be added following MySQL pattern

#### Configuration
Add these environment variables to enable PostgreSQL:

```bash
POSTGRES_HOST=localhost          # PostgreSQL server host
POSTGRES_PORT=5432              # PostgreSQL server port (default: 5432)
POSTGRES_DATABASE=your_db        # Database name
POSTGRES_USER=your_user          # Database user
POSTGRES_PASSWORD=your_password  # Database password
```

#### Future Capabilities (When Implemented)
- Execute SELECT queries (read-only)
- List tables and schemas
- Describe table structures
- Fetch table data with filtering

**Note:** PostgreSQL query tools can be implemented following the same pattern as MySQL tools in `src/index.ts`.

---

### 🤖 Test Generation

#### Tools
- `analyze_test_plan` - Extract test plan from Jira or GitLab
- `generate_test_ideas` - Generate test ideas from Jira ticket + GitLab MR
  - Functional tests
  - Edge case tests
  - Integration tests
  - Regression tests
  - Optional: Security & Performance tests (with focus_areas parameter)
  
- `generate_test_cases` - Convert test ideas into detailed test cases
  - Supports: functional, integration, regression, smoke, or all types

**Example Usage:**
```
"Generate test ideas for CORE-5534 and MR 789"
"Create functional test cases for ticket PROJ-123"
```

---

## Installation & Setup

### Prerequisites

Before installing the QA Analysis MCP Server, ensure you have:

**Required:**
- ✅ **Node.js 16+** and **npm** installed
- ✅ Access to company instances:
  - Jira
  - GitLab  
  - TestRail

**Optional (for database features):**
- ✅ SSH access to remote server
- ✅ SSH private key configured
- ✅ MySQL database credentials

**Check Node.js version:**
```bash
node --version  # Should be 16.0.0 or higher
npm --version
```

---

### Step-by-Step Installation

#### 1️⃣ Clone or Download the Repository

```bash
# Navigate to your projects directory
cd ~/Documents/Cline/MCP

# If cloning from repository
git clone <repository-url> qa-analysis-server
cd qa-analysis-server

# Or if you already have it
cd qa-analysis-server
```

#### 2️⃣ Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `@modelcontextprotocol/sdk` - MCP server framework
- `axios` - HTTP client for API calls
- `mysql2` - MySQL database driver
- `pg` - PostgreSQL database driver
- `dockerode` - Docker API client
- `marked` - Markdown parser
- `tunnel-ssh` - SSH tunneling support

#### 3️⃣ Obtain API Credentials

**Jira API Token:**
1. Log in to Jira: https://jira.paysera.net
2. Go to **Profile** → **Personal Access Tokens** or **API Tokens**
3. Click **Create API Token**
4. Copy and save the token securely

**GitLab Personal Access Token:**
1. Log in to GitLab: https://gitlab.paysera.net
2. Go to **Preferences** → **Access Tokens**
3. Create token with scopes: `api`, `read_api`, `read_repository`
4. Copy and save the token

**TestRail API Key:**
1. Log in to TestRail: https://testrail.paysera.net
2. Go to **My Settings** → **API Keys**
3. Click **Add Key**
4. Copy and save the API key

#### 4️⃣ Configure SSH Key (For Database Access)

If you're using database features with SSH tunnel:

**Check existing SSH key:**
```bash
ls -la ~/.ssh/
# Look for id_rsa or id_rsa_ubuntu_remote
```

**Set correct permissions:**
```bash
chmod 600 ~/.ssh/id_rsa_ubuntu_remote
chmod 700 ~/.ssh
```

**Test SSH connection:**
```bash
ssh -i ~/.ssh/id_rsa_ubuntu_remote ubuntu@10.3.6.155
# Should connect without password
```

#### 5️⃣ Configure Environment Variables

You have two options:

**Option A: Using Cline MCP Settings (Recommended)**

Edit the Cline MCP settings file directly:

**MacOS:**
```bash
code ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

See the [MCP Configuration](#mcp-configuration) section below for the complete JSON structure.

**Option B: Using .env File (For Testing)**

Create a `.env` file in the project root:

```bash
# Jira Configuration
JIRA_URL=https://jira.paysera.net
JIRA_EMAIL=your.email@paysera.com
JIRA_API_TOKEN=your_jira_api_token_here

# GitLab Configuration
GITLAB_URL=https://gitlab.paysera.net
GITLAB_TOKEN=glpat-your_gitlab_token_here

# TestRail Configuration
TESTRAIL_URL=https://testrail.paysera.net
TESTRAIL_EMAIL=your.email@paysera.com
TESTRAIL_API_KEY=your_testrail_api_key_here

# MySQL Gateway Database
MYSQL_HOST=evpbank.dev.docker
MYSQL_PORT=3306
MYSQL_DATABASE=gateway
MYSQL_USER=app
MYSQL_PASSWORD=pass

# MySQL EVP_LT Database (Optional)
EVP_LT_HOST=mokejimai.dev.docker
EVP_LT_PORT=3306
EVP_LT_DATABASE=evp_lt
EVP_LT_USER=app
EVP_LT_PASSWORD=pass

# SSH Tunnel Configuration (Required for databases)
USE_SSH_TUNNEL=true
SSH_HOST=10.3.6.155
SSH_PORT=22
SSH_USER=ubuntu
SSH_KEY_PATH=/Users/your-username/.ssh/id_rsa_ubuntu_remote
```

#### 6️⃣ Build the Server

```bash
npm run build
```

Expected output:
```
> QA-Core@0.1.0 build
> tsc && node -e "require('fs').chmodSync('build/index.js', '755')"
```

This compiles TypeScript to JavaScript in the `build/` directory.

#### 7️⃣ Configure MCP Client (Cline or Claude Desktop)

See the detailed [MCP Configuration](#mcp-configuration) section below.

#### 8️⃣ Verify Installation

**Option 1: Using MCP Inspector (Recommended for testing)**
```bash
npm run inspector
```
- Opens a browser-based debugging interface
- Test individual tools without an MCP client
- Verify credentials are working

**Option 2: Restart Cline MCP Servers**
1. Open VSCode Command Palette (`Cmd+Shift+P` on Mac)
2. Type: `Cline: Restart MCP Servers`
3. Check logs for any errors

**Option 3: Test with Cline**

Once configured, test with simple commands:
```
"Get all test suites from TestRail project 14"
"List tables in gateway database"
"Analyze Jira ticket CORE-5534"
```

---

### Development Mode

For active development with auto-rebuild on file changes:

```bash
npm run watch
```

This runs TypeScript compiler in watch mode - any changes to `.ts` files will automatically rebuild.

---

### Quick Setup Scripts

**Complete Clean Setup:**
```bash
#!/bin/bash
cd ~/Documents/Cline/MCP/qa-analysis-server
rm -rf node_modules build
npm install
npm run build
echo "✅ Setup complete!"
```

**Rebuild Only:**
```bash
#!/bin/bash
cd ~/Documents/Cline/MCP/qa-analysis-server
rm -rf build
npm run build
echo "✅ Rebuild complete!"
```

---

### Verification Checklist

After installation, verify:

- [ ] `build/index.js` file exists and is executable
- [ ] All API credentials are correctly configured
- [ ] SSH key has correct permissions (600)
- [ ] SSH connection to database server works
- [ ] MCP client configuration file updated
- [ ] MCP servers restarted
- [ ] At least one tool works successfully

---

### Common Setup Issues

**Issue: SSH Permission Denied**
```bash
# Fix permissions
chmod 600 ~/.ssh/id_rsa_ubuntu_remote
chmod 700 ~/.ssh

# Test connection
ssh -i ~/.ssh/id_rsa_ubuntu_remote ubuntu@10.3.6.155
```

**Issue: Build fails with TypeScript errors**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Issue: MCP server not showing in Cline**
- Check JSON syntax in `cline_mcp_settings.json`
- Verify file path in `args` array is absolute
- Restart VSCode completely
- Check Cline output logs for errors

**Issue: API authentication fails**
- Verify tokens haven't expired
- Check URLs don't have trailing slashes
- Confirm email addresses match account emails
- Test tokens in Postman/curl first

---

### Installation Variants

**Minimal Installation (Jira + GitLab Only):**
- Skip database environment variables
- Set `USE_SSH_TUNNEL=false` or omit SSH configuration
- Only configure JIRA and GITLAB credentials

**Full Installation (All Features):**
- Configure all services (Jira, GitLab, TestRail)
- Set up both databases (gateway and evp_lt)
- Configure SSH tunnel

**Development Installation:**
- Install in development directory
- Use `.env` file for credentials
- Run with `npm run watch`
- Use MCP Inspector for testing

---

## MCP Configuration

### For Cline (VSCode Extension)

Add to MCP settings file:

**MacOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "qa-analysis-server": {
      "command": "node",
      "args": ["/path/to/qa-analysis-server/build/index.js"],
      "env": {
        "JIRA_URL": "https://jira.paysera.net",
        "JIRA_EMAIL": "your.email@company.com",
        "JIRA_API_TOKEN": "your_token",
        "GITLAB_URL": "https://gitlab.paysera.net",
        "GITLAB_TOKEN": "your_gitlab_token",
        "TESTRAIL_URL": "https://testrail.paysera.net",
        "TESTRAIL_EMAIL": "your.email@company.com",
        "TESTRAIL_API_KEY": "your_key",
        "MYSQL_HOST": "evpbank.dev.docker",
        "MYSQL_PORT": "3306",
        "MYSQL_DATABASE": "gateway",
        "MYSQL_USER": "app",
        "MYSQL_PASSWORD": "pass",
        "EVP_LT_HOST": "mokejimai.dev.docker",
        "EVP_LT_PORT": "3306",
        "EVP_LT_DATABASE": "evp_lt",
        "EVP_LT_USER": "app",
        "EVP_LT_PASSWORD": "pass",
        "USE_SSH_TUNNEL": "true",
        "SSH_HOST": "10.3.6.155",
        "SSH_PORT": "22",
        "SSH_USER": "ubuntu",
        "SSH_KEY_PATH": "/path/to/.ssh/id_rsa"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### For Claude Desktop

**MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "qa-analysis-server": {
      "command": "node",
      "args": ["/path/to/qa-analysis-server/build/index.js"],
      "env": {
        "JIRA_URL": "https://jira.company.com",
        "JIRA_EMAIL": "your.email@company.com",
        "JIRA_API_TOKEN": "your_token",
        "GITLAB_URL": "https://gitlab.company.com",
        "GITLAB_TOKEN": "your_token",
        "TESTRAIL_URL": "https://testrail.company.com",
        "TESTRAIL_EMAIL": "your.email@company.com",
        "TESTRAIL_API_KEY": "your_key"
      }
    }
  }
}
```

---

## Tool Reference

### Jira Tools
| Tool | Required Parameters | Optional Parameters | Description |
|------|-------------------|-------------------|-------------|
| `analyze_jira_ticket` | `ticket_key` | - | Full ticket analysis |
| `analyze_jira_comments` | `ticket_key` | - | Get all comments |
| `extract_jira_requirements` | `ticket_key` | - | Parse requirements |

### GitLab Tools
| Tool | Required Parameters | Optional Parameters | Description |
|------|-------------------|-------------------|-------------|
| `analyze_gitlab_mr` | `project_id`, `mr_iid` | - | MR metadata analysis |
| `analyze_gitlab_changes` | `project_id`, `mr_iid` | - | Code changes with diffs |

### TestRail Tools
| Tool | Required Parameters | Optional Parameters | Description |
|------|-------------------|-------------------|-------------|
| `get_testrail_suites` | - | `project_id` (default: 14) | List all suites |
| `get_testrail_sections` | `suite_id` | `project_id` (default: 14) | Get sections |
| `create_testrail_section` | `suite_id`, `name` | `parent_id`, `project_id` | Create section |
| `get_testrail_test_cases` | `suite_id` | `project_id` | List test cases |
| `create_testrail_test_case` | `section_id`, `title`, `steps` | `priority` | Create test case |
| `get_testrail_test_run` | `run_id` | - | Get run details |
| `get_testrail_test_results` | `run_id` | - | Get test results |

### Database Tools
| Tool | Required Parameters | Optional Parameters | Description |
|------|-------------------|-------------------|-------------|
| `query_database` | `query` | `database_name`, `limit` | Execute SELECT query |
| `list_tables` | - | `database_name` | List all tables |
| `describe_table` | `table_name` | `database_name` | Table structure |
| `get_table_data` | `table_name` | `database_name`, `limit`, `where` | Fetch table data |

**Database Options:**
- `database_name`: `gateway` (default) or `evp_lt`

### Test Generation Tools
| Tool | Required Parameters | Optional Parameters | Description |
|------|-------------------|-------------------|-------------|
| `analyze_test_plan` | `source`, `identifier` | - | Extract test plan |
| `generate_test_ideas` | `jira_ticket_key`, `gitlab_project_id`, `gitlab_mr_iid` | `focus_areas` | Generate test ideas |
| `generate_test_cases` | `jira_ticket_key`, `gitlab_project_id`, `gitlab_mr_iid` | `test_type` | Generate test cases |

### Markdown Converter Tools
| Tool | Required Parameters | Optional Parameters | Description |
|------|-------------------|-------------------|-------------|
| `convert_markdown_to_html` | `markdown` | `include_css`, `sanitize` | Convert Markdown to HTML |

**Options:**
- `include_css`: `true` or `false` (default: false) - Include GitHub-style CSS
- `sanitize`: `true` or `false` (default: true) - Sanitize HTML output

### Docker Tools (NEW)
| Tool | Required Parameters | Optional Parameters | Description |
|------|-------------------|-------------------|-------------|
| `list_docker_containers` | - | `all` | List all containers |
| `start_docker_container` | `container_id` | - | Start a container |
| `stop_docker_container` | `container_id` | - | Stop a container |
| `remove_docker_container` | `container_id` | `force` | Remove a container |
| `get_docker_container_logs` | `container_id` | `tail` | Get container logs |
| `inspect_docker_container` | `container_id` | - | Inspect container details |
| `list_docker_images` | - | - | List all images |
| `pull_docker_image` | `image_name` | - | Pull an image |
| `remove_docker_image` | `image_id` | `force` | Remove an image |
| `list_docker_networks` | - | - | List all networks |
| `create_docker_network` | `name` | `driver` | Create a network |
| `remove_docker_network` | `network_id` | - | Remove a network |
| `list_docker_volumes` | - | - | List all volumes |
| `create_docker_volume` | `name` | `driver` | Create a volume |
| `remove_docker_volume` | `name` | `force` | Remove a volume |

---

## Companion Servers

These optional MCP servers run separately but complement qa-analysis-mcp for enhanced QA workflows.

### 🌐 Chrome DevTools MCP Server

**Purpose:** Browser automation and testing via Chrome DevTools Protocol

**Installation:** Already included! Wrapper script created at:
```bash
/Users/employee/Documents/Cline/MCP/qa-analysis-mcp/bin/chrome-devtools-wrapper.sh
```

**Configuration:**
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "/path/to/qa-analysis-mcp/bin/chrome-devtools-wrapper.sh",
      "args": []
    }
  }
}
```

**Features:**
- ✅ Browser automation (navigate, click, type)
- ✅ Screenshot capture
- ✅ JavaScript execution in browser context
- ✅ Network monitoring and interception
- ✅ Performance profiling
- ✅ Console log capture

**Usage Examples:**
```
"Navigate to https://example.com and take a screenshot"
"Click the login button on the current page"
"Monitor network requests on this page"
```

**Requirements:**
- Node.js 18+ and npm/npx
- Chrome or Chromium browser

**Documentation:** See `CHROME_DEVTOOLS_IMPLEMENTATION_SUMMARY.md` in the Notes directory

---

### 📚 Context7 Documentation Server

**Purpose:** Fetch up-to-date library and framework documentation (100+ libraries)

**Installation Options:**

**Option 1: NPX-based (Simple)**
```bash
# Create wrapper script
cat > /path/to/qa-analysis-mcp/bin/context7-wrapper.sh << 'EOF'
#!/bin/bash
exec npx -y @upstash/context7-mcp@latest
EOF

chmod +x /path/to/qa-analysis-mcp/bin/context7-wrapper.sh
```

**Option 2: Hosted Endpoint (Claude Code only)**
```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

**Option 3: Local Build**
```bash
cd ~/Documents/Cline/MCP
git clone https://github.com/upstash/context7.git
cd context7
npm install
npm run build
```

**Configuration:**
```json
{
  "mcpServers": {
    "context7": {
      "command": "node",
      "args": ["/path/to/context7/dist/index.js"]
    }
  }
}
```

**Features:**
- ✅ Up-to-date library documentation (not year-old training data)
- ✅ Version-specific docs
- ✅ No API keys required
- ✅ 100+ supported libraries (React, Next.js, Vue, Express, PostgreSQL, etc.)
- ✅ Topic filtering

**Usage Examples:**
```
"Get React hooks documentation use context7"
"Show me Next.js routing examples use context7"
"Get PostgreSQL indexing docs use context7"
```

**Documentation:** See `CONTEXT7_INTEGRATION_GUIDE.md` in the Notes directory

---

### Complete MCP Setup Example

**For maximum QA productivity, run all three servers together:**

```json
{
  "mcpServers": {
    "qa-analysis-mcp": {
      "command": "node",
      "args": ["/path/to/qa-analysis-mcp/build/index.js"],
      "env": {
        "JIRA_URL": "https://jira.company.com",
        "GITLAB_URL": "https://gitlab.company.com",
        "TESTRAIL_URL": "https://testrail.company.com",
        "MYSQL_HOST": "db.company.com",
        "POSTGRES_HOST": "postgres.company.com"
      }
    },
    "chrome-devtools": {
      "command": "/path/to/qa-analysis-mcp/bin/chrome-devtools-wrapper.sh",
      "args": []
    },
    "context7": {
      "command": "node",
      "args": ["/path/to/context7/dist/index.js"]
    }
  }
}
```

**This gives you:**
- ✅ QA workflow automation (Jira, GitLab, TestRail)
- ✅ Database queries (MySQL, PostgreSQL)
- ✅ Docker management
- ✅ Browser automation (Chrome DevTools)
- ✅ Library documentation (Context7)

---

## Security

- **Read-Only Database Access:** All database queries are restricted to SELECT statements only
- **SSH Tunneling:** Database connections use SSH tunnels with private key authentication
- **Input Sanitization:** Table names are validated to prevent SQL injection
- **API Authentication:** All API clients use token-based authentication
- **No Credentials in Code:** All sensitive data is stored in environment variables

---

## Debugging

Since MCP servers communicate over stdio, use the MCP Inspector for debugging:

```bash
npm run inspector
```

The Inspector provides a web-based interface for testing tools and viewing responses.

---

## Use Cases

### QA Workflow Automation
1. Analyze Jira ticket for requirements
2. Review GitLab MR code changes
3. Generate comprehensive test ideas
4. Create test cases in TestRail
5. Query database to verify data

### Example Workflow
```
1. "Analyze Jira ticket CORE-5534"
2. "Show changes in GitLab MR 789 for project paysera/backend"
3. "Generate test ideas for CORE-5534 and MR 789"
4. "Create section '5534' in TestRail suite 14"
5. "Query gateway database for client with id 123"
```

---

## Troubleshooting

### Database Connection Issues
- Verify SSH key path and permissions (chmod 600)
- Check SSH host accessibility
- Confirm database credentials
- Ensure USE_SSH_TUNNEL is set correctly

### API Authentication Errors
- Verify API tokens are valid and not expired
- Check URL configurations (no trailing slashes)
- Confirm user has necessary permissions

### Build Errors
```bash
# Clean build
rm -rf build/
npm run build
```

---

## GitHub & Version Control

### 🔒 Security - Protected Files

This repository includes security measures to prevent credential exposure:

**Files in `.gitignore` (Never committed):**
```
❌ .env                          # Your actual credentials
❌ node_modules/                 # npm packages
❌ build/                        # Compiled output
❌ cline_mcp_settings.json       # MCP config with credentials
❌ *.log                         # Log files
❌ *.key, *.pem, id_rsa*        # SSH keys
```

**Example files (Safe to commit):**
```
✅ .env.example                  # Credential template
✅ cline_mcp_settings.example.json  # MCP config template
✅ src/                          # Source code
✅ package.json                  # Dependencies list
✅ README.md                     # Documentation
```

---

### 📤 Uploading to GitHub

**Before pushing to GitHub:**

```bash
# 1. Navigate to project
cd ~/Documents/Cline/MCP/qa-analysis-server

# 2. Verify .gitignore is working
git status
git check-ignore -v .env
git check-ignore -v build/

# 3. Ensure no credentials are tracked
git ls-files | grep -E "(\.env$|credentials|secrets)"
# Should return nothing

# 4. Safe to commit and push
git add .
git commit -m "Initial commit"
git push
```

**⚠️ Important:** Your real credentials are stored in:
- **MacOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- This file is **outside** the project directory and **not** tracked by Git

---

### 👥 For New Users (After Cloning)

When someone clones this repository, they need to:

**1. Install dependencies:**
```bash
npm install
```

**2. Configure credentials (choose one method):**

**Method A: Using .env file (for testing)**
```bash
cp .env.example .env
nano .env  # Edit with real credentials
```

**Method B: Using Cline MCP settings (production)**
```bash
# Edit Cline settings file
code ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json

# Use cline_mcp_settings.example.json as reference
# Replace placeholder values with real credentials
```

**3. Build the server:**
```bash
npm run build
```

**4. Restart MCP servers** in VSCode/Cline

---

## Contributing

### Contribution Guidelines

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow existing code style
   - Add TypeScript types
   - Update documentation
4. **Test thoroughly**
   ```bash
   npm run build
   npm run inspector  # Test with MCP Inspector
   ```
5. **Commit with clear messages**
   ```bash
   git commit -m "feat: Add new feature description"
   ```
6. **Submit a pull request**

### 🔐 Security Best Practices

- ✅ Never commit credentials or API tokens
- ✅ Use `.env.example` for credential templates
- ✅ Keep `.gitignore` updated
- ✅ Review `git diff` before committing
- ✅ Use environment variables for sensitive data
- ❌ Don't hardcode credentials in source code
- ❌ Don't commit `.env` files
- ❌ Don't commit SSH keys

---

## Project File Structure

```
qa-analysis-server/
├── src/
│   └── index.ts                 # Main server implementation
├── build/                       # Compiled JavaScript (ignored)
├── node_modules/                # Dependencies (ignored)
├── .env                         # Your credentials (ignored)
├── .env.example                 # Credential template ✅
├── .gitignore                   # Git ignore rules ✅
├── cline_mcp_settings.example.json  # MCP config template ✅
├── package.json                 # Project metadata ✅
├── tsconfig.json                # TypeScript config ✅
└── README.md                    # This file ✅
```

**Legend:**
- ✅ = Safe to commit to Git
- (ignored) = Listed in .gitignore

---

## License

Internal use only - Paysera QA Team

---

## Support

For issues or questions, contact the QA-Core team.

**Version:** 0.2.0  
**Last Updated:** 2025-11-19  
**Repository:** https://github.com/alexpeykov/qa-analysis-mpc

**Latest Changes:**
- ✅ Added Docker Management (15 tools for containers, images, networks, volumes)
- ✅ Added PostgreSQL Support (infrastructure ready)
- ✅ Added Chrome DevTools MCP Server integration (browser automation)
- ✅ Added Context7 Documentation Server guide (100+ library docs)
- ✅ Updated dependencies (dockerode, pg, marked)
