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

## Testing evidence (curl)

All requests were run one after another on a fresh server (`npm start`, port 3000), so the
ids follow from each other: the new book gets id 8, then it is replaced, patched and deleted.

### 1. 200 - list with three query parameters (`genre`, `sort`, `order`)

```text
$ curl --include 'http://localhost:3000/api/books?genre=fantasy&sort=year&order=desc'
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
X-Total-Count: 2
Content-Type: application/json; charset=utf-8
Content-Length: 253
ETag: W/"fd-pRzv8m1xKRgqqCg8bsQFjLQl/Y8"
Date: Wed, 25 Nov 2026 09:26:34 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":5,"title":"Harry Potter and the Philosopher's Stone","author":"J. K. Rowling","year":1997,"genre":"fantasy","read":true,"rating":null},{"id":2,"title":"The Hobbit","author":"J. R. R. Tolkien","year":1937,"genre":"fantasy","read":true,"rating":4}]
```

### 2. 200 - one book

```text
$ curl --include http://localhost:3000/api/books/2
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 110
ETag: W/"6e-9AdyQmZJ1Y/CI8MRUH3OCiWSPOg"
Date: Wed, 25 Nov 2026 09:26:34 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":2,"title":"The Hobbit","author":"J. R. R. Tolkien","year":1937,"genre":"fantasy","read":true,"rating":4}
```

### 3. 200 - statistics before a change

```text
$ curl --include http://localhost:3000/api/stats
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 127
ETag: W/"7f-8zWTdf5feT9Y/2LkocGHEo6qpHA"
Date: Wed, 25 Nov 2026 09:26:34 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"total":7,"read":4,"unread":3,"averageRating":4.3,"byGenre":{"fiction":2,"fantasy":2,"science":1,"history":1,"non-fiction":1}}
```

### 4. 201 - create a book (see the `Location` header)

```text
$ curl --include -X POST http://localhost:3000/api/books -H 'Content-Type: application/json' -d '{"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction"}'
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Location: /api/books/8
Content-Type: application/json; charset=utf-8
Content-Length: 105
ETag: W/"69-bRUU6L2nZZm/3RjqXh8F4RLTPHI"
Date: Wed, 25 Nov 2026 09:26:34 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":8,"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction","read":false,"rating":null}
```

### 5. 200 - statistics after the change (total 8, unread 4, fiction 3)

```text
$ curl --include http://localhost:3000/api/stats
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 127
ETag: W/"7f-drajYDwCoAywPGm55LsgsMwWtKQ"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"total":8,"read":4,"unread":4,"averageRating":4.3,"byGenre":{"fiction":3,"fantasy":2,"science":1,"history":1,"non-fiction":1}}
```

### 6. 400 - invalid body (title is only spaces; the first error found is reported)

```text
$ curl --include -X POST http://localhost:3000/api/books -H 'Content-Type: application/json' -d '{"title":"   ","author":"Nobody","year":2020,"genre":"poetry"}'
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 67
ETag: W/"43-sNxjvQ6Jmivl36QLqYP4tKm8k0s"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"title must be 1 to 100 characters long (after trimming)"}
```

### 7. 400 - repeated query parameter

```text
$ curl --include 'http://localhost:3000/api/books?genre=fiction&genre=history'
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 61
ETag: W/"3d-mM/lbCwRVSd1m+BO8iyf9IKY7kg"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Query parameter \"genre\" must be given only once"}
```

### 8. 404 - missing book

```text
$ curl --include http://localhost:3000/api/books/999
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 30
ETag: W/"1e-nII6TvJB0wD3fJxruN5B/LUFAwo"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Book 999 not found"}
```

### 9. 409 - duplicate (different case than the stored "The Hobbit")

```text
$ curl --include -X POST http://localhost:3000/api/books -H 'Content-Type: application/json' -d '{"title":"the hobbit","author":"j. r. r. tolkien","year":1937,"genre":"fantasy"}'
HTTP/1.1 409 Conflict
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 67
ETag: W/"43-ZtJW1SCUO4s/7xn7IAjxRxaLI2k"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"A book with this title and author already exists (id 2)"}
```

### 10. PUT on book 8 - the complete book is replaced (`read` true, `rating` falls back to null)

```text
$ curl --include -X PUT http://localhost:3000/api/books/8 -H 'Content-Type: application/json' -d '{"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction","read":true}'
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 104
ETag: W/"68-P03hxOpJp1jwYMGeBu4E+gZPYLw"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":8,"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction","read":true,"rating":null}
```

### 11. PATCH on the same book - only `rating` is sent, the other fields are kept

```text
$ curl --include -X PATCH http://localhost:3000/api/books/8 -H 'Content-Type: application/json' -d '{"rating":5}'
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 101
ETag: W/"65-J5DQCHlXXFFR8UMn+unZ2GqX4xQ"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":8,"title":"Dune","author":"Frank Herbert","year":1965,"genre":"fiction","read":true,"rating":5}
```

### 12. The same `{"rating":4}` body with PUT is rejected, because PUT needs the complete book

```text
$ curl --include -X PUT http://localhost:3000/api/books/8 -H 'Content-Type: application/json' -d '{"rating":4}'
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 34
ETag: W/"22-uN2H8g79GW9vawU3mMuBV3BsIQo"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"title must be a string"}
```

### 13. 204 - delete (no body)

```text
$ curl --include -X DELETE http://localhost:3000/api/books/8
HTTP/1.1 204 No Content
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5


```

### 14. 404 - the same delete repeated

```text
$ curl --include -X DELETE http://localhost:3000/api/books/8
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 28
ETag: W/"1c-1QQcND0LDOBunuPChekW40nphqw"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Book 8 not found"}
```

### 15. 400 - id that is not a positive integer

```text
$ curl --include http://localhost:3000/api/books/abc
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 59
ETag: W/"3b-k8JOlb5okVjFme4eNDvGjAmj2iM"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Book id must be a positive integer, got \"abc\""}
```

### 16. 400 - malformed JSON (JSON error, not the HTML page of Express)

```text
$ curl --include -X POST http://localhost:3000/api/books -H 'Content-Type: application/json' -d '{"title": "Broken",'
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 42
ETag: W/"2a-Kp6r6EoQdfa9J08PVdn0M1MJ9NY"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Malformed JSON in request body"}
```

### 17. 500 - the error middleware (`/api/crash` throws inside an async handler)

```text
$ curl --include http://localhost:3000/api/crash
HTTP/1.1 500 Internal Server Error
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 32
ETag: W/"20-cI8B1wZuBEyTE5ClDvphKZx7wd0"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Something went wrong"}
```

### 18. 404 - unknown /api path

```text
$ curl --include http://localhost:3000/api/unknown
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Type: application/json; charset=utf-8
Content-Length: 21
ETag: W/"15-bm7tJgu8FHlq5QU+Y6gDxOGPfRc"
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Not found"}
```

## CORS preflight evidence

**Browser.** With the server on port 3009 (`CLIENT_ORIGIN=http://localhost:5179`) and the
client on port 5179 (`VITE_API_URL=http://localhost:3009`), I clicked the *Read* checkbox of
"A Brief History of Time". The Network tab showed two requests to the same URL:

| # | Request                                 | Status         |
| - | --------------------------------------- | -------------- |
| 1 | `OPTIONS http://localhost:3009/api/books/3` | 204 No Content |
| 2 | `PATCH http://localhost:3009/api/books/3`   | 200 OK         |

The `OPTIONS` request is the preflight. The browser sends it because the real request is a
`PATCH` (not a "simple" method) with `Content-Type: application/json` (not a "simple" header).
The `GET` requests of the list and the stats have no preflight, because a `GET` with no custom
headers is a simple request. This is also why my `request()` helper sets `Content-Type` only
when there is a body. The response headers of the preflight were the same as this curl
request that imitates it:

```text
$ curl --include -X OPTIONS http://localhost:3000/api/books/3 -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: PATCH' -H 'Access-Control-Request-Headers: content-type'
HTTP/1.1 204 No Content
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin, Access-Control-Request-Headers
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Headers: content-type
Access-Control-Expose-Headers: Location,X-Total-Count
Content-Length: 0
Date: Wed, 25 Nov 2026 09:26:35 GMT
Connection: keep-alive
Keep-Alive: timeout=5


```

`Access-Control-Allow-Origin` is the exact client origin (not `*`), `Access-Control-Allow-Methods`
contains `PATCH`, and `Access-Control-Allow-Headers` allows `content-type`, so the browser then
sent the real `PATCH`.

## Reasoning questions

**1. Parameters.** The id says *which* resource the request is about, so it is part of the
path: `/api/books/3` is the address of one book, and `PUT`/`PATCH`/`DELETE` act on that address.
`genre` and `sort` do not name a resource, they only change *how* the collection
`/api/books` is shown (which items, in which order), and they are optional and can be combined,
which is what a query string is for. If the id were in the query (`/api/books?id=3`), the URL
would point to the whole collection, so `DELETE /api/books?id=3` looks like "delete the
collection", the id becomes optional (I would have to handle `/api/books` with no id for
`PUT`/`DELETE`), and a `Location: /api/books/8` header would not match the way books are read.

**2. Body parsing (experiment).** I moved `app.use(express.json())` below all the routes and
sent a valid `POST /api/books` with curl. The route ran before the JSON parser, so `req.body`
was `undefined` (in Express 5 it is not even `{}` any more). My validation saw a non-object and
the response was **400** `{"error":"Request body must be a JSON object"}`, even though the JSON
was correct. With `express.json()` back above the routes the same request gave 201. The order
of `app.use` matters because middleware and routes run in the order they are registered.

**3. One response (experiment).** I removed the `return` before the 409 response in
`POST /api/books` and sent a duplicate of "The Hobbit". curl still got the
**409** `{"error":"A book with this title and author already exists (id 2)"}`, but the handler
did not stop: it went on, saved the duplicate as book 8, and then
`res.status(201).location(...)` tried to set a header on a response that was already sent. The
server logged `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the
client`. So the client was told "conflict" while the data was changed anyway, and
`GET /api/books?q=hobbit` returned two Hobbits. `res.json()` sends the response but does not
end the function; only `return` does.

**4. PUT and PATCH.** In my client, ticking *Read* or choosing a rating uses `PATCH` with only
`{ "read": true }` or `{ "rating": 4 }`: the row does not have (and should not need) the whole
book, and sending only the change means it cannot overwrite a title that someone else just
edited. The *Edit* form uses `PUT` because the form contains all fields of the book, and saving
it means "the book is now exactly this", so a field left empty must become invalid instead of
silently keeping its old value. The curl evidence shows the difference: a `PUT` with only
`{"rating":4}` is a 400 (`title must be a string`), the same body with `PATCH` is merged into
the existing book.

**5. CORS (experiment).** I started the server with `CLIENT_ORIGIN=http://localhost:5999` while
the client ran on `http://localhost:5179`. The page showed "Could not load books: Failed to
fetch" and the console showed *"Access to fetch at 'http://localhost:3009/api/books?order=asc'
from origin 'http://localhost:5179' has been blocked by CORS policy: The
'Access-Control-Allow-Origin' header has a value 'http://localhost:5999' that is not equal to
the supplied origin"*. The server **did** log `GET /api/stats` and `GET /api/books?order=asc` and
answered 200: CORS does not stop the request, the browser receives the response and refuses to
give it to my JavaScript. curl still works because CORS is a rule of the browser to protect
the user's pages from other sites; curl is not a browser, it does not send an `Origin` it has
to respect and it does not check `Access-Control-Allow-Origin`.

**6. Validation.** The form checks are only for the user's comfort. Anyone can call the API
without my form (curl, Postman, another script, or the browser dev tools after removing the
`required` attribute), so the client cannot be trusted. Also some rules can only be checked on
the server: a duplicate title/author needs all the stored books, and "rating only when read"
for a `PATCH` needs the existing book. That is why the client shows the server's message
(for example the 409 text) instead of its own.

**7. State (experiment).** I added "Dune", rated "A Brief History of Time", changed the year of "The Little Prince" and
deleted "Dune" again, then stopped the server with Ctrl+C and started it again. After reloading the page, all the changes were gone and
the 7 seed books came back with their original ratings. The data lives only in a JavaScript
variable in the memory of the Node process, so it disappears when the process ends. To keep it,
the data has to be written somewhere outside the process: a file, or better a database, which
is exactly why `booksStore.js` already has async functions - later they can be replaced by
database calls without changing the routes.

## Self-study notes

- **`URLSearchParams`** (MDN). `params.set(key, value)` and `params.toString()` build the
  query string and encode every value, so a search like `war & peace` becomes
  `q=war+%26+peace` instead of breaking into two parameters. In `getBooks()` I skip empty
  values so only the used filters are sent. For the ids in the path I used
  `encodeURIComponent()`.
- **`localeCompare`** (MDN). `a.localeCompare(b, undefined, { sensitivity: 'base' })` returns a
  negative number, 0 or a positive number, exactly what `sort()` needs, and it ignores case
  and accents, so "émile" and "Emile" sort together. Multiplying by `-1` gives the descending
  order.
- **`import.meta.env` in Vite** (Vite docs, "Env Variables and Modes"). Vite reads `.env` when
  the dev server starts (so a restart is needed after a change) and replaces
  `import.meta.env.VITE_API_URL` with the value. Only variables starting with `VITE_` are
  exposed, because everything given to the client code ends up in the JavaScript the browser
  downloads; the prefix stops secrets in the same `.env` from being published by accident.
  `.env` is in `.gitignore`, `.env.example` documents the variable.
- **Empty 204 in Express 5** (Express API docs). `res.status(204).end()` sends the status with no
  body. `res.sendStatus(204)` also works. `res.status(204).json(...)` would be wrong because a
  204 must not have a body. On the client, `response.json()` on a 204 throws, so my helper
  returns `null` for 204 before reading the body.
- **Cancelling a fetch** (MDN, `AbortController`). The list effect creates a controller, passes
  `controller.signal` to `fetch`, and the cleanup calls `controller.abort()`. When the filters
  change quickly, React runs the cleanup of the old effect first, so the old request is
  aborted and its promise rejects with an error whose `name` is `'AbortError'`; I ignore that
  error instead of showing it. Without this, a slow old response could arrive after a newer one
  and replace the list with old results.
- **cors package** (expressjs/cors README). `cors({ origin: CLIENT_ORIGIN })` answers the
  preflight automatically and sets `Access-Control-Allow-Origin` to that one origin. I added
  `exposedHeaders: ['Location', 'X-Total-Count']` because the browser hides non-simple
  response headers from JavaScript unless the server exposes them.
- **Express 5 and async errors** (Express 5 migration guide). A rejected promise from an async
  handler is passed to `next(err)` automatically, so I don't need try/catch in each route.

## Challenges

- **Un-reading a rated book.** `PATCH { "read": false }` on a rated book made the merged book
  invalid (rating without read). I decided that un-marking *read* also clears the rating,
  unless the request sends a rating itself; then the normal validation decides.
- **Repeated query parameters.** I didn't know how Express gives `?genre=a&genre=b`. Testing it
  showed `req.query.genre` becomes an array, so the validation rejects any array value.
- **Not updating the screen too early.** My first idea was to change the checkbox immediately.
  The assignment says to wait for the server, so the list only changes with the book the server
  sends back, and the row is disabled while the request is running.
- **The missing-return experiment** surprised me the first time: with the `GET` route nothing
  visible happened, because the second `res.json()` did not need to set a new header. Only
  with the `POST` route (where `location()` sets a header) did the error appear, and it also
  showed the real danger: the duplicate was saved.
- **Two npm projects in one repo.** The `.gitignore` at the root uses `node_modules/` (without a
  leading `/`) so it ignores both `server/node_modules` and `client/node_modules`.
