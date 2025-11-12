# PDF Text MCP - Monorepo Root Commands
# Each package is independent and can be built/tested separately

# List all available packages
list:
    @echo "Available packages:"
    @ls -1 packages/ | sed 's/^/  - /'

# Show help for all commands
help:
    @echo "PDF Text MCP Monorepo Commands"
    @echo ""
    @echo "Common commands:"
    @echo "  just list              - List all packages"
    @echo "  just build-all         - Build all packages"
    @echo "  just test-all          - Test all packages"
    @echo "  just clean-all         - Clean all packages"
    @echo "  just install-all       - Install dependencies for all packages"
    @echo ""
    @echo "Individual package commands:"
    @echo "  cd packages/<name> && just <command>"
    @echo ""
    @echo "Available commands per package:"
    @echo "  build, test, lint, format, clean, dev"

# Build all packages in dependency order
build-all:
    @echo "Building all packages..."
    @echo "==> pdf-parser"
    cd packages/pdf-parser && just build
    @echo "==> mcp-server"
    cd packages/mcp-server && just build
    @echo "==> example-agent (no build needed)"
    @echo "✓ All packages built successfully"

# Test all packages
test-all:
    @echo "Testing all packages..."
    @echo "==> pdf-parser"
    cd packages/pdf-parser && just test
    @echo "==> mcp-server"
    cd packages/mcp-server && just test
    @echo "==> example-agent"
    cd packages/example-agent && just test
    @echo "✓ All tests passed"

# Run all checks (lint, format, type-check, test) for all packages
check-all:
    @echo "Running checks on all packages..."
    @echo "==> pdf-parser"
    cd packages/pdf-parser && just test
    @echo "==> mcp-server"
    cd packages/mcp-server && just check
    @echo "==> example-agent"
    cd packages/example-agent && just check
    @echo "✓ All checks passed"

# Clean all packages
clean-all:
    @echo "Cleaning all packages..."
    @echo "==> pdf-parser"
    cd packages/pdf-parser && just clean
    @echo "==> mcp-server"
    cd packages/mcp-server && just clean
    @echo "==> example-agent"
    cd packages/example-agent && just clean
    @echo "✓ All packages cleaned"

# Install dependencies for all packages
install-all:
    @echo "Installing dependencies for all packages..."
    @echo "==> pdf-parser"
    cd packages/pdf-parser && just install
    @echo "==> mcp-server"
    cd packages/mcp-server && just install
    @echo "==> example-agent"
    cd packages/example-agent && just install
    @echo "✓ All dependencies installed"

# Setup: install dependencies and build everything
setup: install-all build-all
    @echo "✓ Setup complete! All packages ready."

# Run the complete demo (build everything and run example agent)
demo: build-all
    @echo "Running demo..."
    cd packages/example-agent && just demo

# Check if required tools are installed
doctor:
    @echo "Checking required tools..."
    @command -v node >/dev/null 2>&1 && echo "✓ node $(node --version)" || echo "✗ node not found"
    @command -v npm >/dev/null 2>&1 && echo "✓ npm $(npm --version)" || echo "✗ npm not found"
    @command -v cmake >/dev/null 2>&1 && echo "✓ cmake $(cmake --version | head -1)" || echo "✗ cmake not found"
    @command -v python3 >/dev/null 2>&1 && echo "✓ python $(python3 --version)" || echo "✗ python3 not found"
    @command -v uv >/dev/null 2>&1 && echo "✓ uv $(uv --version)" || echo "✗ uv not found (install from https://docs.astral.sh/uv/)"
    @command -v just >/dev/null 2>&1 && echo "✓ just $(just --version)" || echo "✗ just not found"
