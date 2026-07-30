# ============================================================================
#  Rule-based developer suggestions (exception → guidance)
# ============================================================================
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ErrorSuggestion:
    error_category: str
    possible_root_cause: str
    suggested_fix: str
    recommended_next_action: str
    summary: str

    def as_text(self) -> str:
        return (
            f"Category: {self.error_category}\n"
            f"Root cause: {self.possible_root_cause}\n"
            f"Suggested fix: {self.suggested_fix}\n"
            f"Next action: {self.recommended_next_action}"
        )


_RULES: list[tuple[tuple[str, ...], ErrorSuggestion]] = [
    (('AttributeError',), ErrorSuggestion(
        'AttributeError',
        'An object may be None or missing an expected attribute.',
        'Verify object initialization and guard with hasattr() or optional chaining before access.',
        'Inspect the failing line in the traceback and add a null check or default.',
        'Verify object initialization before accessing attributes.',
    )),
    (('KeyError',), ErrorSuggestion(
        'KeyError',
        'A dictionary key was accessed that is not present.',
        'Use dict.get(key) or check key existence before access.',
        'Trace upstream data shape; validate serializer/input payloads.',
        'Check dictionary key existence before access.',
    )),
    (('IntegrityError',), ErrorSuggestion(
        'IntegrityError',
        'Database constraint violation (FK, unique, or NOT NULL).',
        'Verify foreign keys, unique constraints, and required fields before save.',
        'Review migration/schema vs model; fix orphaned references.',
        'Verify foreign keys, unique constraints, and null values.',
    )),
    (('ValidationError',), ErrorSuggestion(
        'ValidationError',
        'Input failed model or serializer validation.',
        'Validate serializer input and call is_valid(raise_exception=True) before save.',
        'Return field-level errors to the client; fix invalid payload.',
        'Validate serializer input before saving.',
    )),
    (('TypeError',), ErrorSuggestion(
        'TypeError',
        'Wrong type passed to a function or operator.',
        'Verify argument types and function signatures; add explicit casts where needed.',
        'Add unit tests around the failing call path.',
        'Verify argument types and function signatures.',
    )),
    (('ImportError', 'ModuleNotFoundError'), ErrorSuggestion(
        'ImportError',
        'Python module or symbol could not be imported.',
        'Check module paths, virtualenv, and installed dependencies.',
        'Run pip install -r requirements.txt and verify PYTHONPATH.',
        'Check module paths and installed dependencies.',
    )),
    (('ProgrammingError',), ErrorSuggestion(
        'ProgrammingError',
        'SQL syntax or schema mismatch.',
        'Verify SQL/query and database schema; run pending migrations.',
        'Compare ORM query with DB columns and indexes.',
        'Verify SQL query and database schema.',
    )),
    (('OperationalError',), ErrorSuggestion(
        'OperationalError',
        'Database connection or operational failure.',
        'Verify database connectivity, credentials, and retry/backoff policy.',
        'Check DB health, connection pool, and network/firewall rules.',
        'Verify database connection and retry policy.',
    )),
    (('PermissionDenied',), ErrorSuggestion(
        'Authorization',
        'Authenticated user lacks permission for this action.',
        'Review permission classes and object-level checks.',
        'Confirm role/workspace scoping for the requesting user.',
        'Review authorization rules for this endpoint.',
    )),
    (('DoesNotExist', 'ObjectDoesNotExist'), ErrorSuggestion(
        'NotFound',
        'Requested database row does not exist.',
        'Use get_object_or_404 or handle DoesNotExist explicitly.',
        'Verify IDs/workspace scope in the request.',
        'Handle missing objects before dereferencing.',
    )),
]


def suggest_for_exception(
    exc: BaseException,
    *,
    database_error: str = '',
) -> ErrorSuggestion:
    name = type(exc).__name__
    for types, suggestion in _RULES:
        if name in types:
            if database_error and name in ('IntegrityError', 'ProgrammingError', 'OperationalError'):
                return ErrorSuggestion(
                    suggestion.error_category,
                    f"{suggestion.possible_root_cause} DB detail: {database_error[:500]}",
                    suggestion.suggested_fix,
                    suggestion.recommended_next_action,
                    suggestion.summary,
                )
            return suggestion

    return ErrorSuggestion(
        'UnhandledException',
        str(exc)[:500] or 'Unknown error',
        'Inspect the full stack trace and reproduce locally with DEBUG logging.',
        'Add targeted tests; consider handling this exception explicitly.',
        'Review the stack trace and add explicit error handling where appropriate.',
    )
