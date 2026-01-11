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
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"health_check","arguments":{}}}
EOF

echo ""
echo "=== List Profiles ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_profiles","arguments":{}}}
EOF

echo ""
echo "=== Get Coding Standards (default profile) ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_coding_standards","arguments":{"profile":"default"}}}
EOF

echo ""
echo "=== Get Architecture Guidelines ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_architecture_guidelines","arguments":{"profile":"default"}}}
EOF

echo ""
echo "=== Get Naming Conventions ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_naming_conventions","arguments":{"profile":"default"}}}
EOF

echo ""
echo "=== Search Standards (kafka) ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"search_standards","arguments":{"query":"kafka"}}}
EOF

echo ""
echo "=== Search Standards (testing) ==="
cat << 'EOF'
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"search_standards","arguments":{"query":"testing"}}}
EOF

# ============================================
# Running the server interactively
# ============================================

echo ""
echo "=== To run the server interactively ==="
echo "npm run dev"
echo ""
echo "Then paste JSON-RPC messages to stdin"
