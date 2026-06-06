# src/core/ — Former Port Interfaces Layer

**OVERVIEW:** Previously housed hexagonal port interfaces (`ports/`). The port/adapter layer was removed because it had zero production consumers while adding maintenance overhead.

The `core/` directory is retained as an empty shell for future business logic services.

## Where to Look

- New integrations (settings, tabs, etc.) should be added as shared utilities in `src/shared/` or directly in the consumer module.
- Business logic that needs isolation should go in `src/core/services/` in the future.
