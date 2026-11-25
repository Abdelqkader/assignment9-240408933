# Assignment 9 - Reading List (REST API + React)

My first full-stack application. The **server** is a REST API made with Node.js and Express 5
that keeps a list of books in memory. The **client** is a React app made with Vite that shows
the books and lets the user search, filter, sort, add, edit, mark as read, rate and delete
them, with a statistics panel. Every filter and every change goes through the API.

Student: Abdulkader Almslem - 240408933

## How to run

You need Node.js (current LTS, I used v24) and npm. The server and the client are two
separate npm projects inside one repository, so they are installed and started separately,
in two terminals.

```bash
git clone https://github.com/Abdelqkader/assignment9-240408933.git
cd assignment9-240408933
```

**Terminal 1 - server (port 3000):**

```bash
cd server
npm install
npm start        # node server.js
# or: npm run dev   (node --watch server.js, restarts on every change)
```

**Terminal 2 - client (port 5173):**

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Then open http://localhost:5173.

### Environment variables

| Where  | Variable        | Default                 | Used for                                         |
| ------ | --------------- | ----------------------- | ------------------------------------------------ |
| server | `PORT`          | `3000`                  | the port the API listens on                      |
| server | `CLIENT_ORIGIN` | `http://localhost:5173` | the only origin allowed by CORS                  |
| client | `VITE_API_URL`  | (from `.env`)           | base URL of the API, read with `import.meta.env` |

Example with other ports:

```bash
PORT=4000 CLIENT_ORIGIN=http://localhost:5174 npm start      # in server/
VITE_API_URL=http://localhost:4000 npx vite --port 5174       # in client/
```

There is **no Vite proxy**: the browser calls the API directly on another origin, and the
server answers with the CORS headers itself (the `cors` package).

## File organization

```
/assignment9
 ├─ server/
 │   ├─ server.js        Express app: cors, express.json, logger, routes, /api 404, error middleware
 │   ├─ booksStore.js    the in-memory data; async functions with a short delay; never changes data in place
 │   ├─ validate.js      hand-written validation of the id, the book body and the query options
 │   ├─ package.json     "type": "module", start / dev scripts, express 5 + cors
 │   └─ package-lock.json
 ├─ client/
 │   ├─ src/
 │   │   ├─ api/books.js         the only file with fetch(): request() helper + one function per route
 │   │   ├─ components/
 │   │   │   ├─ Controls.jsx     search, genre, read, sort field and direction
 │   │   │   ├─ BookList.jsx     loading / error / empty states and the list
 │   │   │   ├─ BookItem.jsx     one book: read checkbox, rating, edit, delete
 │   │   │   ├─ BookForm.jsx     add (POST) and edit (PUT) form, shows the server's error
 │   │   │   ├─ StatsPanel.jsx   numbers from GET /api/stats
 │   │   │   └─ genres.js        the genre list for the selects
 │   │   ├─ App.jsx              state, effects with AbortController, handlers
 │   │   ├─ main.jsx
 │   │   └─ index.css
 │   ├─ .env.example     documents VITE_API_URL
 │   ├─ index.html
 │   ├─ vite.config.js   only the React plugin (no proxy)
 │   └─ package.json
 ├─ .gitignore           node_modules/, .env, dist/
 └─ README.md
```

## The API

| Method and path        | Success                         | Errors        |
| ---------------------- | ------------------------------- | ------------- |
| `GET /api/books`       | 200, array of books             | 400           |
| `GET /api/books/:id`   | 200, one book                   | 400, 404      |
| `POST /api/books`      | 201, the book + `Location`      | 400, 409      |
| `PUT /api/books/:id`   | 200, the replaced book          | 400, 404, 409 |
| `PATCH /api/books/:id` | 200, the merged book            | 400, 404, 409 |
| `DELETE /api/books/:id`| 204, no body                    | 400, 404      |
| `GET /api/stats`       | 200, `{ total, read, unread, averageRating, byGenre }` | - |
| `GET /api/crash`       | always 500 (test route, see below) | - |

A book is `{ id, title, author, year, genre, read, rating }`:

- `title`, `author`: strings, 1 to 100 characters after trimming (they are saved trimmed)
- `year`: integer from 1000 to the current year
- `genre`: `fiction`, `non-fiction`, `science`, `history`, `fantasy` or `other`
- `read`: boolean, default `false`
- `rating`: integer 1 to 5 or `null`, default `null`, allowed only when `read` is `true`
- two books cannot have the same title **and** author (case-insensitive, spaces trimmed) → 409
- the `id` in a body is ignored, the server gives the next id

The server starts with 7 seed books in 5 genres, 3 of them rated. When it restarts, all
changes are lost and the seed comes back.

### Query options of `GET /api/books`

`genre`, `read` (`true`/`false`), `q` (text in title or author, case-insensitive),
`sort` (`title`, `author`, `year`, `rating`; default by id), `order` (`asc`/`desc`),
`limit` (1-50, default 50) and `page` (default 1). They can be combined. An invalid value or
a repeated parameter (`?genre=fiction&genre=history`) is a 400. Books with no rating are
always last when sorting by rating, in both directions. The list is filtered with
`filter()` and sorted on a copy (`[...result].sort(...)`), so the stored array never changes.
The total number of matching books (before paging) is sent in an `X-Total-Count` header.

### Errors

- Every error is JSON: `{ "error": "message" }`.
- An id that is not a positive integer (`abc`, `0`, `-1`, `1.5`) → 400; a valid id that does
  not exist → 404.
- Anything under `/api` that matches no route → 404 `{ "error": "Not found" }`
  (registered with `app.use('/api', ...)` after the routes, no `'*'` wildcard).
- Broken JSON in the body → 400 `{ "error": "Malformed JSON in request body" }`: the error
  middleware checks `err.type === 'entity.parse.failed'`, which is the error that
  `express.json()` throws.
- Any other error → the 4-parameter error middleware logs it with `console.error` and answers
  500 `{ "error": "Something went wrong" }` without the stack trace.
- **`GET /api/crash` is kept on purpose**: it throws inside an `async` handler to prove that
  Express 5 catches the rejected promise and sends it to the error middleware (in Express 4
  this would be an unhandled rejection and the request would hang).
