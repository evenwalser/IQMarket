# IQ Marketplace

A professional expertise marketplace with AI-powered analysis tools. Connect with experts, schedule consultations, and leverage custom RAG agents.

![IQ Marketplace](https://placehold.co/600x400?text=IQ+Marketplace)

## Overview

IQ Marketplace combines AI-powered document analysis with a marketplace for professional expertise. Users can:

- Upload documents and get AI-generated insights, visualizations, and analysis
- Find and book time with knowledge professionals across various domains
- Create and monetize custom RAG agents trained on specialized knowledge

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/iq-marketplace.git
cd iq-marketplace

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase and OpenAI keys

# Start development server
npm run dev
```

## Key Features

### AI-Powered Analysis
- Upload documents for instant visual insights
- Conversational interface for interactive data exploration
- Automatic chart and table generation with mermaid.js

### Professional Marketplace
- Create a professional profile with expertise tags
- Set availability and hourly rates
- Book time with knowledge professionals

### Custom RAG Agents
- Create specialized RAG agents for specific domains
- Train on custom knowledge bases
- Monetize premium agents

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI**: OpenAI API with embeddings and advanced prompting
- **Visualization**: mermaid.js for charts and diagrams

## Architecture

IQ Marketplace is built with a modern, scalable architecture:

- **Database**: PostgreSQL with row-level security
- **Authentication**: Supabase Auth with social providers
- **File Handling**: Secure storage with access controls
- **Application Logic**: Edge functions for serverless operations

## Roadmap

Our development roadmap:

- **Q2 2024**: LinkedIn OAuth integration, booking system
- **Q3 2024**: Payment processing, calendar integration
- **Q4 2024**: Mobile app, expert analytics dashboard

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is proprietary and not licensed for public use or modification.

## Acknowledgments

- [OpenAI](https://openai.com) for their powerful AI models
- [Supabase](https://supabase.com) for the backend infrastructure
- [Vercel](https://vercel.com) for hosting recommendations
