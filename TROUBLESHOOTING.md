# 🔧 Troubleshooting Guide

## ERR_PNPM_OUTDATED_LOCKFILE Error

### Problem
```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

### Solutions

#### Solution 1: Update Lockfile (Recommended)
```bash
# Remove node_modules and lockfile
rm -rf node_modules pnpm-lock.yaml

# Reinstall with updated lockfile
pnpm install
```

#### Solution 2: Use Non-Frozen Lockfile
```bash
# Install without frozen lockfile check
pnpm install --no-frozen-lockfile
```

#### Solution 3: Ensure Correct pnpm Version
```bash
# Check current version
pnpm --version

# Should be: 10.22.0

# If different, use corepack to set correct version
corepack enable
corepack use pnpm@10.22.0
```

#### Solution 4: For CI/CD Environments
Ensure your CI/CD uses the same pnpm version:

```yaml
# .github/workflows/ci.yml (already included)
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 10.22.0
```

### Verification

After fixing, verify the lockfile is in sync:

```bash
# This should complete without errors
pnpm install --frozen-lockfile
```

### Common Causes

1. **Different pnpm version**: Lockfile was generated with a different pnpm version
2. **Manual package.json edits**: Dependencies were added/removed without updating lockfile
3. **Git merge conflicts**: Lockfile conflicts weren't resolved properly
4. **CI/CD environment**: Different Node.js or pnpm version in CI

### Prevention

1. Always run `pnpm install` after modifying `package.json`
2. Commit `pnpm-lock.yaml` to version control
3. Use `packageManager` field in `package.json` (already added)
4. Use same pnpm version across all environments

---

## Other Common Issues

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules .vite dist
pnpm install
pnpm build
```

### Type Errors
```bash
# Reinstall TypeScript types
pnpm install --force
```

---

## Getting Help

If issues persist:
1. Check Node.js version: `node --version` (should be 18+)
2. Check pnpm version: `pnpm --version` (should be 10.22.0)
3. Check for uncommitted changes: `git status`
4. Review error logs for specific package issues
