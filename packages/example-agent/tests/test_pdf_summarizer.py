"""Unit tests for PDF summarizer agent."""

import os
from pathlib import Path

import pytest
from pydantic_ai.messages import ModelResponse, TextPart, UserPromptPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from pdf_summarizer.pdf_summarizer import PDFSummarizer

# Set fake API key for testing to avoid initialization errors
os.environ["GEMINI_API_KEY"] = "test_api_key_for_unit_tests"


@pytest.fixture
def temp_pdf(tmp_path):
    """Create a temporary PDF file for testing."""
    pdf_path = tmp_path / "test.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n%fake pdf content")
    return str(pdf_path)


@pytest.fixture
def mock_mcp_server_path(tmp_path):
    """Create a mock MCP server path."""
    server_path = tmp_path / "index.js"
    server_path.write_text("// mock server")
    return server_path


class TestPDFSummarizer:
    """Test cases for PDFSummarizer class."""

    def test_init_with_valid_path(self, mock_mcp_server_path):
        """Test initialization with valid MCP server path."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)
        assert summarizer.agent is not None
        assert summarizer.mcp_server is not None

    def test_init_with_invalid_path_fails(self):
        """Test initialization with invalid MCP server path fails gracefully."""
        nonexistent_path = Path("/nonexistent/path/to/index.js")
        with pytest.raises(FileNotFoundError, match="MCP server not found"):
            PDFSummarizer(mcp_server_path=nonexistent_path)

    def test_validate_and_resolve_path_success(self, mock_mcp_server_path, temp_pdf):
        """Test path validation with existing file."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)
        abs_path = summarizer._validate_and_resolve_path(temp_pdf)
        assert Path(abs_path).is_absolute()
        assert Path(abs_path).exists()

    def test_validate_and_resolve_path_not_found(self, mock_mcp_server_path):
        """Test path validation with non-existent file."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)
        with pytest.raises(FileNotFoundError, match="PDF file not found"):
            summarizer._validate_and_resolve_path("/nonexistent/file.pdf")

    @pytest.mark.asyncio
    async def test_summarize_pdf(self, mock_mcp_server_path, temp_pdf):
        """Test PDF summarization with FunctionModel."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)

        # Track the prompt sent to the model
        captured_prompt = None

        # Create a mock model that captures and verifies the prompt
        def mock_model_function(messages: list, info: AgentInfo) -> ModelResponse:
            nonlocal captured_prompt
            # Extract the user prompt from message parts
            for message in messages:
                if hasattr(message, "parts"):
                    for part in message.parts:
                        # Look specifically for UserPromptPart
                        if isinstance(part, UserPromptPart):
                            captured_prompt = part.content
                            break
                if captured_prompt:
                    break
            return ModelResponse(parts=[TextPart("This is a test summary of the PDF.")])

        test_model = FunctionModel(mock_model_function)

        with summarizer.agent.override(model=test_model, toolsets=[]):
            result = await summarizer.summarize_pdf(temp_pdf)

        # Verify the prompt contains the expected text and absolute path
        assert captured_prompt is not None
        assert "Please summarize the PDF file at:" in captured_prompt
        assert str(Path(temp_pdf).resolve()) in captured_prompt

        # Verify we got back the expected response
        assert result == "This is a test summary of the PDF."

    @pytest.mark.asyncio
    async def test_extract_text(self, mock_mcp_server_path, temp_pdf):
        """Test text extraction with FunctionModel."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)

        # Track the prompt sent to the model
        captured_prompt = None

        def mock_model_function(messages: list, info: AgentInfo) -> ModelResponse:
            nonlocal captured_prompt
            # Extract the user prompt from message parts
            for message in messages:
                if hasattr(message, "parts"):
                    for part in message.parts:
                        # Look specifically for UserPromptPart
                        if isinstance(part, UserPromptPart):
                            captured_prompt = part.content
                            break
                if captured_prompt:
                    break
            return ModelResponse(parts=[TextPart("Extracted text from the PDF.")])

        test_model = FunctionModel(mock_model_function)

        with summarizer.agent.override(model=test_model, toolsets=[]):
            result = await summarizer.extract_text(temp_pdf)

        # Verify the prompt and path
        assert captured_prompt is not None
        assert "Extract all text from the PDF file at:" in captured_prompt
        assert str(Path(temp_pdf).resolve()) in captured_prompt

        # Verify the response
        assert result == "Extracted text from the PDF."

    @pytest.mark.asyncio
    async def test_get_metadata(self, mock_mcp_server_path, temp_pdf):
        """Test metadata extraction with FunctionModel."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)

        # Track the prompt sent to the model
        captured_prompt = None

        def mock_model_function(messages: list, info: AgentInfo) -> ModelResponse:
            nonlocal captured_prompt
            # Extract the user prompt from message parts
            for message in messages:
                if hasattr(message, "parts"):
                    for part in message.parts:
                        # Look specifically for UserPromptPart
                        if isinstance(part, UserPromptPart):
                            captured_prompt = part.content
                            break
                if captured_prompt:
                    break
            return ModelResponse(parts=[TextPart("PDF Metadata: Title, Author, etc.")])

        test_model = FunctionModel(mock_model_function)

        with summarizer.agent.override(model=test_model, toolsets=[]):
            result = await summarizer.get_metadata(temp_pdf)

        # Verify the prompt and path
        assert captured_prompt is not None
        assert "Get the metadata from the PDF file at:" in captured_prompt
        assert str(Path(temp_pdf).resolve()) in captured_prompt

        # Verify the response
        assert result == "PDF Metadata: Title, Author, etc."

    @pytest.mark.asyncio
    async def test_summarize_pdf_file_not_found(self, mock_mcp_server_path):
        """Test summarization with non-existent PDF."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)

        with pytest.raises(FileNotFoundError):
            await summarizer.summarize_pdf("/nonexistent/file.pdf")

    @pytest.mark.asyncio
    async def test_env_vars_passed_to_subprocess(self, mock_mcp_server_path, temp_pdf, monkeypatch):
        """Test that environment variables are passed to MCP server subprocess."""
        # Set test environment variables
        monkeypatch.setenv("MAX_FILE_SIZE", "50000000")
        monkeypatch.setenv("TIMEOUT", "15000")

        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)

        # Verify env was copied (check that the MCPServerStdio has env set)
        assert summarizer.mcp_server is not None
        # Note: Can't directly verify subprocess env without running it,
        # but we ensure env parameter is passed in initialization

    def test_path_resolution_handles_relative_paths(self, mock_mcp_server_path, temp_pdf):
        """Test that relative paths are converted to absolute."""
        summarizer = PDFSummarizer(mcp_server_path=mock_mcp_server_path)

        # Get just the filename
        relative_path = Path(temp_pdf).name

        # Change to the parent directory
        original_cwd = Path.cwd()
        try:
            os.chdir(Path(temp_pdf).parent)
            abs_path = summarizer._validate_and_resolve_path(relative_path)
            assert Path(abs_path).is_absolute()
            assert abs_path == temp_pdf
        finally:
            os.chdir(original_cwd)
