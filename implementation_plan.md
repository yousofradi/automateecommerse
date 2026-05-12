# Implementation Plan (Final)

## Goal Description
Replace the existing MongoDB‑based backend with a **PostgreSQL** database accessed via **Prisma ORM** (TypeScript). Re‑implement the API using **Node.js + Express** (TypeScript) while preserving the current route signatures. Convert every vanilla‑JS page into **React (TypeScript) components** using Vite, importing the existing CSS unchanged so the UI looks identical.

## Confirmed Decisions
- **Render service names**: `ecommerce-api` (Web Service) and `ecommerce-frontend` (Static Site).
- **Admin authentication**: Keep the simple admin‑key middleware (`adminAuth`). No JWT for now.
- **Database**: Fresh PostgreSQL instance (no migration from MongoDB).
- **TypeScript**: Full TypeScript support for **both backend and frontend**.
- **Environment variables**: Replace `API_URL_PLACEHOLDER` with `REACT_APP_API_URL` runtime config; no other custom env vars needed.

## Project Structure
```
Autoecommerce/
├─ backend/                # Express + Prisma (TypeScript)
│   ├─ src/
│   │   ├─ server.ts
│   │   ├─ routes/
│   │   │   ├─ products.ts
│   │   │   ├─ collections.ts
│   │   │   ├─ orders.ts
│   │   │   └─ auth.ts
│   │   ├─ middleware/
│   │   │   └─ adminAuth.ts
│   │   └─ utils/
│   │       └─ cloudinary.ts
│   ├─ prisma/
│   │   ├─ schema.prisma   # full schema (see below)
│   │   └─ .env            # DATABASE_URL placeholder
│   ├─ tsconfig.json
│   └─ package.json
├─ frontend/               # Vite + React (TypeScript)
│   ├─ src/
│   │   ├─ main.tsx
│   │   ├─ App.tsx
│   │   ├─ api.ts          # thin wrapper around fetch, uses REACT_APP_API_URL
│   │   └─ components/
│   │       ├─ HomePage.tsx
│   │       ├─ ProductList.tsx
│   │       ├─ ProductDetail.tsx
│   │       ├─ AdminDashboard.tsx
│   │       └─ ... (other pages)
│   ├─ public/
│   │   └─ index.html
│   ├─ index.css          # copy of original CSS folder (all classes preserved)
│   ├─ tsconfig.json
│   ├─ vite.config.ts
│   └─ package.json
├─ render.yaml              # Render configuration for both services
└─ README.md                # Setup & deployment instructions
```

## Prisma Schema (`backend/prisma/schema.prisma`)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Users (admin & customer)
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  ADMIN
  CUSTOMER
}

// Categories / Collections
model Category {
  id          Int       @id @default(autoincrement())
  name        String
  slug        String    @unique
  description String?
  imageUrl    String?
  sortOrder   Int       @default(0)
  products    Product[]
}

// Products
model Product {
  id          Int          @id @default(autoincrement())
  name        String
  slug        String       @unique
  description String?
  basePrice   Decimal      @db.Decimal(10,2)
  salePrice   Decimal?     @db.Decimal(10,2)
  imageUrl    String?
  images      String[]     @default([])
  active      Boolean      @default(true)
  status      ProductStatus @default(ACTIVE)
  sortOrder   Int          @default(0)
  categories  Category[]   @relation("ProductCategories")
  options     OptionGroup[]
  variants    Variant[]
  orderItems  OrderItem[]
}

enum ProductStatus {
  ACTIVE
  DRAFT
}

model OptionGroup {
  id        Int          @id @default(autoincrement())
  name      String
  required  Boolean      @default(false)
  product   Product      @relation(fields: [productId], references: [id])
  productId Int
  values    OptionValue[]
}

model OptionValue {
  id        Int     @id @default(autoincrement())
  label     String
  price     Decimal @db.Decimal(10,2) @default(0)
  salePrice Decimal? @db.Decimal(10,2)
  group     OptionGroup @relation(fields: [groupId], references: [id])
  groupId   Int
}

model Variant {
  id          Int     @id @default(autoincrement())
  product     Product @relation(fields: [productId], references: [id])
  productId   Int
  combination Json   // e.g. {"color":"black","size":"M"}
  price       Decimal @db.Decimal(10,2) @default(0)
  salePrice   Decimal? @db.Decimal(10,2)
  cost        Decimal? @db.Decimal(10,2)
  quantity    Int?
  imageUrl    String?
  active      Boolean @default(true)
}

model Order {
  id            Int          @id @default(autoincrement())
  orderId       String       @unique
  user          User?        @relation(fields: [userId], references: [id])
  userId        Int?
  status        OrderStatus  @default(PENDING)
  discount      Decimal      @default(0) @db.Decimal(10,2)
  totalPrice    Decimal      @db.Decimal(10,2)
  shippingFee   Decimal      @db.Decimal(10,2)
  paymentMethod String
  paid          Boolean      @default(false)
  paidAmount    Decimal      @default(0) @db.Decimal(10,2)
  archived      Boolean      @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  items         OrderItem[]
}

enum OrderStatus {
  PENDING
  CANCELLED
  READY
}

model OrderItem {
  id              Int      @id @default(autoincrement())
  order           Order    @relation(fields: [orderId], references: [id])
  orderId         Int
  productId       Int
  name            String
  imageUrl        String?
  basePrice       Decimal   @db.Decimal(10,2)
  selectedOptions Json?    // [{groupName:"Color",label:"Red",price:0}]
  finalPrice      Decimal   @db.Decimal(10,2)
  quantity        Int
  discount        Decimal   @default(0) @db.Decimal(10,2)
}
```

## Key Files (Skeletons)
- `backend/package.json` – includes `typescript`, `ts-node-dev`, `express`, `@prisma/client`, `cors`, `dotenv`, `compression`.
- `backend/tsconfig.json` – strict mode, target ES2020, module commonjs.
- `backend/src/server.ts` – creates Express app, loads Prisma client, registers routes, error handling, health endpoint.
- `backend/src/middleware/adminAuth.ts` – checks `x-admin-key` header against env var `ADMIN_KEY`.
- `backend/src/routes/*.ts` – direct translation of existing Mongo routes to Prisma calls (products, collections, orders, etc.).
- `frontend/package.json` – Vite + React + TypeScript, includes `axios`, `react-router-dom`.
- `frontend/tsconfig.json` – standard Vite TS config.
- `frontend/vite.config.ts` – Vite config with React plugin.
- `frontend/src/api.ts` – wrapper around `fetch`/`axios` using `process.env.REACT_APP_API_URL`.
- `frontend/src/components/*.tsx` – each component imports the original CSS file (`import '../index.css';`) and reproduces the HTML markup as JSX while preserving all class names.
- `render.yaml` – defines both services and required environment variables (`DATABASE_URL`, `ADMIN_KEY`, `REACT_APP_API_URL`).

## Verification Plan
| Step | Method |
|------|--------|
| **Database** | `npx prisma migrate dev --name init` → verify tables in Supabase UI. |
| **API** | Run `npm run dev` (backend) and fire `curl`/Postman requests; responses must match current JSON shapes. |
| **React UI** | `npm run dev` (frontend) – visually compare to original pages (CSS unchanged). |
| **Admin Dashboard** | CRUD actions via UI; confirm data appears in PostgreSQL (use `npx prisma studio`). |
| **Render Deploy** | Push to Git; Render builds automatically. Test live URLs for both services. |
| **Performance** | Verify product list loads < 200 ms, caching works (in‑memory Map). |

---

## Next Steps (Tasks)
1. Scaffold **backend** folder with TypeScript, Prisma schema, and basic server.
2. Scaffold **frontend** Vite React TypeScript project; copy original CSS.
3. Implement route logic using Prisma (products, collections, orders, admin batch ops).
4. Create `adminAuth` middleware using env `ADMIN_KEY`.
5. Add API wrapper in the front‑end pointing to `REACT_APP_API_URL`.
6. Write `render.yaml` and add instructions for creating a Supabase PostgreSQL instance.
7. Update `README.md` with full setup, dev, and deployment steps.
8. Run local tests, ensure parity with previous functionality.
9. Commit and push – Render will build and deploy.

---

*All pending open questions have been answered. We can now proceed with the implementation.*
