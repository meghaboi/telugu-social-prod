# Phase 1 Data and Seed Plan

## Seed Collections

- Hyderabad schools and colleges index
- Hyderabad neighbourhood index
- Interest categories (Official Space mapping)

## Seed Sources

- Internal curated CSV files (preferred for deterministic builds)
- Admin-correctable imports through staff dashboard tools

## Seed Import Flow

1. Validate schema format.
2. Run dedupe and normalization.
3. Import via idempotent migration scripts.
4. Generate import report (created/updated/skipped rows).

## Required Constraints

- Schools and neighbourhoods must support active/inactive flags.
- Interests must have stable IDs for Official Space mapping.
- Official Spaces must be auto-created for every active interest category.

## Data Quality Checks

- No duplicate school names under same locality.
- Neighbourhood names normalized for case and whitespace.
- Interest IDs immutable once published.

