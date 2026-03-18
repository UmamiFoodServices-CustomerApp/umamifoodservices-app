# Umami Food Services — Backend

## Short description

This repository contains the backend services for Umami Food Services. It provides HTTP endpoints, webhook handlers, email notifications and payment integrations.

## Prerequisites

- Node.js >= 20
- Yarn (or npm)
- Create a `.env` file with required environment variables

## Install

Install dependencies:

```bash
yarn install
```

## Running (development)

Start the server in development (uses `nodemon`):

```bash
yarn start
```

## Notes

- The `start` script runs `nodemon index.js` (see `package.json`).
- There are no tests configured in this repository (`yarn test` prints a placeholder message).

## Deployment

- This project has been deployed to Heroku; CI/CD can be configured to auto-deploy on `master` and `staging` branches.
- Example URLs used previously:
  - Production: https://umami-foods.herokuapp.com
  - Staging: https://umami-backend-staging-498a0ac23f8a.herokuapp.com

## Repository

https://github.com/UmamiFoodServices-CustomerApp/umamifoodservices-app
.

# Cron Jobs

#### Run Weekly New Customer Signup Report Every Week Monday at 9:00 AM

`node src/cron-jobs/weeklyCustomerSignupReport.js`
