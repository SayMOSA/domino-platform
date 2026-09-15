# Domino Tournament & Gaming Platform — NestJS Backend

A modular, production-oriented NestJS + MongoDB (Mongoose) backend for a domino tournament
platform: player accounts, rooms with multi-admin RBAC, match/score tracking, and real-time
chat (global, room-scoped, and private) over Socket.IO.

## Stack

- **NestJS 10** (TypeScript, strict mode)
- **MongoDB / Mongoose** via `@nestjs/mongoose`
- **JWT double-token auth** (`@nestjs/jwt` + `passport-jwt`) — short-lived access token,
  long-lived refresh token, refresh tokens hashed at rest and rotated on every use
- **Cloudinary** for avatar image storage (`multer` memory storage → stream upload)
- **Socket.IO** for real-time chat (global / room / private channels)
- **class-validator / class-transformer** for DTO validation
- **Swagger** at `/api/docs`

## Project layout

```
src/
  auth/            # register/login/OTP/refresh/logout, JWT strategies
  players/         # profile, avatar upload, stats aggregation
  rooms/           # room CRUD, membership, multi-admin management
  matches/         # domino match recording + history
  chat/            # REST history endpoints + ChatGateway (WebSocket)
  cloudinary/      # CloudinaryModule/Service (stream upload + delete)
  common/          # guards (JwtAuthGuard, RoomAdminGuard, WsJwtGuard), decorators
  config/          # typed configuration loader
```

## Setup

```bash
npm install
cp .env.example .env   # fill in Mongo URI, JWT secrets, Cloudinary credentials
npm run start:dev
```

Swagger UI: `http://localhost:3000/api/docs`

## Auth flow

1. `POST /auth/register` — creates an unverified account, optionally uploads an avatar,
   returns a `devOtp` (replace with a real email send in `AuthService.generateOtp`/`register`).
2. `POST /auth/verify-otp` — marks the account verified.
3. `POST /auth/login` — returns `accessToken` + `refreshToken` (also set as HttpOnly cookies).
4. `POST /auth/refresh` — guarded by `JwtRefreshAuthGuard`; rotates both tokens.
5. `POST /auth/logout` — clears the stored (hashed) refresh token, revoking the session.

Tokens are accepted either as `Authorization: Bearer <token>` or as HttpOnly cookies
(`accessToken`, `refreshToken`), matching the spec's dual-transport requirement.

## Authorization model

- `JwtAuthGuard` — required on every protected REST controller.
- `RoomAdminGuard` — additionally required on `POST /rooms/:roomId/admins` and
  `POST /rooms/:roomId/matches`; checks `req.user.sub` against `room.admins`.
- `WsJwtGuard` — verifies the same access token for WebSocket events (`register`, `sendGlobalMessage`,
  `sendRoomMessage`, `sendPrivateMessage`). Clients pass the token via
  `io('/chat', { auth: { token: accessToken } })`.

## WebSocket events (namespace `/chat`)

| Event                | Direction | Payload                                   |
|-----------------------|-----------|--------------------------------------------|
| `register`            | client→server | none — associates this socket with the authed player |
| `joinRoom`             | client→server | `{ roomId }` — joins Socket.IO room `room:<roomId>` |
| `sendGlobalMessage`    | client→server | `{ content }` |
| `sendRoomMessage`      | client→server | `{ roomId, content }` |
| `sendPrivateMessage`   | client→server | `{ recipientId, content }` |
| `globalMessage` / `roomMessage` / `privateMessage` | server→client | persisted `ChatMessage` document |

## Notable design decisions

- **Refresh token rotation + hashing**: only a bcrypt hash of the current refresh token is
  stored; every refresh call issues and persists a new pair, limiting a stolen token's lifetime.
- **OTP hashing**: OTPs are bcrypt-hashed before storage, same rationale as passwords.
- **Cloudinary memory storage**: avatar uploads never touch disk — `Multer` buffers the file,
  `CloudinaryService` streams it straight to Cloudinary and stores `secure_url` + `public_id`
  (the latter is required to delete/replace the image later).
- **Room admin list is an array**: the schema supports multiple admins per room from day one,
  and `RoomAdminGuard` / `RoomsService.addAdmin` enforce that only existing admins can promote
  new ones.
- **Match validation**: `MatchesService.recordMatch` rejects a player appearing on both teams,
  non-members being scored, and winning points not exceeding losing points.
- **Stats aggregation**: `PlayersService.getStats` computes wins/losses/points/win-rate directly
  from the `Match` collection rather than maintaining a denormalized counter, avoiding drift.

## Extending this

- Swap the `devOtp` return value in `AuthService` for a real transactional email provider.
- Add a `RolesGuard` keyed off `Player.role` (`ADMIN`) if you need platform-wide admin endpoints
  distinct from per-room admins.
- Add rate-limiting (`@nestjs/throttler`) on `/auth/*` endpoints before going to production.
