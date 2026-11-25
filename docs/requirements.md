# Requirements

## API (Node.js 24: Express, Fastify or NestJS)
- `GET /health`: status and uptime
- `GET /tasks`: list tasks
- `POST /tasks`: create; `title` required, non-empty string
- Custom request-logging middleware and request validation
- Real database or in-memory/JSON store; data access stays async
- Jest, coverage 80%+, unit tests mock data access

## Web (React: Vite or Next.js/CRA)
- Task list and create form with client-side validation
- Loading, empty and error states
- API health badge driven by `GET /health`
- Separated components, custom hooks or state management, consistent styling

## DevOps
- Production Dockerfile (bonus: multi-stage)
- Terraform or CDK for EC2 (or simpler AWS hosting); no manual console setup
- Security groups for SSH and the API port
- GitHub Actions on push to `main`: install, test, build image, deploy

## Documentation and submission
- README: setup, tests, scalability at 10x, observability, AI usage
  including one correction made to AI output
- Public repository and a live URL for `GET /health`
- Time budget: 4-6 hours
