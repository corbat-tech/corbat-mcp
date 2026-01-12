#!/bin/bash
# Corbat MCP - curl examples for testing
# Note: MCP uses JSON-RPC over stdio. These examples show the message format.

# ============================================
# Using the MCP server via stdio
# ============================================

# The MCP server communicates via stdin/stdout using JSON-RPC.
# Here are example messages you can send:

echo "=== Health Check ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"health","arguments":{}}}
EOF

echo ""
echo "=== List Profiles ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"profiles","arguments":{}}}
EOF

echo ""
echo "=== Get Context (Primary Tool) ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_context","arguments":{"task":"Create a payment service"}}}
EOF

echo ""
echo "=== Get Context with Project Directory ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_context","arguments":{"task":"Fix authentication bug","project_dir":"/path/to/your/project"}}}
EOF

echo ""
echo "=== Validate Code ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"validate","arguments":{"code":"public class UserService {\n  public void createUser(String name) {\n    // TODO: implement\n  }\n}"}}}
EOF

echo ""
echo "=== Validate Code with Task Type ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"validate","arguments":{"code":"@Test void shouldCreateUser() { }","task_type":"test"}}}
EOF

echo ""
echo "=== Search Standards (kafka) ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"search","arguments":{"query":"kafka"}}}
EOF

echo ""
echo "=== Search Standards (testing) ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"search","arguments":{"query":"testing"}}}
EOF

echo ""
echo "=== Search Standards (docker) ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"search","arguments":{"query":"docker"}}}
EOF

# ============================================
# Running the server interactively
# ============================================

echo ""
echo "=== To run the server interactively ==="
echo "node dist/index.js"
echo ""
echo "Then paste JSON-RPC messages to stdin"
echo ""
echo "=== Available Tools (5) ==="
echo "  get_context  - PRIMARY: Get all standards for a task"
echo "  validate     - Check code against standards"
echo "  search       - Search documentation"
echo "  profiles     - List available profiles"
echo "  health       - Server status"
