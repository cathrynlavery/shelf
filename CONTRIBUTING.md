# Contributing to Shelf

## Development Setup

1. Fork and clone the repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Fill in the required environment variables.
5. Run `npm run dev`.

## Pull Requests

- Keep each PR focused on one change.
- Update or add tests when behavior changes.
- Run `npm run build` before opening the PR.
- Avoid introducing new dependencies unless there is a clear need.

## Code Style

- TypeScript throughout the app
- Server components by default
- `"use client"` only where needed
- Reuse the existing CSS patterns in `src/app/globals.css`

## Issues

- Include reproduction steps.
- Include expected versus actual behavior.
- Include screenshots for UI issues when possible.
