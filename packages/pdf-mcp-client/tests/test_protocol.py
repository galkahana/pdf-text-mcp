"""Unit tests for MCPProtocol."""

from pdf_mcp_client.protocol import MCPProtocol


class TestMCPProtocol:
    """Tests for MCPProtocol class."""

    def test_create_request_basic(self):
        """Test create_request with basic parameters."""
        result = MCPProtocol.create_request(
            method="test/method",
            params={"key": "value"},
            request_id=123,
        )

        assert result == {
            "jsonrpc": "2.0",
            "id": 123,
            "method": "test/method",
            "params": {"key": "value"},
        }
        assert isinstance(result, dict)

    def test_create_request_default_id(self):
        """Test create_request uses default request_id=1."""
        result = MCPProtocol.create_request(
            method="test/method",
            params={},
        )

        assert result["id"] == 1

    def test_create_request_string_id(self):
        """Test create_request accepts string IDs."""
        result = MCPProtocol.create_request(
            method="test/method",
            params={},
            request_id="uuid-123",
        )

        assert result["id"] == "uuid-123"

    def test_create_request_empty_params(self):
        """Test create_request with empty params."""
        result = MCPProtocol.create_request(
            method="test/method",
            params={},
        )

        assert result["params"] == {}
        assert "jsonrpc" in result
        assert result["jsonrpc"] == "2.0"

    def test_create_request_complex_params(self):
        """Test create_request with complex nested params."""
        complex_params = {
            "nested": {
                "key1": "value1",
                "key2": [1, 2, 3],
                "key3": {"deep": "value"},
            },
            "list": [1, 2, 3],
            "bool": True,
            "null": None,
        }

        result = MCPProtocol.create_request(
            method="complex/method",
            params=complex_params,
        )

        assert result["params"] == complex_params

    def test_create_tool_call_request_basic(self):
        """Test create_tool_call_request with basic parameters."""
        result = MCPProtocol.create_tool_call_request(
            tool_name="extract_text",
            arguments={"fileContent": "base64string"},
            request_id=456,
        )

        assert result == {
            "jsonrpc": "2.0",
            "id": 456,
            "method": "tools/call",
            "params": {
                "name": "extract_text",
                "arguments": {"fileContent": "base64string"},
            },
        }

    def test_create_tool_call_request_default_id(self):
        """Test create_tool_call_request uses default request_id=1."""
        result = MCPProtocol.create_tool_call_request(
            tool_name="extract_metadata",
            arguments={},
        )

        assert result["id"] == 1

    def test_create_tool_call_request_extract_text(self):
        """Test create_tool_call_request for extract_text tool."""
        result = MCPProtocol.create_tool_call_request(
            tool_name="extract_text",
            arguments={"fileContent": "SGVsbG8gV29ybGQ="},
        )

        assert result["method"] == "tools/call"
        assert result["params"]["name"] == "extract_text"
        assert result["params"]["arguments"]["fileContent"] == "SGVsbG8gV29ybGQ="

    def test_create_tool_call_request_extract_metadata(self):
        """Test create_tool_call_request for extract_metadata tool."""
        result = MCPProtocol.create_tool_call_request(
            tool_name="extract_metadata",
            arguments={"fileContent": "cGRmIGNvbnRlbnQ="},
        )

        assert result["method"] == "tools/call"
        assert result["params"]["name"] == "extract_metadata"
        assert result["params"]["arguments"]["fileContent"] == "cGRmIGNvbnRlbnQ="

    def test_create_tool_call_request_empty_arguments(self):
        """Test create_tool_call_request with empty arguments."""
        result = MCPProtocol.create_tool_call_request(
            tool_name="test_tool",
            arguments={},
        )

        assert result["params"]["arguments"] == {}

    def test_create_tool_call_request_returns_typed_dict(self):
        """Test that returned request matches JSONRPCRequest type."""
        result = MCPProtocol.create_tool_call_request(
            tool_name="test",
            arguments={},
        )

        # Verify it has all required JSONRPCRequest fields
        assert "jsonrpc" in result
        assert "id" in result
        assert "method" in result
        assert "params" in result
        assert result["jsonrpc"] == "2.0"

    def test_create_request_method_variations(self):
        """Test create_request with different method names."""
        methods = [
            "tools/call",
            "tools/list",
            "resources/read",
            "custom/method",
            "nested/deep/method",
        ]

        for method in methods:
            result = MCPProtocol.create_request(method=method, params={})
            assert result["method"] == method

    def test_jsonrpc_version_always_2_0(self):
        """Test that jsonrpc version is always '2.0'."""
        result1 = MCPProtocol.create_request("method1", {})
        result2 = MCPProtocol.create_tool_call_request("tool1", {})

        assert result1["jsonrpc"] == "2.0"
        assert result2["jsonrpc"] == "2.0"
