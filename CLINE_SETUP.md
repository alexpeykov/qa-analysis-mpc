# Cline MCP Setup Instructions

Your MCP servers have been configured! Follow these simple steps to add them to Cline.

## Recommended Method: Use Cline UI (Easy!)

1. **Open VS Code** with Cline extension installed

2. **Open Cline** (click the Cline icon in the sidebar)

3. **Click "MCP Servers"** button in the top navigation bar

4. **Click "Configure MCP Servers"** (or "Edit MCP Settings")
   - This will open the `cline_mcp_settings.json` file

5. **Copy & Paste** the content from generated file

   Open the file `cline_mcp_settings.json` in the project directory.

6. **⚠️  IMPORTANT: Preserve Existing Servers**
   - If you already have MCP servers configured in Cline, BE CAREFUL!
   - DO NOT overwrite the entire file if you have existing servers!
   - Instead: Copy each server entry ONE BY ONE from the generated file
   - Add them carefully to your existing `mcpServers` object
   - This is YOUR responsibility to not lose existing configuration!

7. **Save** the file (Ctrl+S / Cmd+S)

8. **Restart VS Code** for changes to take effect

9. **Verify**: Open Cline → Click "MCP Servers" → You should see your servers listed!

## Configured Servers

The following MCP servers have been configured for you:

- **TestRail MCP Server** (`testrail`)


## Troubleshooting

**Servers don't appear?**
- Make sure Cline extension is installed and enabled
- Restart VS Code completely (close all windows)
- Check that you saved the settings file after pasting
- Open Cline settings again to verify the content was saved correctly

**Can't find "Configure MCP Servers" button?**
- Update Cline extension to the latest version
- Look for "MCP Servers" icon in Cline's top navigation bar
- Alternative: Manually navigate to the settings file location above
