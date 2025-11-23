# PDF Text MCP - Monorepo Root Commands
# Each package is independent and can be built/tested separately

# Define all packages in dependency order
packages := "pdf-parser mcp-server pdf-mcp-client example-agent-stdio example-agent-http"

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
    @echo "  just lint-all          - Lint all packages"
    @echo "  just format-all        - Format all packages"
    @echo "  just check-all         - Run all checks on all packages"
    @echo "  just clean-all         - Clean all packages"
    @echo "  just install-all       - Install dependencies for all packages"
    @echo "  just setup             - Install dependencies and build everything"
    @echo "  just doctor            - Check if required tools are installed"
    @echo ""
    @echo "Individual package commands:"
    @echo "  cd packages/<name> && just <command>"
    @echo ""
    @echo "Available commands per package:"
    @echo "  build, test, lint, format, clean, dev, check"

# Helper recipe to run a command on all packages
_run-on-all action verb success_msg:
    #!/usr/bin/env bash
    set -euo pipefail
    ROOT_DIR="{{justfile_directory()}}"
    echo "{{verb}} all packages..."
    for pkg in {{packages}}; do
        echo "==> $pkg"
        (cd "$ROOT_DIR/packages/$pkg" && just {{action}})
    done
    echo "✓ {{success_msg}}"

# Build all packages in dependency order
build-all:
    @just _run-on-all build "Building" "All packages built successfully"

# Test all packages
test-all:
    @just _run-on-all test "Testing" "All tests passed"

# Clean all packages
clean-all:
    @just _run-on-all clean "Cleaning" "All packages cleaned"

# Install dependencies for all packages
install-all:
    @just _run-on-all install "Installing dependencies for" "All dependencies installed"

# Lint all packages
lint-all:
    @just _run-on-all lint "Linting" "All packages linted"

# Format all packages
format-all:
    @just _run-on-all format "Formatting" "All packages formatted"

# Run all checks (lint, format-check, type-check, test) on all packages
check-all:
    @just _run-on-all check "Running all checks on" "All checks passed"

# Setup: install dependencies and build everything
setup: install-all build-all
    @echo "✓ Setup complete! All packages ready."

# Check if required tools are installed
doctor:
    @echo "Checking required tools..."
    @command -v node >/dev/null 2>&1 && echo "✓ node $(node --version)" || echo "✗ node not found"
    @command -v npm >/dev/null 2>&1 && echo "✓ npm $(npm --version)" || echo "✗ npm not found"
    @command -v cmake >/dev/null 2>&1 && echo "✓ cmake $(cmake --version | head -1)" || echo "✗ cmake not found"
    @command -v python3 >/dev/null 2>&1 && echo "✓ python $(python3 --version)" || echo "✗ python3 not found"
    @command -v uv >/dev/null 2>&1 && echo "✓ uv $(uv --version)" || echo "✗ uv not found (install from https://docs.astral.sh/uv/)"
    @command -v just >/dev/null 2>&1 && echo "✓ just $(just --version)" || echo "✗ just not found"
