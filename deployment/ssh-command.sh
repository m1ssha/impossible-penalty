#!/usr/bin/env bash
# Root-owned forced command for the dedicated deployment SSH key.
set -euo pipefail
sha=${SSH_ORIGINAL_COMMAND:-}
[[ $sha =~ ^[0-9a-f]{40}$ ]] || exit 2
exec sudo -n /usr/local/sbin/impossible-penalty-deploy "$sha"
