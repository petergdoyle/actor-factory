"""Model governance: an optional allow/deny policy for which models may be used.

Some deployments need to restrict which model providers an install is permitted to
use (for compliance, sourcing, or cost policy). This module provides the *mechanism*;
the *policy* is yours to set via ``EXCLUDED_PROVIDER_TOKENS`` (empty by default, so an
out-of-the-box install allows everything).

A token is matched two ways so it works across model-id conventions:
- **Provider-prefixed ids** (e.g. ``"<provider>.<model>-v1:0"``, optionally with a
  cross-region inference-profile prefix like ``"us."``) — matched on the provider prefix.
- **Bare names** (e.g. Ollama's ``"<model>:<tag>"``) — matched by substring.

To enforce a policy, add the provider tokens you want to exclude to
``EXCLUDED_PROVIDER_TOKENS``.
"""

from __future__ import annotations

# Provider tokens excluded by local policy. EMPTY by default — an unconfigured
# install allows every model. Populate this to enforce an allow/deny policy, e.g.
#   EXCLUDED_PROVIDER_TOKENS = frozenset({"some-provider", "another-provider"})
EXCLUDED_PROVIDER_TOKENS: frozenset[str] = frozenset()

# Cross-region inference-profile prefixes to strip before the provider check.
_PROFILE_REGION_PREFIXES = ("us.", "global.", "eu.", "apac.", "us-gov.")


def _strip_profile_prefix(model_id: str) -> str:
    for prefix in _PROFILE_REGION_PREFIXES:
        if model_id.startswith(prefix):
            return model_id[len(prefix):]
    return model_id


def is_model_allowed(model_name: str) -> bool:
    """Return True if a model name/id is permitted under the configured policy.

    With the default (empty) policy, everything is allowed. Handles both
    provider-prefixed ids ("<provider>.<model>-v1:0", "us.<provider>.<model>...")
    and bare names ("<model>:<tag>").
    """
    if not model_name or not EXCLUDED_PROVIDER_TOKENS:
        return True  # empty/unset name, or no policy configured → allowed

    name = model_name.strip().lower()
    # Drop a leading provider scheme like "ollama:" so we inspect the model name.
    if ":" in name and name.split(":", 1)[0] in {"ollama", "openai", "anthropic", "bedrock", "mock"}:
        name = name.split(":", 1)[1]

    stripped = _strip_profile_prefix(name)
    provider_prefix = stripped.split(".", 1)[0] if "." in stripped else ""

    for token in EXCLUDED_PROVIDER_TOKENS:
        # Provider-prefixed ids: exact provider prefix match.
        if provider_prefix == token:
            return False
        # Bare names: substring match.
        if token in stripped:
            return False
    return True


def filter_allowed(model_names: list[str]) -> list[str]:
    """Return only the policy-compliant model names from a list."""
    return [m for m in model_names if is_model_allowed(m)]
