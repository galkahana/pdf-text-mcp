"""MCP protocol helpers for JSON-RPC communication."""

from typing import Any, TypedDict


class JSONRPCRequest(TypedDict):
    """JSON-RPC 2.0 request structure."""

    jsonrpc: str
    id: int | str
    method: str
    params: dict[str, Any]


class JSONRPCResponse(TypedDict, total=False):
    """JSON-RPC 2.0 response structure."""

    jsonrpc: str
    id: int | str
    result: Any
    error: dict[str, Any]


class MCPProtocol:
    """Helper for constructing MCP protocol messages."""

    @staticmethod
    def create_request(
        method: str, params: dict[str, Any], request_id: int | str = 1
    ) -> JSONRPCRequest:
        """Create a JSON-RPC 2.0 request.

        Args:
            method: RPC method name (e.g., 'tools/call')
            params: Method parameters
            request_id: Request ID (default: 1)

        Returns:
            JSON-RPC request dict
        """
        return {"jsonrpc": "2.0", "id": request_id, "method": method, "params": params}

    @staticmethod
    def create_tool_call_request(
        tool_name: str, arguments: dict[str, Any], request_id: int | str = 1
    ) -> JSONRPCRequest:
        """Create a tools/call request.

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments
            request_id: Request ID

        Returns:
            JSON-RPC request for tools/call
        """
        return MCPProtocol.create_request(
            method="tools/call",
            params={"name": tool_name, "arguments": arguments},
            request_id=request_id,
        )
