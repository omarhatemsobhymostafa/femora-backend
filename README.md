# Pregnancy Weeks — Frontend Integration Guide

> A practical guide for building a frontend that integrates with the Pregnancy Weeks API.

This repository currently contains the Express/MongoDB backend only. Use this guide as the frontend implementation and API reference; examples reflect the backend's current behavior, including its field names and known limitations.

## Contents

- [Project overview](#project-overview)
- [Run the backend](#run-the-backend)
- [API quick reference](#api-quick-reference)
- [Authentication](#authentication)
- [Weeks data](#weeks-data)
- [Frontend integration](#frontend-integration)
- [Current API limitations](#current-api-limitations)
- [Suggested frontend structure](#suggested-frontend-structure)

## Project overview

| Area | Details |
| --- | --- |
| Backend | Node.js, Express, and Mongoose |
| API prefix | `/api/v1` |
| Default local API origin | `http://localhost:8080` |
| Authentication | JSON Web Token (JWT), sent as a Bearer token |
| Data | User accounts and pregnancy-week documents in MongoDB |

The backend source is in [`backend/`](./backend/). It does not include a frontend framework, frontend scripts, or a frontend test suite yet.

## Run the backend

1. Install a supported Node.js version and make sure MongoDB is available.
2. In `backend/`, install dependencies:

   ```bash
   npm install
   ```

3. Configure `backend/.env` locally with:

   ```dotenv
   DATABASE_URL=<your-mongodb-connection-string>
   JWT_SECRET=<a-long-random-secret>
   JWT_EXPIRES_IN=<jsonwebtoken-duration>
   PORT=8080
   ```

   `PORT` is optional; the server defaults to `8080`. Do not commit real credentials or secrets.

4. Start the development server from `backend/`:

   ```bash
   npm run dev
   ```

The server connects to MongoDB before it starts listening. If the database connection fails, the server exits.

## API quick reference

All paths below are relative to `http://localhost:8080/api/v1` in local development. Requests with bodies must send JSON with `Content-Type: application/json`.

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/signup` | No | Create an account |
| `POST` | `/login` | No | Sign in and receive a JWT |
| `GET` | `/weeks` | No | Get all week documents |
| `GET` | `/weeks/:weekNumber` | No | Get a document by week number |
| `PATCH` | `/weeks/:weekNumber` | Bearer token | Update a document by week number |

### Sign up

`POST /signup`

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "password": "at-least-8-characters"
}
```

On success, the API responds with HTTP `201`:

```json
{
  "message": "اليوزر اتعمل بنجاح",
  "token": "<jwt>",
  "user": {
    "id": "<user-id>",
    "name": "Alex",
    "email": "alex@example.com"
  }
}
```

Email is validated and normalized to lowercase. Sign-up passwords must contain at least 8 characters. The `name` field is stored as required by the database, but the API does not currently validate it before attempting to create the account.

### Log in

`POST /login`

```json
{
  "email": "alex@example.com",
  "password": "at-least-1-character"
}
```

On success, the API responds with HTTP `200`:

```json
{
  "message": "تسجيل الدخول تم بنجاح",
  "token": "<jwt>"
}
```

The login response does not include the user profile. Email must be valid; the password must be a non-empty string. Invalid credentials are rejected, but the current backend does not consistently return a documented JSON error shape for all failures.

## Authentication

The signup and login responses contain a JWT. Keep it for authenticated requests and send it in the standard authorization header:

```http
Authorization: Bearer <jwt>
```

For example, to update a week:

```http
PATCH /api/v1/weeks/12
Authorization: Bearer <jwt>
Content-Type: application/json
```

The backend currently protects only `PATCH /weeks/:weekNumber`. Reading weeks does not require a token.

For a browser application, prefer keeping the token in memory where practical. If persistence across reloads is required, assess the security trade-offs before using browser storage, especially `localStorage`, which is accessible to JavaScript running on the page. Clear the stored token when the user signs out, and handle rejected/expired tokens by returning the user to the sign-in flow.

## Weeks data

The current Mongoose model defines these week fields:

| Field | Stored type | Notes |
| --- | --- | --- |
| `weekNumber` | String | Used to find a document by route parameter |
| `babySize` | String | Baby size information |
| `WhappenInBody` | String | Exact backend spelling; likely intended as “What happens in the body” |
| `sympotyms` | String | Exact backend spelling; likely intended as “symptoms” |
| `babyLooks` | String | Baby appearance information |
| `option1` | String | Additional content |
| `option2` | String | Additional content |

MongoDB documents may also include `_id` and `__v`. Preserve the exact API field names when reading or sending data until the backend contract is updated.

### Get all weeks

`GET /weeks` returns an array of week documents:

```json
[
  {
    "_id": "<document-id>",
    "weekNumber": "12",
    "babySize": "...",
    "WhappenInBody": "...",
    "sympotyms": "...",
    "babyLooks": "...",
    "option1": "...",
    "option2": "..."
  }
]
```

### Get one week

`GET /weeks/:weekNumber` returns the matching document. If there is no match, the current controller serializes `null` rather than returning a dedicated not-found status.

### Update a week

`PATCH /weeks/:weekNumber` accepts a JSON object containing fields to update. For example:

```json
{
  "babySize": "Updated content"
}
```

The route requires authentication. The server currently passes the request body directly to the database update without an allowlist or field-level validation; the frontend should only submit fields the editor is intended to change. If no week matches, the controller currently returns `null`.

## Frontend integration

### Keep the API origin configurable

Avoid scattering the backend URL through components. Use the frontend framework's environment-variable convention and define one API base URL, for example:

```text
http://localhost:8080/api/v1
```

Use a separate production value when deploying. Do not place database credentials or the JWT signing secret in frontend configuration; frontend environment values are visible to users.

### Centralize requests and handle failures

Use one API helper for setting the base URL, JSON headers, and optional Bearer token. Check `response.ok` before treating a request as successful. A basic `fetch` pattern:

```js
async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json();
}
```

Adjust the error parsing if the backend establishes a consistent JSON error format. Do not assume every error response is JSON.

### Plan the main user flows

1. **Browse weeks:** fetch `/weeks`, show loading, empty, and error states, then render the returned documents.
2. **Open a week:** fetch `/weeks/:weekNumber`; account for `null` when a week does not exist.
3. **Create an account or sign in:** submit the corresponding JSON payload, display validation/authentication errors, and retain the returned JWT according to the app's token-storage policy.
4. **Edit a week:** submit only intended fields with `PATCH`, attach the Bearer token, and update the UI from the returned document.
5. **Handle session failures:** if an authenticated request fails, show a clear message and allow the user to sign in again.

### Browser cross-origin requests

The Express app currently does not configure CORS. If the frontend runs on a different origin (including a different localhost port), browser requests may be blocked. Use a same-origin development proxy or configure the backend to allow the frontend origin before relying on direct cross-origin requests. Do not work around this by disabling browser security.

## Current API limitations

Keep these behaviors in mind while implementing the UI:

- There is no user-profile or “current user” endpoint, refresh-token endpoint, or logout endpoint.
- Error responses are not standardized across routes; some failures may use Express's default error response rather than a JSON `{ "message": "..." }` body.
- Week reads and updates return `null` for missing documents instead of a dedicated `404`.
- Week update request bodies are not validated or restricted by the backend.
- The week schema uses misspelled field names (`WhappenInBody` and `sympotyms`); changing them requires a coordinated backend/data migration.
- CORS is not enabled in the Express app.

Treat these as backend/API concerns rather than inventing frontend-only assumptions. If the API is changed, update this guide and the frontend contract together.

## Suggested frontend structure

Adapt this to the chosen framework; these are responsibilities, not required filenames:

```text
src/
  api/          # API base URL, request helper, endpoint functions
  components/   # Shared UI such as forms, loading states, and errors
  features/
    auth/       # Sign-up and login screens/state
    weeks/      # Week list, detail, and edit flows
  types/        # Shared API response and request types
  app/          # Routing and app-level providers
```

Keep API calls out of presentation components where possible, model API types using the exact response fields, and provide accessible labels and visible feedback for loading, validation, and request failures.
#   f e m o r a - b a c k e n d  
 