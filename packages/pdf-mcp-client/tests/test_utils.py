"""Unit tests for PDFUtils."""

import base64
from pathlib import Path

import pytest

from pdf_mcp_client.utils import PDFUtils


class TestPDFUtils:
    """Tests for PDFUtils class."""

    def test_validate_pdf_path_valid_pdf(self, tmp_path: Path):
        """Test validate_pdf_path with a valid PDF."""
        # Create a temporary PDF file
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"fake pdf content")

        result = PDFUtils.validate_pdf_path(pdf_file)

        assert isinstance(result, Path)
        assert result.is_absolute()
        assert result.exists()
        assert result.suffix == ".pdf"

    def test_validate_pdf_path_string_path(self, tmp_path: Path):
        """Test validate_pdf_path accepts string paths."""
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"fake pdf content")

        result = PDFUtils.validate_pdf_path(str(pdf_file))

        assert isinstance(result, Path)
        assert result.exists()

    def test_validate_pdf_path_nonexistent_file(self):
        """Test validate_pdf_path raises FileNotFoundError for missing file."""
        with pytest.raises(FileNotFoundError, match="PDF file not found"):
            PDFUtils.validate_pdf_path("/nonexistent/file.pdf")

    def test_validate_pdf_path_not_pdf(self, tmp_path: Path):
        """Test validate_pdf_path raises ValueError for non-PDF files."""
        txt_file = tmp_path / "test.txt"
        txt_file.write_text("not a pdf")

        with pytest.raises(ValueError, match="File is not a PDF"):
            PDFUtils.validate_pdf_path(txt_file)

    def test_validate_pdf_path_case_insensitive_extension(self, tmp_path: Path):
        """Test validate_pdf_path accepts .PDF extension (case insensitive)."""
        pdf_file = tmp_path / "test.PDF"
        pdf_file.write_bytes(b"fake pdf content")

        result = PDFUtils.validate_pdf_path(pdf_file)

        assert result.exists()
        assert result.suffix == ".PDF"

    def test_read_pdf_as_base64(self, tmp_path: Path):
        """Test read_pdf_as_base64 correctly encodes PDF content."""
        pdf_content = b"fake pdf content"
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(pdf_content)

        result = PDFUtils.read_pdf_as_base64(pdf_file)

        # Verify it's valid base64
        assert isinstance(result, str)
        decoded = base64.b64decode(result)
        assert decoded == pdf_content

    def test_read_pdf_as_base64_large_file(self, tmp_path: Path):
        """Test read_pdf_as_base64 handles larger files."""
        # Create 1MB fake PDF
        pdf_content = b"x" * (1024 * 1024)
        pdf_file = tmp_path / "large.pdf"
        pdf_file.write_bytes(pdf_content)

        result = PDFUtils.read_pdf_as_base64(pdf_file)

        decoded = base64.b64decode(result)
        assert len(decoded) == len(pdf_content)
        assert decoded == pdf_content

    def test_read_pdf_as_base64_nonexistent_file(self):
        """Test read_pdf_as_base64 raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            PDFUtils.read_pdf_as_base64("/nonexistent/file.pdf")

    def test_read_pdf_as_base64_not_pdf(self, tmp_path: Path):
        """Test read_pdf_as_base64 raises ValueError for non-PDF."""
        txt_file = tmp_path / "test.txt"
        txt_file.write_text("not a pdf")

        with pytest.raises(ValueError, match="File is not a PDF"):
            PDFUtils.read_pdf_as_base64(txt_file)

    def test_get_pdf_size(self, tmp_path: Path):
        """Test get_pdf_size returns correct file size."""
        pdf_content = b"fake pdf content"
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(pdf_content)

        result = PDFUtils.get_pdf_size(pdf_file)

        assert result == len(pdf_content)

    def test_get_pdf_size_empty_file(self, tmp_path: Path):
        """Test get_pdf_size with empty PDF."""
        pdf_file = tmp_path / "empty.pdf"
        pdf_file.write_bytes(b"")

        result = PDFUtils.get_pdf_size(pdf_file)

        assert result == 0

    def test_get_pdf_size_nonexistent_file(self):
        """Test get_pdf_size raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            PDFUtils.get_pdf_size("/nonexistent/file.pdf")

    def test_get_pdf_size_not_pdf(self, tmp_path: Path):
        """Test get_pdf_size raises ValueError for non-PDF."""
        txt_file = tmp_path / "test.txt"
        txt_file.write_text("not a pdf")

        with pytest.raises(ValueError, match="File is not a PDF"):
            PDFUtils.get_pdf_size(txt_file)
