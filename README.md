Umami Food Services — Backend

Short description

This repository contains the backend services for Umami Food Services. It provides HTTP endpoints, webhook handlers, email notifications and payment integrations.

Prerequisites

- Node.js >= 20
- Yarn (or npm)
- Add a `.env` file with required environment variables

Install

Install dependencies:

    yarn install

Running (development)

Start the server in development (uses `nodemon`):

    yarn start

Notes

- The `start` script runs `nodemon index.js` (see `package.json`).
- There are no tests configured in this repository (`yarn test` prints a placeholder message).

Deployment

- This project has been deployed to Heroku; CI/CD can be configured to auto-deploy on `master` and `staging` branches.
- Example URLs used previously:
  - Production: https://umami-foods.herokuapp.com
  - Staging: https://umami-backend-staging-498a0ac23f8a.herokuapp.com
