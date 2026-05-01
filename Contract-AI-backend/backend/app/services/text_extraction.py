from io import BytesIO
from pathlib import Path

from pypdf import PdfReader


class UnsupportedFileTypeError(ValueError):
    """Raised when an upload is not one of the supported file formats."""


def extract_text_from_upload(filename: str, file_bytes: bytes) -> str:
    suffix = Path(filename).suffix.lower()

    if suffix == ".txt":
        return extract_text_from_txt(file_bytes)
    if suffix == ".pdf":
        return extract_text_from_pdf(file_bytes)

    raise UnsupportedFileTypeError("Only .pdf and .txt files are supported.")


def extract_text_from_txt(file_bytes: bytes) -> str:
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("TXT files must be UTF-8 encoded.") from exc

    return _normalize_text(text)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError("Unable to read PDF content.") from exc

    page_texts: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            page_texts.append(page_text)

    return _normalize_text("\n\n".join(page_texts))


def _normalize_text(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    return normalized
