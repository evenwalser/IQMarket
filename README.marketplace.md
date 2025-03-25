# IQ Marketplace

A professional expertise marketplace with integrated AI analysis tools. This product enables knowledge workers to monetize their expertise and users to gain valuable insights through AI-powered analysis.

## Origin

IQ Marketplace evolved from technology initially developed for client work but has been completely reimagined as a standalone product with its own infrastructure, database, and APIs.

## Setup

1. This project uses a dedicated Supabase project "IQMarket" and dedicated OpenAI API
2. Update your `.env` file with the correct credentials:

```
VITE_SUPABASE_URL=https://kxuqtgigrxzhgdqltxno.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4dXF0Z2lncnh6aGdkcWx0eG5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5NDI4OTEsImV4cCI6MjA1ODUxODg5MX0.A-VmInc0GJ72CgKirCz27HhqnOjXxnx1bImCeogdpys
VITE_OPENAI_API_KEY=[your-new-openai-api-key]
```

3. To initialize the database schema:

```bash
cd notioniq
supabase link --project-ref kxuqtgigrxzhgdqltxno
supabase db push
```

## Core Features

1. **AI-Powered Analysis**
   - Document upload and intelligent visual insights
   - Conversational interface for data exploration
   - Automatic chart and table generation

2. **Professional Profiles**
   - Knowledge workers create detailed profiles
   - LinkedIn integration for verification
   - Expertise tagging and hourly rate setting

3. **Booking System**
   - Schedule time with knowledge experts
   - Integrated payment processing
   - Pre/post session document sharing

4. **RAG Agents Marketplace**
   - Create and share custom RAG agents
   - Train on specialized knowledge domains
   - Monetize premium AI agents

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenAI API, GPT-4, Embeddings
- **Data Visualization**: mermaid.js
- **Integrations**: LinkedIn (planned), Cronofy (planned), Stripe (planned)

## Architecture

IQ Marketplace is built with a modern, scalable architecture:

- **Database**: PostgreSQL with Row-Level Security
- **Authentication**: Supabase Auth with OAuth providers
- **Storage**: Secure file handling with access controls
- **API**: Edge functions for serverless operations
- **State Management**: React Query and Context API

## Deployment

For production deployment:

1. Configure proper environment variables for different environments
2. Set up continuous deployment pipeline
3. Implement monitoring and error tracking
4. Consider multi-region deployment for performance

## Roadmap

Future additions planned:
1. **Q2 2024**:
   - LinkedIn OAuth integration
   - Basic booking system

2. **Q3 2024**:
   - Calendar integration with Cronofy
   - Payment processing with Stripe

3. **Q4 2024**:
   - Advanced RAG agent customization
   - Analytics dashboard for professionals
   - Mobile app 