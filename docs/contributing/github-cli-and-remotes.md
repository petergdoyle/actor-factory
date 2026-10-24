# GitHub CLI & Remotes Setup (macOS, locked-down work machine)

This guide gets the GitHub CLI (`gh`) working on a managed Mac where you do **not**
have `sudo`, and documents the remote/mirror topology these repos use.

> **Why this exists.** On a locked-down machine, `~/.config` can be owned by `root`
> (left by a provisioning/MDM run), so `gh` can't write its config there and every
> `gh auth login` fails with `mkdir ... permission denied`. The fix is to relocate
> `gh`'s config dir to one you own — no admin rights needed.

---

## Do these in order

### 1. Relocate the `gh` config dir (one-time, no sudo)

`gh` defaults to `~/.config/gh`. If `~/.config` is root-owned you can't write there.
Point `gh` at a directory you own and persist it in your shell profile:

```bash
mkdir -p "$HOME/.gh-config"
export GH_CONFIG_DIR="$HOME/.gh-config"
echo 'export GH_CONFIG_DIR="$HOME/.gh-config"' >> ~/.zshrc
```

Verify you own it:

```bash
stat -f "%Su %Sg %N" "$HOME/.gh-config"   # should print: <you> staff <path>
```

> Confirm the root-owned dir is the real cause if `gh` still fails:
> `ls -ld ~/.config` → if it shows `root`, this is the issue.

### 2. Create a Personal Access Token (classic)

GitHub web → **Settings → Developer settings → Personal access tokens → Tokens (classic)
→ Generate new token (classic)**. Scopes:

| Scope | Why |
|-------|-----|
| `repo` | PRs, pushes, repo read/write |
| `read:org` | `gh` reads org membership on login |
| `workflow` | (optional) lets `gh` touch GitHub Actions |

Pick an expiration, **Generate**, and **copy the token** (shown once).

> `admin:public_key` is only needed if you let `gh` upload an SSH key. Don't — your SSH
> to GitHub already works for `git`. Using a token (below) skips that entirely.

### 3. Authenticate `gh` with the token (non-interactive)

The `--with-token` path skips every interactive prompt (protocol choice, SSH-key upload,
device code, 2FA) — the deterministic way past the flows that commonly hang:

```bash
export GH_CONFIG_DIR="$HOME/.gh-config"        # already in ~/.zshrc after step 1
echo "ghp_YOUR_TOKEN" | gh auth login --with-token
gh auth status
```

Expected:

```
✓ Logged in to github.com account <you> (keyring)
  - Token scopes: 'read:org', 'repo', 'workflow'
```

### 4. Token hygiene

- **Never paste a token into chat, tickets, or commits.** If one is exposed, revoke it
  immediately (Settings → tokens → Delete) and issue a new one.
- Rotating safely without locking yourself out: generate a new token → re-run
  `echo "ghp_NEW" | gh auth login --with-token` → confirm `gh auth status` → then revoke
  the old token.

---

## Remote & mirror topology

These projects use **GitHub as the source of truth** and **DPS GitLab as a pull mirror
for CI/CD**. CI runs entirely on DPS GitLab and must not reach out to github.com.

```
GitHub (public, source of truth)  ──pull-mirror──▶  DPS GitLab (dps-productivity, CI/CD)
      you push here                                  mirrors + builds + deploys to UAT
```

- **GitHub** (`github.com/petergdoyle/<repo>`): personal/OSS, where you push. Local dev and
  the committed `pyproject.toml` dependency pins resolve from here over public HTTPS.
- **DPS GitLab** (`repo.dpsk12.org/amazon-web-services/dps-productivity/<repo>`):
  pull-mirrors GitHub and runs `.gitlab-ci.yml`. **Self-contained — CI resolves dependencies
  from DPS-internal sources only, never github.com** (GitHub is a personal repo; CI must stay
  within DPS). See each project's CI notes for how the shared `mermaid-repair` dependency is
  overridden to its GitLab mirror at build time.

### Local remotes (recommended)

Keep both remotes locally so you can push to GitHub (source of truth) and inspect GitLab:

```bash
git remote -v
# origin  git@github.com:petergdoyle/<repo>.git   (push here)
# gitlab  git@repo.dpsk12.org:amazon-web-services/dps-productivity/<repo>.git  (mirror, usually read-only)
```

Do **not** push DPS-specific changes to GitHub — the public repo stays vendor-neutral.
The mirror is one-way (GitHub → GitLab); never let DPS content flow back to GitHub.
