# Shelf

Self-hosted digital asset management with AI auto-tagging, full-text search, collections, and a simple team UI.

## Features

- AI auto-tagging for images with Google Gemini
- Search by title, tags, filename, collection, and product
- Collection browsing and asset detail editing
- Single-file and bulk uploads
- Simple team auth with HTTP Basic Auth
- API key protected REST API for automations and agents
- Cloudflare R2 storage with Postgres-backed metadata

## Stack

- Next.js 14 App Router
- PostgreSQL via `POSTGRES_URL`
- Cloudflare R2 for file storage
- Google Gemini for image tagging

## Quick Start

```bash
git clone https://github.com/cathrynlavery/shelf.git
cd shelf
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Brand-specific UI values are configured through environment variables.

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | App name shown in the UI | `Shelf` |
| `NEXT_PUBLIC_APP_EMOJI` | Emoji shown in the header | `📦` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Page metadata description | `Self-hosted digital asset management with AI auto-tagging` |
| `NEXT_PUBLIC_SHELF_PRODUCTS` | JSON array of product labels | `["Product A","Product B","Product C"]` |
| `NEXT_PUBLIC_SHELF_CONTENT_TYPES` | JSON array of content type labels | `["Product shot","Lifestyle","Flat lay","Banner","Social media","Video","UGC","Logo"]` |
| `NEXT_PUBLIC_SHELF_COLLECTIONS` | JSON array of collection labels | `["Products","Marketing","Brand"]` |
| `SHELF_AUTH_USERNAME` | Basic auth username for the team UI | `admin` |
| `GEMINI_MODEL` | Gemini model used for tagging | `gemini-2.5-flash` |
| `GEMINI_PROMPT_PREFIX` | Prompt prefix for image tagging | `You are a digital asset manager.` |
| `GEMINI_PROMPT_CONTEXT` | Extra brand or catalog context for tagging | empty |

`NEXT_PUBLIC_DAM_API_KEY` should match `API_KEY` if you want the built-in browser UI to create or edit assets.

## Upload Flow

The main upload endpoint is `POST /api/assets/upload` and accepts `multipart/form-data`.

Required fields:

- `file`
- `title`

Optional fields:

- `description`
- `tags` as JSON or comma-separated text
- `products` as JSON or comma-separated text
- `uploaded_by`

Image uploads are stored in R2, a draft asset row is created, and Gemini tagging runs asynchronously in the background.

## API

All API routes except `GET /api/health` require an `x-api-key` header.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/assets` | List assets with query filters |
| `POST` | `/api/assets/search` | Search assets with a JSON body |
| `GET` | `/api/assets/[id]` | Fetch a single asset |
| `PATCH` | `/api/assets/[id]` | Update asset metadata |
| `POST` | `/api/assets/upload` | Upload a file and create an asset |
| `POST` | `/api/assets/[id]/complete` | Legacy finalize endpoint for external upload flows |

## Importing Existing Files

An R2 import script is included:

```bash
npm run import:r2 -- --dry-run
```

Optional env vars:

- `SHELF_IMPORT_PREFIX`
- `SHELF_IMPORT_UPLOADED_BY`

## Deploy

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/shelf)

1. Create a new project from this repo.
2. Set the environment variables from `.env.example`.
3. Deploy.

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcathrynlavery%2Fshelf&env=POSTGRES_URL,R2_ACCOUNT_ID,R2_BUCKET,R2_TOKEN,R2_PUBLIC_URL,API_KEY,UI_PASSWORD,GEMINI_API_KEY,NEXT_PUBLIC_DAM_API_KEY&envDescription=Required%20environment%20variables%20for%20Shelf&envLink=https%3A%2F%2Fgithub.com%2Fcathrynlavery%2Fshelf%2Fblob%2Fmain%2F.env.example&project-name=shelf&repository-name=shelf)

1. Import the repo.
2. Configure the same environment variables.
3. Deploy.

### Docker

```bash
docker build -t shelf .
docker run --env-file .env.local -p 3000:3000 shelf
```

## Development

```bash
npm test
npm run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
