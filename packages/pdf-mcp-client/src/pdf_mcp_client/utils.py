"""Utility functions for PDF processing."""

import base64
from pathlib import Path


class PDFUtils:
    """Utilities for PDF file operations."""

    @staticmethod
    def validate_pdf_path(pdf_path: str | Path) -> Path:
        """Validate PDF exists and return absolute Path.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Absolute Path object

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a PDF
        """
        path = Path(pdf_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        if path.suffix.lower() != ".pdf":
            raise ValueError(f"File is not a PDF: {pdf_path}")
        return path.resolve()

    @staticmethod
    def read_pdf_as_base64(pdf_path: str | Path) -> str:
        """Read PDF file and encode as base64 string.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Base64-encoded PDF content

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a PDF
        """
        path = PDFUtils.validate_pdf_path(pdf_path)
        with open(path, "rb") as f:
            pdf_bytes = f.read()
        return base64.b64encode(pdf_bytes).decode("ascii")

    @staticmethod
    def get_pdf_size(pdf_path: str | Path) -> int:
        """Get PDF file size in bytes.

        Args:
            pdf_path: Path to PDF file

        Returns:
            File size in bytes

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is not a PDF
        """
        path = PDFUtils.validate_pdf_path(pdf_path)
        return path.stat().st_size
