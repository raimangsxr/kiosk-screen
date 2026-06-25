---
id: PUBLIC_CONTENT.API_KEYS
type: contract
status: active
source_of_truth: true
owns:
  - backend/app/api/v1/api_keys/**
  - backend/app/api/v1/public_content/**
  - backend/app/repositories/api_keys.py
  - backend/app/application/content/**
  - frontend/src/app/features/api-keys/**
  - docs/postman/kiosk-screen-public-content.postman_collection.json
tests:
  - backend/tests/**/*
  - frontend/src/app/**/*.spec.ts
related_changes:
  - CHG-004
related_adrs:
  []
---

# API Keys and Public Content Upload Contract

## Purpose

This active contract is the current source of truth for `PUBLIC_CONTENT.API_KEYS`. Historical feature specs remain under `specs/changes/` and must be read only when the manifest or a context pack marks them as relevant.

## Current behavior

- Administrators can create, rotate, revoke, and delete API keys without exposing full secrets after creation.
- Public upload requires a valid bearer API key and records audit events for success and failure cases.
- API keys use the ksk_live_ prefix and are stored hashed or otherwise non-recoverable after creation.
- Public content uploads follow the same media validation and content activation rules as admin uploads.
- Revoked or deleted keys cannot upload content.

## Public interfaces

- `GET /api-keys`
- `POST /api-keys`
- `DELETE /api-keys/{id}`
- `POST /public/content`

## Owned code paths

- `backend/app/api/v1/api_keys/**`
- `backend/app/api/v1/public_content/**`
- `backend/app/repositories/api_keys.py`
- `backend/app/application/content/**`
- `frontend/src/app/features/api-keys/**`
- `docs/postman/kiosk-screen-public-content.postman_collection.json`

## Quality gates

- Changed behavior must be covered by automated tests or an explicit manual validation task with rationale.
- The manifest entry for this contract must be updated when owned paths or related changes move.
- Durable technical rationale belongs in `docs/adr/`, not only in feature `plan.md` files.

## Non-goals

- Third-party OAuth clients are outside this contract.

## Change history

- CHG-004
