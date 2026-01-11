# CI/CD with GitHub Actions

## Overview

Guidelines for implementing CI/CD pipelines with GitHub Actions for Spring Boot applications.

## Directory Structure

```
.github/
├── workflows/
│   ├── ci.yml              # Main CI pipeline
│   ├── cd.yml              # Deployment pipeline
│   ├── pr.yml              # Pull request checks
│   └── release.yml         # Release workflow
├── actions/
│   └── setup-java/         # Reusable action
│       └── action.yml
└── CODEOWNERS
```

## CI Pipeline (ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  JAVA_VERSION: '21'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # Build and Test
  # ============================================
  build:
    name: Build and Test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      checks: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'

      - name: Build with Maven
        run: ./mvnw clean verify -B

      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: |
            target/surefire-reports/*.xml
            target/failsafe-reports/*.xml

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: target/site/jacoco/jacoco.xml
          fail_ci_if_error: true

      - name: Cache Maven packages
        uses: actions/cache@v4
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-m2

  # ============================================
  # Code Quality
  # ============================================
  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'

      - name: SonarCloud Scan
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: ./mvnw verify sonar:sonar -B -DskipTests

  # ============================================
  # Security Scan
  # ============================================
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build
    permissions:
      security-events: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'

      - name: OWASP Dependency Check
        run: ./mvnw org.owasp:dependency-check-maven:check -B

      - name: Upload Dependency Check Report
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: target/dependency-check-report.sarif

  # ============================================
  # Build and Push Docker Image
  # ============================================
  docker:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [build, code-quality, security]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build-push.outputs.digest }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: ${{ env.JAVA_VERSION }}
          distribution: 'temurin'
          cache: 'maven'

      - name: Build JAR
        run: ./mvnw package -DskipTests -B

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=ref,event=branch
            type=semver,pattern={{version}}

      - name: Build and push
        id: build-push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
          sbom: true

      - name: Scan Docker Image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

## CD Pipeline (cd.yml)

```yaml
name: CD

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

env:
  KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    environment:
      name: staging
      url: https://staging.example.com

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4

      - name: Configure kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" > ~/.kube/config

      - name: Update image tag
        run: |
          cd infrastructure/kubernetes/overlays/staging
          kustomize edit set image order-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Deploy to Staging
        run: |
          kubectl apply -k infrastructure/kubernetes/overlays/staging
          kubectl rollout status deployment/order-service -n staging --timeout=300s

      - name: Run Smoke Tests
        run: |
          ./scripts/smoke-test.sh https://staging.example.com

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      url: https://api.example.com

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4

      - name: Configure kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" > ~/.kube/config

      - name: Update image tag
        run: |
          cd infrastructure/kubernetes/overlays/production
          kustomize edit set image order-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Deploy to Production
        run: |
          kubectl apply -k infrastructure/kubernetes/overlays/production
          kubectl rollout status deployment/order-service -n production --timeout=300s

      - name: Verify Deployment
        run: |
          ./scripts/verify-deployment.sh https://api.example.com
```

## Pull Request Workflow (pr.yml)

```yaml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'

      - name: Check formatting
        run: ./mvnw spotless:check -B

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}

  test:
    name: Test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'

      - name: Run tests
        env:
          DATABASE_URL: jdbc:postgresql://localhost:5432/testdb
          DATABASE_USERNAME: test
          DATABASE_PASSWORD: test
        run: ./mvnw verify -B

      - name: Add coverage comment
        uses: MishaKav/jest-coverage-comment@main
        if: github.event_name == 'pull_request'
        with:
          coverage-summary-path: target/site/jacoco/jacoco.csv
          title: Test Coverage
          badge-title: Coverage

  architecture:
    name: Architecture Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'

      - name: Run ArchUnit tests
        run: ./mvnw test -Dtest="*ArchTest" -B
```

## Release Workflow (release.yml)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  packages: write

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'maven'

      - name: Set version from tag
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          ./mvnw versions:set -DnewVersion=$VERSION -B

      - name: Build release
        run: ./mvnw clean package -DskipTests -B

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Generate changelog
        id: changelog
        uses: orhun/git-cliff-action@v3
        with:
          config: cliff.toml
          args: --current

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.changelog.outputs.content }}
          files: |
            target/*.jar
          generate_release_notes: true
```

## Reusable Workflow

```yaml
# .github/workflows/deploy-service.yml
name: Deploy Service

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      image-tag:
        required: true
        type: string
    secrets:
      KUBE_CONFIG:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v4

      - name: Deploy
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" > ~/.kube/config
          kustomize build infrastructure/kubernetes/overlays/${{ inputs.environment }} | \
            kubectl apply -f -
```

## Matrix Testing

```yaml
jobs:
  test-matrix:
    name: Test on ${{ matrix.os }} with Java ${{ matrix.java }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        java: ['17', '21']
      fail-fast: false

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: ${{ matrix.java }}
          distribution: 'temurin'
      - run: ./mvnw verify -B
```

## Secrets and Environment Variables

### Required Secrets

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Auto-provided by GitHub |
| `SONAR_TOKEN` | SonarCloud authentication |
| `KUBE_CONFIG_STAGING` | Kubernetes config for staging |
| `KUBE_CONFIG_PRODUCTION` | Kubernetes config for production |
| `DOCKER_USERNAME` | Docker registry username |
| `DOCKER_PASSWORD` | Docker registry password |

### Environment Variables

```yaml
env:
  JAVA_VERSION: '21'
  MAVEN_OPTS: '-Xmx1024m'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
```

## Status Badges

```markdown
[![CI](https://github.com/org/repo/actions/workflows/ci.yml/badge.svg)](https://github.com/org/repo/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/org/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/org/repo)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=org_repo&metric=alert_status)](https://sonarcloud.io/dashboard?id=org_repo)
```

## Best Practices

1. **Cache dependencies**: Use `actions/cache` for Maven/Gradle
2. **Run tests in parallel**: Use matrix builds
3. **Fail fast**: Stop on first failure in parallel jobs
4. **Use environments**: Separate staging and production
5. **Require approvals**: For production deployments
6. **Security scans**: Include SAST, DAST, dependency scanning
7. **Artifact retention**: Clean up old artifacts
8. **Reusable workflows**: DRY principle for common tasks
9. **Branch protection**: Require CI to pass before merge
10. **Secrets management**: Never commit secrets, use GitHub Secrets
