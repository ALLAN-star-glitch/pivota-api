# Pivota API Monorepo
# PivotaApi

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is almost ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/nest?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/GoC2kkwzsW)


## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve api-gateway
npx prisma generate --schema=apps/auth-service/prisma/schema.prisma

```
npm run start:dev:auth

To create a production bundle:

```sh
npx nx build api-gateway
```

To see all available targets to run for a project, run:

```sh
npx nx show project api-gateway
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/nest:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/node:lib mylib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)


[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/nest?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
NestJS + Nx microservices platform with an API Gateway, domain services, and asynchronous event delivery.

## Service Overview

Current workspace applications:

- `api-gateway`: Public HTTP API, auth/guard enforcement, Swagger docs.
- `auth-service`: Identity, credentials, sessions, token lifecycle.
- `profile-service`: User/org profile domain.
- `admin-service`: Plans, subscriptions, RBAC, admin controls.
- `listings-service`: Jobs, housing, categories, contractors.
- `notification-service`: Email + SMS delivery, activity tracking, realtime WebSocket stream.
- `payment-service`: Payment domain scaffold.

Shared libraries:

- `libs/dtos`, `libs/interfaces`, `libs/protos`, `libs/filters`, `libs/constants`, etc.

## Transport Map

- `api-gateway -> domain services`: gRPC (primary synchronous path).
- `auth-service -> notification-service`: RabbitMQ events (`user.onboarded`, `organization.onboarded`, `user.login.email`).
- Domain services: mixed gRPC + Kafka + RabbitMQ depending on module.
- `notification-service`: HTTP API + WebSocket (`/ws/notifications`) + RMQ/Kafka consumers.

## Notification Integration (Fully Wired)

Notification is now integrated in two paths:

1. **Event-driven notifications (automatic)**
- Auth emits RMQ events.
- Notification service consumes queue and sends emails.

2. **Gateway-driven notifications (manual/operational)**
- New `NotificationsGatewayModule` in API Gateway proxies notification HTTP endpoints.
- Client metadata (`ip/device/os/user-agent`) is forwarded from gateway to notification service.
- Access is secured with JWT; send endpoints are role-gated.

### New API Gateway Endpoints

Base controller: `notifications-gateway` (versioned under `/v1`)

- `POST /v1/notifications-gateway/sms/send`: Send one SMS through `notification-service` and capture activity.
- `POST /v1/notifications-gateway/sms/send/bulk`: Send one SMS message to many recipients in a single request.
- `GET /v1/notifications-gateway/activities`: Fetch combined notification history (`sms` + `email`) with filters.
- `GET /v1/notifications-gateway/sms/activities`: Fetch only SMS delivery history.
- `GET /v1/notifications-gateway/sms/realtime`: Read realtime notification socket stats (connected clients, server state).
- `GET /v1/notifications-gateway/sms/health`: Check SMS provider configuration/health.
- `GET /v1/notifications-gateway/stats`: Read notification realtime stats from `notification-service`.
- `GET /v1/notifications-gateway/status`: Get an operational summary (stats + SMS health + websocket info).
- `GET /v1/notifications-gateway/ws-info`: Get websocket connection details and event names for clients.

### Notification Service Endpoints (Internal/Direct)

- `POST /sms/send`: Internal SMS send endpoint used by gateway proxy.
- `POST /sms/send/bulk`: Internal bulk SMS endpoint.
- `GET /sms/activities`: Internal SMS-only activity history.
- `GET /sms/realtime`: Internal realtime stats endpoint.
- `GET /sms/health`: Internal SMS provider health endpoint.
- `GET /notifications/activities`: Internal cross-channel activity history.
- `GET /notifications/stats`: Internal notification stats endpoint.
- `GET /notifications/ws-info`: Internal websocket metadata endpoint.
- WebSocket: `ws://<notification-host>:<port>/ws/notifications` for live `notification.connected` and `notification.activity` events.

## Notification Flow (Brief)

1. User signs up or logs in via `api-gateway` -> `auth-service`.
2. `auth-service` emits RMQ event to notification queue.
3. `notification-service` consumes the event and sends email.
4. SMS can be triggered via `api-gateway` notification endpoints.
5. Every notification attempt (email/SMS) is recorded in activity memory store.
6. Each activity is pushed to WebSocket clients as `notification.activity`.
7. Operations team can inspect history/stats via gateway endpoints.

## Required Notification Configuration

Set these variables in your environment files (for each environment as needed):

- `NOTIFICATION_SERVICE_PORT` (e.g. `3015`)
- `NOTIFICATION_SERVICE_BASE_URL` (used by API Gateway, e.g. `http://localhost:3015`)
- `NOTIFICATION_EMAIL_QUEUE` (recommended canonical queue name)
- `RMQ_URL` or `RABBITMQ_URL` (both are supported)

The app now supports queue/url fallback order so existing environments continue to work.

## Running Services

Examples (dev):

```sh
npm exec nx serve notification-service
npm exec nx serve api-gateway
npm exec nx serve auth-service
```

Run tests/build:

```sh
npm exec nx run notification-service:test
npm exec nx run notification-service:build
npm exec nx run api-gateway:test
npm exec nx run api-gateway:build
```

## Notes

- Swagger is exposed by `api-gateway` at `/api`.
- Notification activity storage is currently in-memory for runtime observability.
- If you need persistent audit/history, add a DB-backed notification repository next.
