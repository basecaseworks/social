# Social

Minimal working social network with email/password authentication, a chronological text feed, profiles, and likes.

## Features

- Register, log in, and log out.
- Create text posts up to 500 characters.
- View a global newest-first feed.
- Like and unlike posts.
- Delete only your own posts.
- View a user's basic profile and posts.

## Stack

- Next.js and React
- TypeScript and plain CSS
- Better Auth for email/password authentication
- Drizzle ORM with PostgreSQL
- Zod for server-side validation
- Vercel-compatible Next.js API routes

## Run locally

Requirements: Node.js 20.9 or newer and PostgreSQL 14 or newer.

```bash
git clone https://github.com/basecaseworks/social.git
cd social
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:check
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL`: PostgreSQL connection string.
- `BETTER_AUTH_SECRET`: high-entropy secret of at least 32 characters.
- `BETTER_AUTH_URL`: application base URL, such as `http://localhost:3000`.
- `BETTER_AUTH_TRUSTED_ORIGINS`: optional comma-separated list of additional application origins, such as `https://social.basecase.me`.

The default setup uses the same PostgreSQL role for migrations and runtime. Never commit `.env.local` or real secrets.

## Database

Better Auth stores users and sessions in `user`, `session`, `account`, and `verification`.

Application tables:

- `posts`: UUID `id`, Better Auth `author_id`, required `body`, and `created_at`/`updated_at` timestamps. Database checks reject blank bodies and bodies longer than 500 characters. `author_id` is indexed and feed ordering is indexed by timestamp and ID.
- `likes`: composite primary key `(post_id, user_id)`, a `created_at` timestamp, and cascading foreign keys to posts and users.

The composite primary key is the database guarantee that a user cannot like the same post twice. Deleting a post cascades to its likes, so orphaned likes are not left behind.

Apply committed migrations to a new database with:

```bash
npm run db:migrate
```

Confirm that the same runtime connection can see all required tables and has select/insert/update/delete access with:

```bash
npm run db:check
```

`db:check` requires `DATABASE_URL` (or `TEST_DATABASE_URL`), checks `user`, `session`, `account`, `verification`, `posts`, and `likes`, and never prints connection credentials.

The application uses ordinary PostgreSQL connections, so changing from Neon to another PostgreSQL provider only requires changing `DATABASE_URL`.

## API

Better Auth is mounted at `/api/auth/[...all]`.

```text
GET    /api/posts
POST   /api/posts
DELETE /api/posts/:id
POST   /api/posts/:id/likes
DELETE /api/posts/:id/likes
GET    /api/users/:id
GET    /api/users/:id/posts
```

All application endpoints require an authenticated session. Post creation accepts `{ "body": "..." }`. The server derives the author and like user from the session; clients cannot supply identity fields. Post deletion includes the author condition in the delete query.

Invalid input returns `400`, unauthenticated requests return `401`, missing users/posts return `404`, and duplicate likes return `409`.

## Tests

Run the complete local static/test/build verification with:

```bash
npm run verify
```

For database-backed integration tests, set `DATABASE_URL` or `TEST_DATABASE_URL` to a migrated PostgreSQL database first. The tests cover authentication, protected mutations, post creation and ordering, ownership, duplicate-like rejection, like counts, unlike behavior, profile posts, database cascade deletion, and unknown users.

## Deployment

Deploy the repository as a Next.js project on Vercel. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and any additional `BETTER_AUTH_TRUSTED_ORIGINS` values in the Vercel project environment, run the committed migrations against the production PostgreSQL database, run `npm run db:check`, and deploy.

Neon is a suitable hosted PostgreSQL option, but no Neon-specific application code is required.

## Intentionally not included

Followers, following, comments, messages, media uploads, stories, notifications, recommendations, hashtags, search, bookmarks, moderation, roles, reposts, sharing, OAuth, and profile editing are outside this reference implementation.
