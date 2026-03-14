---
name: bad-yaml
description: This skill has malformed YAML syntax
license MIT
invalid: : syntax
  broken: indentation:too:many:colons
---

# Bad YAML

This fixture has YAML syntax errors:
- Missing quotes on license value
- Invalid colon syntax in key:value pairs
- Improper indentation

This should fail YAML parsing.
