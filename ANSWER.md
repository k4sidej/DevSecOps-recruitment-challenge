### Workflow Trigger (`on`)
```yaml
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
  push:
    branches: [feature/secret-scanning]
```
This section defines the events that will trigger the workflow. It is configured to run on:
- **Pull Requests:** The workflow runs whenever a pull request targeting the `main` branch is `opened`, `reopened`, or when new commits are pushed to it (`synchronize`). This is the primary security gate.
- **Pushes:** The workflow also runs on direct pushes to the `feature/secret-scanning` branch, which allows for testing the workflow logic without creating a pull request.

### Job Configuration (`jobs`)
```yaml
jobs:
  scan:
    name: Gitleaks Security Scan
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
```
This section defines the job(s) to be executed. We have a single job named `scan`:
- `name`: Sets the display name of the job in the GitHub UI to "Gitleaks Security Scan".
- `runs-on`: Specifies that the job will run on the latest available Ubuntu virtual machine provided by GitHub.
- `permissions`: Grants specific, limited permissions to the `GITHUB_TOKEN` for this job.
  - `contents: read`: Allows the job to check out the repository code.
  - `pull-requests: write` / `issues: write`: Allows the job to post comments on the pull request.


```yaml
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
```
**Checkout Code:** This is the first step in any workflow that needs to access the repository's code. It uses the standard `actions/checkout@v4` action. `fetch-depth: 0` is used to fetch the entire git history

```yaml
      - name: Install Gitleaks
        shell: bash
        run: |
          set -euo pipefail
          GITLEAKS_VERSION="8.24.3"
          curl -sSL -o gitleaks.tar.gz "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz"
          tar -xzf gitleaks.tar.gz gitleaks
          sudo install -m 0755 gitleaks /usr/local/bin/gitleaks
          gitleaks version
```
**Install Gitleaks:** This step manually downloads and installs a specific version of the Gitleaks binary. This gives us precise control over the tool version. It downloads the tarball, extracts the binary, and moves it to `/usr/local/bin` to make it available in the `PATH`.

```yaml
      - name: Run Gitleaks (PR)
        id: gitleaks_pr
        if: github.event_name == 'pull_request'
        shell: bash
        run: |
          gitleaks detect --source . --redact --exit-code 2 --config .gitleaks.toml --report-path gitleaks-report.json
        continue-on-error: true
```
**Run Gitleaks (PR):** This step runs only for pull request events.
- `gitleaks detect`: The main command to scan for secrets.
- `--source .`: Scans the current directory.
- `--report-path gitleaks-report.json`: Saves the findings as a JSON file.
- `continue-on-error: true`: This is critical. It ensures that even if Gitleaks finds secrets and exits with a non-zero code, the workflow continues to the next step (posting a comment) instead of stopping immediately.

```yaml
      - name: Post PR Comment on Failure
        if: steps.gitleaks_pr.outcome == 'failure' && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            // ... script content ...
```
**Post PR Comment on Failure:** This step runs only if the previous "Run Gitleaks (PR)" step failed.
- It uses `actions/github-script` to execute a Node.js script.
- The script reads the `gitleaks-report.json` file.
- It dynamically builds a Markdown table containing the file path, line number, and rule for each secret found.
- Finally, it uses the GitHub API (`github.rest.issues.createComment`) to post the formatted message as a comment on the pull request.

```yaml
      - name: Fail on Secret Detection
        if: steps.gitleaks_pr.outcome == 'failure' || steps.gitleaks_push.outcome == 'failure'
        run: exit 1
```
**Fail on Secret Detection:** This is the final and most important step for enforcement.
- It runs if *either* the PR scan or the push scan detected a secret.
- `run: exit 1`: This command explicitly exits with a status code of 1.
- This final non-zero exit code marks the entire job as "Failed," which blocks the PR from being merged (if branch protection rules are set up).


### Q&A

**1. Which secret scanning tool will you use, and why?**

This workflow uses **Gitleaks**.

- **Ease of Integration:** While not using a pre-made third-party action, it is integrated directly and reliably by the `Install Gitleaks` step, which downloads and installs a specific version of the tool. This gives us full control over the scanner's version.
- **Output Format:** The `Run Gitleaks (PR)` step uses the `--report-path gitleaks-report.json` flag. This creates a structured JSON file that is easily parsed by the `Post PR Comment on Failure` step to generate a clear and detailed report for the developer.
- **Community Support:** Gitleaks is a very popular and actively maintained open-source tool with a large community and comprehensive documentation.

**2. How does your workflow signal failure to GitHub? What exit code or condition makes the merge button turn red?**

The workflow uses a dedicated final step, `Fail on Secret Detection`, to signal failure.

```yaml
      - name: Fail on Secret Detection
        if: steps.gitleaks_pr.outcome == 'failure' || steps.gitleaks_push.outcome == 'failure'
        run: exit 1
```

- **Signal Failure:** This step runs the command `exit 1`, which returns a non-zero exit code. GitHub Actions interprets any non-zero exit code as a job failure.
- **Merge Button:** This explicit failure causes the check to show a red "X" on the pull request. If a branch protection rule is configured for the `main` branch that requires this check to pass, the "Merge" button will be disabled, effectively blocking the merge.

**3. The comment step must run even when a previous step fails. How do you control when a step runs in GitHub Actions?**

This is achieved by combining `continue-on-error: true` on the scanning step with an `if` condition on the commenting step.

1.  **`continue-on-error: true`**: In the `Run Gitleaks (PR)` step, this setting ensures that even if Gitleaks finds a secret and exits with an error code, the workflow doesn't stop immediately. Instead, it marks the step's outcome as `failure` and proceeds.

2.  **`if: steps.gitleaks_pr.outcome == 'failure'`**: The `Post PR Comment on Failure` step uses this condition to ensure it *only* runs if the preceding scanning step actually failed. This is the perfect mechanism for "on failure" actions.

**4. A developer will read your comment and needs to know exactly what to fix. How will you include the affected file names and clear remediation steps?**

The `Post PR Comment on Failure` step is designed to provide this clarity.

```yaml
      - name: Post PR Comment on Failure
        if: steps.gitleaks_pr.outcome == 'failure' && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            // ...
            const glResults = JSON.parse(glContent);
            glResults.forEach(f => {
              table += `| \`${f.File}\` | ${f.StartLine} | ${f.RuleID} (Gitleaks) | Move to Github Secrets |\n`;
            });
            // ...
```

- **Affected Files:** The script reads the `gitleaks-report.json` file, which contains structured data for each finding.
- **Clear Details:** It then iterates through each finding and builds a Markdown table, extracting the `File`, `StartLine`, and `RuleID` to show the developer exactly where the secret is and what kind of secret it is.
- **Remediation:** The comment body includes a static "How to Fix" section with actionable advice, such as invalidating the secret and removing it from git history.

**5. Posting a comment on a PR requires specific GitHub Actions permissions. What permissions does your workflow need to declare?**

The workflow declares the necessary permissions in the `permissions` block at the job level.

```yaml
    permissions:
      contents: read
      pull-requests: write
      issues: write
```

- **`pull-requests: write`** is the key permission that grants the ability to post comments on pull requests. The `issues: write` permission provides similar access, as PRs are technically a type of issue.
- **`contents: read`** is also required to allow the `actions/checkout` step to read the repository's code.