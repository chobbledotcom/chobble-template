#!/usr/bin/env bash

# shellcheck source=/dev/null
source @runtimeSetup@

# Stage the musl jscpd binary (a no-op when already installed) in the
# background so shell entry stays fast; the pre-commit hook runs it in the
# foreground because its cpd steps depend on it.
(node scripts/jscpd/install.js && echo "jscpd ready") &

cat <<'EOF'

Available commands:
 serve              - Clean & start dev server with incremental builds
 build              - Clean & build the site in ./_site
 test               - Run JavaScript tests
 pc                 - Run precommit (lint/typecheck/tests) - also runs automatically on git commit
 precommit          - Alias for pc
 profile            - Profile build for performance bottlenecks
 customise-cms      - Interactive setup for PagesCMS collections
 generate-pages-yml - Generate .pages.yml with all collections

EOF
