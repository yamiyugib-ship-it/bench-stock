# Bench Stock specification

Bench Stock tracks consumables for a small ceramics studio. A studio operator can see how many units of each supply are available and record units coming in or going out.

## Acceptance criteria

| ID | Requirement |
| --- | --- |
| S1 | The inventory shows the name and current quantity of each supply, ordered by name. An empty inventory shows an empty state. |
| S2 | An operator can add a supply with a name and a starting quantity from 0 to 999,999. The name is trimmed and must contain 1–80 characters. Names are unique regardless of case. |
| S3 | An operator can add or remove a positive whole number of units. Removing exactly the available quantity is allowed. |
| S4 | An adjustment that would take stock below 0 or above 999,999 is rejected without changing the quantity. Two simultaneous withdrawals cannot oversell the same stock. |
| S5 | The interface shows success and error feedback. After reload or a server restart, it reads the saved quantities from PostgreSQL. |

## Data and API

`supplies` stores an integer `id`, a `name`, and an integer `quantity`. PostgreSQL enforces distinct names and quantity bounds. The service checks inputs before querying SQL. A conditional update checks stock and writes it in a single statement.

| Request | Success | Expected errors |
| --- | --- | --- |
| `GET /api/health` | `200` when PostgreSQL responds | `503` when the database is unavailable |
| `GET /api/supplies` | `200` with an array of supplies | — |
| `POST /api/supplies` with `{name, quantity}` | `201` with the new supply | `400` invalid input, `409` duplicate name |
| `POST /api/supplies/:id/adjustments` with `{direction, amount}` | `200` with the updated supply | `400` invalid input, `404` missing supply, `409` stock outside bounds |

`direction` must be `in` or `out`. A fractional number, a numeric string, or zero is invalid for `amount`. Error responses contain an `error` message.

The demo uses shared, fictional inventory. Its scope is one screen, current stock, and the two forms.
