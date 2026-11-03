# NGO Factory: spec

A small, non-profit platform where local NGOs submit AI projects that could help their community. Each project is refined by AI and volunteers, estimated, funded, and delivered through a series of **gates** that anyone can follow. The platform does not build the projects. It provides the gates, the skills and the visibility; the building happens in each project's own repo with the usual agent tooling.

Built for the Qodo Software Factory Hackathon (Nov 2 to Dec 2, 2026). The platform is itself built through a software factory: ticket, agent, tests, Qodo review, PR.

## Principles

1. **Small.** Every line we write is a line we maintain. Prefer GitHub, existing skills and existing MCP servers over new code.
2. **GitHub is the source of truth.** A submission is an issue, a spec is a file, a gate is a label or a required check. The platform renders them.
3. **Transparent.** Estimates are ranges with a confidence level. Gates show who decided (AI, human, both) and link to evidence.
4. **Humans own the risky parts.** Vetting, safety review and the support plan are human gates. AI proposes, a person signs.
5. **Open by default.** Delivered projects are open source.

## Flow

| #   | Gate          | Decided by | What passes it                                                          |
| --- | ------------- | ---------- | ----------------------------------------------------------------------- |
| 1   | Submitted     | NGO        | The submission form is complete.                                        |
| 2   | Vetted        | Human      | A maintainer confirms the NGO is real and local.                        |
| 3   | Refined       | AI + human | `spec.md` exists: problem, users, data sources, success measure, scope. |
| 4   | Estimated     | AI + human | `estimate.md`: token and human-hour ranges, confidence, approach.       |
| 5   | Safety review | Human      | A domain expert and the NGO sign off on risks and the disclaimer.       |
| 6   | Support plan  | Human      | Who runs it for the first 12 months, and the reserve to pay for it.     |
| 7   | Funded        | Platform   | Funding goal reached (simulated in the hackathon build).                |
| 8   | Building      | AI + human | Work happens in the project repo; PRs pass CI and Qodo review.          |
| 9   | Delivered     | Human      | The NGO accepts the result; the repo is released.                       |

## Pages (MVP)

- `/` lists projects with their current gate and funding.
- `/submit` is the NGO form. It produces a GitHub issue body (creating the real issue comes later).
- `/projects/[slug]` shows the overview, estimate, funding and the gate timeline (the harness).

## Funding

Simulated for the hackathon: the goal is computed from the estimate and the page shows progress against it. The plan is to hand the real money flow to an existing platform (Open Collective) and show its public ledger. We do not take payments.

Funding goal = high token cost + 12-month support reserve + 15% contingency. Volunteer hours are unpaid.

## Out of scope

Payments, user accounts, a project-building IDE, hosting delivered projects.

## Later

- Create the real GitHub issue from the form.
- Read gates from labels, milestones, PRs and the Qodo review status via the GitHub API.
- `ngo-project-kit` repo: `AGENTS.md` template, skills for spec, estimate and gate review, MCP configs for open data (weather, soil, maps).
- Estimate versus actual comparison on delivered projects.

## Flagship example

"Crop weather mitigation for smallholder farmers": a decision-support tool that turns a local forecast into crop-specific mitigation steps (frost, drought, heavy rain). It is the seeded project in `src/lib/data/projects.ts` and the one worked example taken through every gate.
