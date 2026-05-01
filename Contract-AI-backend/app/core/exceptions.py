class AppError(Exception):
    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class ContractNotFoundError(AppError):
    def __init__(self):
        super().__init__(
            message="Contract not found",
            code="CONTRACT_NOT_FOUND",
            status_code=404
        )


class EmptyDocumentError(AppError):
    def __init__(self):
        super().__init__(
            message="Document is empty or text could not be extracted",
            code="EMPTY_DOCUMENT",
            status_code=400
        )


class UnsupportedFileTypeError(AppError):
    def __init__(self):
        super().__init__(
            message="Unsupported file type",
            code="UNSUPPORTED_FILE_TYPE",
            status_code=400
        )


class ClauseExtractionError(AppError):
    def __init__(self):
        super().__init__(
            message="Clause extraction failed",
            code="CLAUSE_EXTRACTION_FAILED",
            status_code=500
        )