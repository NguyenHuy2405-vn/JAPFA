# JAPFA Payload Application

Payload is the data layer and admin application. PostgreSQL is accessed through
the Payload Postgres adapter; collection configuration is the schema source of
truth.

## Runtime boundaries

- `payload.config.ts`: the central Payload configuration, collections, adapter, and migrations.
- `collections/`: document schemas, generated REST/GraphQL endpoints, access control, and admin fields.
- `server/`: server-only domain query functions that call the Payload Local API.
- `app/(payload)/`: Payload Admin Panel and generated REST/GraphQL route adapters.
- `app/api/`: narrow Next.js route handlers for dashboard aggregates or compatibility endpoints.
- `components/`: the custom dashboard UI; client components call HTTP APIs and never access PostgreSQL.
- `migrateCsv.ts`: one-time/import operation only; it is not a schema migration.
- `migrations/`: versioned Payload PostgreSQL schema migrations.

## Data flow

`CSV import -> Payload Local API -> PostgreSQL native Payload tables -> REST/GraphQL or server Local API -> React UI`

Use `payload.find`, `payload.create`, and `payload.update` for document operations.
Keep raw SQL limited to read-only reporting queries that cannot be represented by
the collection model. Run schema changes with `pnpm payload:migrate:create` and
deploy them with `pnpm payload:migrate`.

The existing CSV tables (`config`, `product_master`, `feed_standard`, `policy_thresholds`,
and operational ledgers) are legacy data sources. They are intentionally not
declared as Payload collections until a deliberate compatibility migration maps
their columns and constraints to the native collections.
