---
name: wrong-name
description: This skill has a name field that does not match its directory name, which should be detected as a validation error
---

# Name Mismatch

This fixture has valid YAML frontmatter but the name field "wrong-name" does not match the directory name "name-mismatch".

This mismatch should be caught during validation to ensure consistency between directory structure and skill metadata.
