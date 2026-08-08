"""Shared HTTP error handling for the propulsion analysis API."""

from __future__ import annotations

import logging
import re
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
logger = logging.getLogger("propulsion-api")


def request_id_for(request: Request) -> str:
    """Return the request-scoped correlation ID, creating one when needed."""
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        return request_id

    candidate = request.headers.get(REQUEST_ID_HEADER, "").strip()
    request_id = candidate if _REQUEST_ID_PATTERN.fullmatch(candidate) else uuid4().hex
    request.state.request_id = request_id
    return request_id


async def request_id_middleware(request: Request, call_next):
    """Attach a bounded correlation ID to every response."""
    request_id_for(request)
    response = await call_next(request)
    response.headers[REQUEST_ID_HEADER] = request.state.request_id
    return response


def _payload(
    *,
    error_code: str,
    message: str,
    request_id: str,
    detail: Any = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "error_code": error_code,
        "message": message,
        "request_id": request_id,
    }
    if detail is not None:
        payload["detail"] = jsonable_encoder(detail)
    return payload


def _response(request: Request, status_code: int, payload: dict[str, Any]) -> JSONResponse:
    request_id = request_id_for(request)
    return JSONResponse(
        status_code=status_code,
        content=payload,
        headers={REQUEST_ID_HEADER: request_id},
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Normalize explicit route errors while preserving validation details."""
    request_id = request_id_for(request)
    if exc.status_code >= 500:
        return _response(
            request,
            exc.status_code,
            _payload(
                error_code="internal_error",
                message="The server could not complete the request.",
                request_id=request_id,
            ),
        )

    if exc.status_code == 422:
        return _response(
            request,
            exc.status_code,
            _payload(
                error_code="validation_error",
                message="Request validation failed.",
                request_id=request_id,
                detail=exc.detail,
            ),
        )

    detail = exc.detail if isinstance(exc.detail, str) else None
    return _response(
        request,
        exc.status_code,
        _payload(
            error_code="request_error",
            message=detail or "The request could not be completed.",
            request_id=request_id,
            detail=None if detail else exc.detail,
        ),
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Keep FastAPI's actionable validation details in the shared envelope."""
    return _response(
        request,
        422,
        _payload(
            error_code="validation_error",
            message="Request validation failed.",
            request_id=request_id_for(request),
            detail=exc.errors(),
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log full context but never serialize exception internals to the client."""
    request_id = request_id_for(request)
    logger.exception(
        "Unhandled API failure request_id=%s method=%s path=%s",
        request_id,
        request.method,
        request.url.path,
    )
    return _response(
        request,
        500,
        _payload(
            error_code="internal_error",
            message="The server could not complete the request.",
            request_id=request_id,
        ),
    )
