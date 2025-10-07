#!/bin/bash

set -e

# Function to get the next patch version
get_next_version() {
    local service=$1
    local config_file=".github/version-config.json"
    
    # Read MAJOR and MINOR from config
    local major=$(jq -r ".\"$service\".major" "$config_file")
    local minor=$(jq -r ".\"$service\".minor" "$config_file")
    
    if [ "$major" = "null" ] || [ "$minor" = "null" ]; then
        echo "Error: Service '$service' not found in version config" >&2
        exit 1
    fi
    
    # Get all existing tags for this service with the current major.minor
    local existing_tags=""
    if command -v gh &> /dev/null && [ -n "$GH_TOKEN" ]; then
        # Use GitHub CLI if available and token is set
        echo "Using GitHub CLI to fetch tags..." >&2
        existing_tags=$(gh api "repos/{owner}/{repo}/git/refs/tags" --jq ".[] | select(.ref | startswith(\"refs/tags/$service-v$major.$minor.\")) | .ref" | sed "s|refs/tags/$service-v||" 2>/dev/null || true)
    fi
    
    # Fallback: use git tags (works in GitHub Actions with checkout@v4)
    if [ -z "$existing_tags" ]; then
        echo "Falling back to git tags..." >&2
        existing_tags=$(git tag -l "$service-v$major.$minor.*" | sed "s/$service-v//" 2>/dev/null || true)
    fi
    
    local patch=0
    if [ -n "$existing_tags" ]; then
        # Find the highest patch version
        local highest_patch=$(echo "$existing_tags" | cut -d'.' -f3 | sort -n | tail -1)
        if [ -n "$highest_patch" ] && [ "$highest_patch" != "" ]; then
            patch=$((highest_patch + 1))
        fi
        echo "Found existing tags, next patch version: $patch" >&2
    else
        echo "No existing tags found, starting with patch version: $patch" >&2
    fi
    
    echo "$major.$minor.$patch"
}

# Function to create and push tag
create_and_push_tag() {
    local service=$1
    local version=$2
    local tag="$service-v$version"
    
    # Double-check if tag already exists locally (this shouldn't happen with correct version calculation)
    if git tag -l | grep -q "^$tag$"; then
        echo "ERROR: Tag $tag already exists locally! This indicates a bug in version calculation." >&2
        echo "version=$version" >> $GITHUB_OUTPUT
        echo "tag=$tag" >> $GITHUB_OUTPUT
        exit 1
    fi
    
    echo "Creating tag: $tag"
    
    # Create annotated tag
    git tag -a "$tag" -m "Release $service version $version

Auto-generated release tag for $service
- Built from commit: $(git rev-parse HEAD)
- Branch: ${GITHUB_REF_NAME:-$(git branch --show-current)}
- Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
"
    
    # Push tag to remote
    echo "Pushing tag $tag to remote..."
    git push origin "$tag"
    
    echo "Tag $tag created and pushed successfully"
    echo "version=$version" >> $GITHUB_OUTPUT
    echo "tag=$tag" >> $GITHUB_OUTPUT
}

# Main execution
main() {
    local service=$1
    
    if [ -z "$service" ]; then
        echo "Usage: $0 <service-name>"
        echo "Available services: backend-template"
        exit 1
    fi
    
    # Configure git for GitHub Actions
    if [ -n "$GITHUB_ACTIONS" ]; then
        git config user.name "github-actions[bot]"
        git config user.email "github-actions[bot]@users.noreply.github.com"
    fi
    
    # Generate next version
    local version=$(get_next_version "$service")
    echo "Next version for $service: $version"
    
    # Create and push tag
    create_and_push_tag "$service" "$version"
}

# Run main function with all arguments
main "$@"
