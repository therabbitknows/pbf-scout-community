#!/usr/bin/env bash
set -euo pipefail

fail() { printf 'AUDIT FAIL: %s\n' "$1" >&2; exit 1; }

tracked="$(git ls-files)"
printf '%s\n' "$tracked" | grep -Eq '(^|/)(\.env|captures|runtime|secrets)(/|$)' && fail 'private runtime material is tracked'

if git grep -nEI 'https://discord(app)?\.com/api/webhooks/[0-9]{8,}/[A-Za-z0-9._-]{20,}' -- ':!scripts/prepush-audit.sh'; then
  fail 'a live-looking Discord webhook is tracked'
fi

if git grep -nEI '(sk_live_|whsec_|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|MENTRAOS_API_KEY=[^r][^e][^p])' -- ':!.env.example' ':!scripts/prepush-audit.sh'; then
  fail 'a secret-looking value is tracked'
fi

if git grep -nEI '192\.168\.[0-9]+\.[0-9]+|100\.[0-9]+\.[0-9]+\.[0-9]+' -- ':!scripts/prepush-audit.sh'; then
  fail 'a private operator address is tracked'
fi

printf 'AUDIT PASS: no tracked runtime data, private routes, or secret-looking values\n'
