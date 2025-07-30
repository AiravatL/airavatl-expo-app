# Contributing to AiravatL Expo App

Thanks for helping improve the app 🚚.  
Below are the ground rules so every branch, commit and pull-request looks familiar to reviewers.

## Branch model

| Branch           | Role                                          | Merge into    |
| ---------------- | --------------------------------------------- | ------------- |
| `main`           | Production releases (EAS build ➜ Google Play) | —             |
| `dev`            | Ongoing integration                           | `main` via PR |
| `feature/<name>` | Short-lived feature / fix work                | `dev` via PR  |

_Never_ push directly to `main`.

## Commit style

Follow **Conventional Commits** so changelogs and semantic-version tags are automatic:
