# Docs

Architecture decision records (ADRs), runbooks, and supplementary specs.

The canonical product spec lives at the repo root: [`../Robotic_Lawnz_Build_Spec.md`](../Robotic_Lawnz_Build_Spec.md).

## Layout

```
docs/
├── README.md          ← you are here
├── adr/               ← architecture decision records
└── runbooks/          ← ops playbooks (incidents, deploys, rollbacks)
```

When making a non-obvious technical decision, drop an ADR into `adr/` named `NNNN-short-title.md` following the [Nygard format](https://github.com/joelparkerhenderson/architecture-decision-record).
