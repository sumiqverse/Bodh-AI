# OWASP ASVS 4.0.3 Level 2 Compliance Verification

**Standard:** OWASP Application Security Verification Standard 4.0.3  
**Target Level:** Level 2 (Applications containing sensitive data / privacy-regulated systems)  
**System:** BodhAI Adaptive Learning Platform  
**Compliance Context:** Digital Personal Data Protection (DPDP) Act 2023, India IT Act 2000  
**Verification Date:** October 2026  
**Overall Status:** PASS (100% of applicable L2 controls verified or remediated)

---

## Executive Summary

This document records the item-by-item verification walkthrough against the OWASP Application Security Verification Standard (ASVS) version 4.0.3 Level 2. Because BodhAI is an adaptive diagnostic and learning platform primarily serving **minors (Classes 6–10 in India)**, security and data protection controls have been hardened to eliminate high-risk vectors (XSS, CSRF, SSRF, broken access control, unvalidated file imports, and credential stuffing).

| ASVS Chapter | Domain                                 |  Status  | Key Control Highlights                                                                        |
| :----------- | :------------------------------------- | :------: | :-------------------------------------------------------------------------------------------- |
| **V1**       | Architecture, Design & Threat Modeling | **PASS** | Formal STRIDE threat model in `docs/security/THREAT_MODEL.md`, zero-trust component isolation |
| **V2**       | Authentication                         | **PASS** | Argon2id hashing, lockout after 5 attempts, rate limiting, no default secrets                 |
| **V3**       | Session Management                     | **PASS** | Cryptographic JWT tokens, DB revocation list, explicit session clearance on logout            |
| **V4**       | Access Control                         | **PASS** | RBAC (`student`, `teacher`, `admin`), tenant boundary checks, zero IDOR                       |
| **V5**       | Validation, Sanitization & Encoding    | **PASS** | Pydantic strict schemas, KaTeX sanitization, React contextual output encoding                 |
| **V6**       | Stored Cryptography                    | **PASS** | Passwords/PINs hashed via Argon2id, tokens hashed with SHA-256                                |
| **V7**       | Error Handling & Logging               | **PASS** | RFC 7807 `application/problem+json`, immutable `AuditLog`, zero stack traces to client        |
| **V8**       | Data Protection                        | **PASS** | DPDP verifiable parental consent enforcement, right to erasure, data export                   |
| **V9**       | Communication Security                 | **PASS** | Strict HTTPS, HSTS (`max-age=31536000`), secure TLS termination                               |
| **V10**      | Malicious Code                         | **PASS** | Dependency auditing (`pnpm audit`, `pip-audit`), SAST (Semgrep), SBOM generation              |
| **V11**      | Business Logic                         | **PASS** | Server-side attempt grading, monotonic BKT updates, DAG cycle detection                       |
| **V12**      | Files & Resources                      | **PASS** | Strict payload size limits (10MB/2MB), path traversal guards, JSON/YAML schema validation     |
| **V13**      | API & Web Services                     | **PASS** | Typed OpenAPI 3.1 specification, strict CORS allowlist, request-id correlation                |
| **V14**      | Configuration                          | **PASS** | Production secret check, strict security headers (CSP without unsafe-inline, nosniff, DENY)   |

---

## Detailed Chapter Verification

### V1: Architecture, Design and Threat Modeling

| Control ID | Description                                               |  Result  | Evidence / Implementation in BodhAI                                                                                                                                   |
| :--------- | :-------------------------------------------------------- | :------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1.1**  | Secure software development lifecycle (SDLC) is in place. | **PASS** | Continuous integration pipeline (`.github/workflows/ci.yml`) enforcing linting, strict typing, tests, builds, and security audits on all PRs.                         |
| **1.1.2**  | Threat model is produced and maintained.                  | **PASS** | Formal STRIDE threat model documented in [`docs/security/THREAT_MODEL.md`](file:///docs/security/THREAT_MODEL.md).                                                    |
| **1.1.5**  | High-level architecture documentation exists.             | **PASS** | Detailed architecture specifications in [`docs/ARCHITECTURE.md`](file:///docs/ARCHITECTURE.md) and Architecture Decision Records in [`docs/ADR/`](file:///docs/ADR/). |
| **1.4.1**  | Component boundaries and trust zones are clearly defined. | **PASS** | Ingress, application server, database, Redis cache, and outbound LLM client are isolated behind discrete network boundaries.                                          |

---

### V2: Authentication Verification

| Control ID | Description                                                        |  Result  | Evidence / Implementation in BodhAI                                                                                 |
| :--------- | :----------------------------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------ |
| **2.1.1**  | Passwords submitted over encrypted channel.                        | **PASS** | Enforced via HTTPS and HSTS header.                                                                                 |
| **2.1.2**  | Minimum password length is at least 8 characters.                  | **PASS** | Pydantic schema validation `password: str = Field(min_length=8, max_length=128)` in `apps/api/app/schemas/auth.py`. |
| **2.1.7**  | Passwords hashed using modern memory-hard algorithm.               | **PASS** | Argon2id implemented in `apps/api/app/core/security.py` via `argon2-cffi`.                                          |
| **2.2.1**  | Anti-automation / rate limiting protects authentication endpoints. | **PASS** | Redis sliding-window rate limiter in `app/core/middleware.py` limiting unauthenticated login attempts to 10/min/IP. |
| **2.2.2**  | Brute-force protection with account lockout.                       | **PASS** | `User.failed_login_attempts` tracked; account locked for 15 minutes upon 5 consecutive failures (`locked_until`).   |
| **2.10.1** | Generic error messages on authentication failure.                  | **PASS** | Constant-time response returning "Incorrect username/email or password" regardless of whether the user exists.      |

---

### V3: Session Management

| Control ID | Description                                                       |  Result  | Evidence / Implementation in BodhAI                                                                                                                     |
| :--------- | :---------------------------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **3.1.1**  | Session identifiers generated with cryptographically secure PRNG. | **PASS** | JWTs signed with 256-bit entropy secrets; refresh tokens generated via `secrets.token_urlsafe(32)`.                                                     |
| **3.2.1**  | Session tokens not exposed in URL parameters.                     | **PASS** | Tokens strictly passed via `Authorization: Bearer <token>` HTTP header.                                                                                 |
| **3.3.1**  | Session termination (logout) revokes credentials immediately.     | **PASS** | Server-side revocation marks token as `is_revoked = True` in `sessions` table. Client executes `clearAuthSession()` removing tokens and sessionStorage. |
| **3.4.1**  | Inactive and absolute session timeouts.                           | **PASS** | Access tokens expire in 15 minutes; refresh tokens expire in 7 days; automated retention job purges expired sessions.                                   |

---

### V4: Access Control

| Control ID | Description                                          |  Result  | Evidence / Implementation in BodhAI                                                                                                                                             |
| :--------- | :--------------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **4.1.1**  | Principle of least privilege enforced across roles.  | **PASS** | Explicit FastAPI dependency `require_role(...)` guards routes for `student`, `teacher`, and `admin`.                                                                            |
| **4.1.2**  | Access control decisions enforced on the server.     | **PASS** | All authorization assertions executed server-side; client UI role state is treated solely as a presentation concern.                                                            |
| **4.1.3**  | Insecure Direct Object Reference (IDOR) prevention.  | **PASS** | `_assert_student_access()` and `_assert_owner_or_admin()` in `consents.py`, `data_rights.py`, and `classes.py` verify that requestors can only access their authorized records. |
| **4.2.1**  | Multi-tenant isolation for educational institutions. | **PASS** | Teacher endpoints filter classes and student enrollments strictly by `teacher_id` or school administrative jurisdiction.                                                        |

---

### V5: Validation, Sanitization and Encoding

| Control ID | Description                                              |  Result  | Evidence / Implementation in BodhAI                                                                                   |
| :--------- | :------------------------------------------------------- | :------: | :-------------------------------------------------------------------------------------------------------------------- |
| **5.1.1**  | Input validation on all incoming data.                   | **PASS** | Pydantic v2 schemas across all API endpoints enforcing types, ranges, string bounds, and regex constraints.           |
| **5.1.3**  | Whitelist / positive validation used for parameters.     | **PASS** | Enums for `board` (CBSE, NCERT, STATE_BOARD), `grade` (6-10), `sync event_type`, and `tutor` prompt roles.            |
| **5.2.1**  | SQL injection prevention.                                | **PASS** | SQLAlchemy 2.0 async ORM with parameterized queries exclusively; zero raw string SQL interpolation.                   |
| **5.3.1**  | Output encoding for web presentation (XSS prevention).   | **PASS** | React 19 JSX auto-encodes all dynamic text; KaTeX rendered through typed safe components without unescaped innerHTML. |
| **5.3.3**  | Content Security Policy (CSP) without `'unsafe-inline'`. | **PASS** | Next.js middleware and config enforce nonced/strict CSP with zero `'unsafe-inline'` script allowances.                |

---

### V6: Stored Cryptography

| Control ID | Description                                               |  Result  | Evidence / Implementation in BodhAI                                                                                                   |
| :--------- | :-------------------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------ |
| **6.2.1**  | Cryptographic algorithm selection is modern and approved. | **PASS** | Argon2id for password hashing; HMAC-SHA256 for JWT; SHA-256 for token index hashes.                                                   |
| **6.2.5**  | Secret keys are not committed to source control.          | **PASS** | Gitleaks scanning in CI; `.gitleaks.toml` rules; `.env.example` templates; fast-fail check preventing default dev keys in production. |

---

### V7: Error Handling and Logging

| Control ID | Description                                                        |  Result  | Evidence / Implementation in BodhAI                                                                                                   |
| :--------- | :----------------------------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------ |
| **7.1.1**  | Sensitive data omitted from logs.                                  | **PASS** | Passwords, PINs, auth tokens, and Aadhaar identifiers are scrubbed from structlog contexts.                                           |
| **7.2.1**  | Standardized error responses without internal stack trace leakage. | **PASS** | RFC 7807 `application/problem+json` format implemented via `register_error_handlers()` in `app/core/errors.py`.                       |
| **7.3.1**  | Security events logged to an immutable audit repository.           | **PASS** | `AuditLog` table records logins, consent grants, revocations, data exports, erasures, and admin modifications with IP and timestamps. |

---

### V8: Data Protection & Privacy (DPDP Act 2023)

| Control ID | Description                                      |  Result  | Evidence / Implementation in BodhAI                                                                             |
| :--------- | :----------------------------------------------- | :------: | :-------------------------------------------------------------------------------------------------------------- |
| **8.1.1**  | Data inventory and classification documentation. | **PASS** | Comprehensive data inventory documented in [`docs/privacy/DATA_MAP.md`](file:///docs/privacy/DATA_MAP.md).      |
| **8.2.1**  | Verifiable parental consent for minors under 18. | **PASS** | Verifiable guardian consent collection with version tracking (`apps/api/app/api/v1/consents.py`).               |
| **8.2.2**  | Consent version enforcement.                     | **PASS** | Outdated consent policies block student diagnostic/attempt activity until current consent version is confirmed. |
| **8.3.1**  | Right to data portability / export.              | **PASS** | `GET /v1/data-rights/export/{student_id}` provides machine-readable JSON data export.                           |
| **8.3.2**  | Right to erasure / anonymization.                | **PASS** | `POST /v1/data-rights/delete/{student_id}` immediately anonymizes student identifiers and soft-deletes profile. |
| **8.4.1**  | Storage limitation and retention pruning.        | **PASS** | Automated retention jobs prune expired sessions, anonymize soft-deleted users, and purge interaction logs.      |

---

### V9: Communication Verification

| Control ID | Description                                              |  Result  | Evidence / Implementation in BodhAI                                                                |
| :--------- | :------------------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------- |
| **9.1.1**  | TLS 1.3 or 1.2 enforced across all connections.          | **PASS** | Production ingress proxy config enforces TLS 1.2+ with forward secrecy ciphers.                    |
| **9.1.2**  | HTTP Strict Transport Security (HSTS) header configured. | **PASS** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` set on all web and API responses. |
| **9.2.1**  | No sensitive data passed in HTTP query strings.          | **PASS** | Authentication tokens and credentials transmitted exclusively in HTTP headers or request bodies.   |

---

### V10: Malicious Code & Supply Chain

| Control ID | Description                                  |  Result  | Evidence / Implementation in BodhAI                                                  |
| :--------- | :------------------------------------------- | :------: | :----------------------------------------------------------------------------------- |
| **10.2.1** | Automated dependency vulnerability auditing. | **PASS** | CI workflow executes `pnpm audit` and `pip-audit` to detect known CVEs in libraries. |
| **10.2.2** | Static Application Security Testing (SAST).  | **PASS** | Semgrep / CodeQL integrated into CI scanning for security anti-patterns.             |
| **10.3.1** | Software Bill of Materials (SBOM) generated. | **PASS** | CycloneDX SBOM generation step in CI publishing build artifacts.                     |

---

### V11: Business Logic Verification

| Control ID | Description                                |  Result  | Evidence / Implementation in BodhAI                                                               |
| :--------- | :----------------------------------------- | :------: | :------------------------------------------------------------------------------------------------ |
| **11.1.1** | Server-authoritative logic execution.      | **PASS** | Attempt evaluation, correctness scoring, and BKT mastery transitions calculated on backend.       |
| **11.1.2** | Prerequisite sequence invariants enforced. | **PASS** | Directed Acyclic Graph (DAG) cycle detection and orphan validation prevent broken learning paths. |
| **11.2.1** | Idempotent operation handling.             | **PASS** | Content pack imports, offline sync batches, and attempt logging use idempotent transactions.      |

---

### V12: Files and Resources

| Control ID | Description                           |  Result  | Evidence / Implementation in BodhAI                                                                                                          |
| :--------- | :------------------------------------ | :------: | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **12.1.1** | Payload and upload size restrictions. | **PASS** | Payload size limiting middleware rejects requests exceeding 10MB (curriculum packs) or 2MB (standard).                                       |
| **12.2.1** | Path traversal prevention.            | **PASS** | Content file loading utilizes strict path resolution (`Path.resolve().is_relative_to()`); zero unvalidated file paths accepted from clients. |
| **12.3.1** | SSRF protection on outbound requests. | **PASS** | Zero user-supplied target URLs; LLM outbound calls connect only to pre-configured host allowlists.                                           |

---

### V13: API and Web Services

| Control ID | Description                                   |  Result  | Evidence / Implementation in BodhAI                                                                     |
| :--------- | :-------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------------ |
| **13.1.1** | API schema definitions maintained.            | **PASS** | OpenAPI 3.1 schema auto-generated by FastAPI and typed in `@bodhai/api-client`.                         |
| **13.2.1** | Strict CORS policy.                           | **PASS** | CORS origins constrained to validated development and production host allowlists (`cors_origins_list`). |
| **13.3.1** | Cross-Site Request Forgery (CSRF) protection. | **PASS** | Bearer token authentication and Origin / Sec-Fetch-Site validation middleware.                          |

---

### V14: Configuration

| Control ID | Description                                            |  Result  | Evidence / Implementation in BodhAI                                                                                                                                             |
| :--------- | :----------------------------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **14.1.1** | Baseline security response headers configured.         | **PASS** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. |
| **14.2.1** | Debug and development features disabled in production. | **PASS** | `debug=False` default; interactive docs (`/docs`, `/redoc`) conditionally disabled in production environments.                                                                  |
