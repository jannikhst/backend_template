# Versioning System

This project uses automated semantic versioning with GitHub Actions.

## How It Works

### Version Format
Versions follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR.MINOR**: Manually configured in `.github/version-config.json`
- **PATCH**: Automatically incremented by the CI/CD pipeline

### Automatic Version Generation

When code is pushed to the `main` branch:

1. GitHub Actions runs the version generation script
2. Script reads `MAJOR.MINOR` from `version-config.json`
3. Script finds the highest existing `PATCH` version from Git tags
4. Script increments `PATCH` by 1
5. Script creates and pushes a new Git tag: `backend-template-vMAJOR.MINOR.PATCH`
6. Docker image is built with version metadata injected

### Build Metadata

Each Docker image includes:
- **BUILD_VERSION**: Semantic version (e.g., `1.0.5`)
- **BUILD_COMMIT**: Git commit SHA
- **BUILD_TIME**: Build timestamp

These are accessible at runtime via the `VersionService`:

```typescript
import { VersionService } from './core/services/versionService';

// Get version info
const version = VersionService.getVersion();
console.log(version);
// {
//   version: '1.0.5',
//   source: 'build-env',
//   buildCommit: 'abc123...',
//   buildTime: '2025-01-07T12:30:00Z'
// }

// Get formatted version
const formatted = VersionService.getFormattedVersion();
console.log(formatted); // "1.0.5+abc123"

// Get health info
const health = VersionService.getHealthInfo();
```

## Updating Versions

### Incrementing PATCH (Automatic)
Just push to `main` - the patch version increments automatically.

### Incrementing MINOR
Edit `.github/version-config.json`:

```json
{
  "backend-template": {
    "major": 1,
    "minor": 1  // Changed from 0 to 1
  }
}
```

Next push to `main` will create version `1.1.0`.

### Incrementing MAJOR
Edit `.github/version-config.json`:

```json
{
  "backend-template": {
    "major": 2,  // Changed from 1 to 2
    "minor": 0
  }
}
```

Next push to `main` will create version `2.0.0`.

## Git Tags

Tags follow the format: `backend-template-vMAJOR.MINOR.PATCH`

Examples:
- `backend-template-v1.0.0`
- `backend-template-v1.0.1`
- `backend-template-v1.1.0`
- `backend-template-v2.0.0`

## Docker Images

Images are pushed to GitHub Container Registry with multiple tags:

- `ghcr.io/USERNAME/REPO:latest` - Latest main branch build
- `ghcr.io/USERNAME/REPO:1.0.5` - Specific version
- `ghcr.io/USERNAME/REPO:main` - Latest main branch
- `ghcr.io/USERNAME/REPO:develop` - Latest develop branch

## Workflow Triggers

The build workflow runs when:
- Code is pushed to `main` or `develop` branches
- Changes affect: `src/`, `prisma/`, `package*.json`, `tsconfig.json`, `Dockerfile`, or `.github/version-config.json`
- A version tag is pushed manually

## Manual Version Override

To create a specific version manually:

```bash
# Create and push tag
git tag -a backend-template-v1.2.3 -m "Release 1.2.3"
git push origin backend-template-v1.2.3
```

This will trigger a build with version `1.2.3`.

## Development Builds

Local development builds use:
- **BUILD_VERSION**: `dev`
- **BUILD_COMMIT**: `local`
- **BUILD_TIME**: Current timestamp

The `VersionService` will detect this as a development build:

```typescript
VersionService.isDevelopmentBuild(); // true
```

## Troubleshooting

### Version not incrementing
- Check that `.github/version-config.json` exists and is valid JSON
- Verify Git tags are being created: `git tag -l "backend-template-v*"`
- Check GitHub Actions logs for errors

### Build metadata not available
- Ensure Dockerfile passes build args to runtime stage
- Verify environment variables are set in runtime stage
- Check that `VersionService` is reading from `process.env`

### Tag already exists error
- This indicates a bug in version calculation
- Manually delete the conflicting tag: `git tag -d backend-template-vX.Y.Z`
- Push deletion: `git push origin :refs/tags/backend-template-vX.Y.Z`
- Re-run the workflow
