# billing-service — DevSecOps Exam Starter Repo

## 🎯 Your Task

This is a Node.js microservice for FlowAccount's billing system.

**Your job:** Create a GitHub Actions workflow that:

1. **Scans for leaked secrets** in every Pull Request targeting `main`
2. **Blocks the merge** if any secrets are found (the workflow must fail)
3. **Posts a PR comment** that lists every file containing a secret and suggests how to fix it
4. In your exam answer sheet — **explain your workflow design** step by step

---

## 📁 Project Structure

```
billing-service/
├── src/
│   ├── index.js       ← Main Express app
│   ├── db.js          ← Database connection
│   └── config.js      ← App configuration
├── .github/
│   └── workflows/
│       └── (you create your workflow file here)
├── package.json
└── .gitignore
```

---

## 🚀 Getting Started

```bash
npm install
npm start        # runs on port 3000
```

**Health check:** `GET /health` → returns `{ "status": "ok" }`

---

## ✅ Workflow Requirements (see exam brief for full details)

| # | Requirement |
|---|---|
| 1 | Trigger on Pull Request to `main` branch |
| 2 | Scan for hardcoded secrets using a secret scanning tool |
| 3 | Fail the workflow (block merge) if secrets are found |
| 4 | Post a PR comment listing affected files + remediation steps |

---

> **Note:** Do not fix the secrets in the source code — the workflow should detect them as-is.
