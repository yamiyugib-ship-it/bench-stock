# Bench Stock QA report

**Run date** 2026-11-22  
**Environment** Windows, Node.js 24.22.1, embedded PostgreSQL (PGlite), and Chrome. The split-service check used the `pg` driver over a local PostgreSQL socket with the API in production mode.

| Spec | Executed case and expected result | Result |
| --- | --- | --- |
| S1 | Request an empty list, add two supplies, and confirm the list is ordered by name. The browser displays an empty state before the first addition. | Passed |
| S2 | Create a supply with extra spaces. Confirm the trimmed name, then reject a duplicate with different capitalization and invalid names or starting quantities. The list is unchanged after rejections. | Passed |
| S3 | Add stock, remove exactly the available stock, and reject invalid inputs and a missing supply. The expected quantities and HTTP statuses are returned. | Passed |
| S4 | Reject a withdrawal over available stock and an entry over the maximum. Send two simultaneous withdrawals against three units. Exactly one succeeds and one unit remains. | Passed |
| S5 | Reopen the API and its local data directory. Confirm saved quantities. In the browser, create a supply, withdraw stock, observe the insufficient-stock error, and reload to verify the saved quantity. | Passed |
| Deployment configuration | Build the standalone frontend, serve it and the API on different origins, verify API health, and complete the browser flow. Check the inventory and adjustment dialog at a 375 px viewport. | Passed locally |
| Hosted smoke test | Open the public frontend, check the public `/api/health`, and repeat the README example against Neon. | Pending deployment |

Reproduce the automated API and database cases with `npm test`. The final run passed all five spec cases. Reproduce the browser smoke test by following the example in the [README](README.md).

An independent run in a clean copy reproduced S1–S5 at the API level. Embedded PostgreSQL serializes database execution, so the simultaneous HTTP test verifies the local outcome. The single conditional `UPDATE` also relies on PostgreSQL rechecking its condition after a competing update under Read Committed isolation. [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
