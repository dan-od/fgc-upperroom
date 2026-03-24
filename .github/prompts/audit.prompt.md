---
name: audit
description: "Use when: you need to audit and update project dependencies"
argument-hint: "Optional: specify a package name to audit a specific dependency"
---

# Goal: Audit and update project dependencies

Your goal is to check project dependencies, check for lint errors, check outdated dependencies and update them.

1. Run `npm audit` to check for vulnerabilities.
2. Run `npm audit fix` to fix vulnerabilities.
3. Run `npm audit fix --force` if no. 2 doesn't fix vulnerabilities.
4. Run `npm outdated` to check for outdated dependencies.
5. Update dependencies using `npm update` or manually update the version in `package.json` and run `npm install`.
6. Run `npm run lint` to check for lint errors and fix them.
7. Run `npm run build` to ensure the project builds successfully after updates.
8. Run tests if available to ensure nothing is broken after updates.