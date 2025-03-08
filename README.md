# Notion Intelligence

A powerful AI-powered analytics and chat interface that provides users with an intelligent assistant capable of analyzing data, answering questions, and visualizing information through both text and voice interactions.

## Features

- **Multiple AI Assistant Types**
  - Knowledge Assistant: General information and knowledge
  - Frameworks Assistant: Technical guidance on frameworks
  - Benchmarks Assistant: Data analysis with visualizations
  - General Assistant: Versatile support for any task

- **Multi-Modal Interactions**
  - Text-based chat interface
  - Voice input/output capabilities
  - File attachment support
  - Structured data visualization

- **Real-Time Communication**
  - WebSocket integration for low-latency responses
  - Voice-to-text and text-to-speech processing
  - Connection state management with automatic reconnection

- **Session Management**
  - Persistent conversation history
  - Thread-based context preservation
  - Session-based organization

## Technical Architecture

### Frontend Structure

The application is built with React, TypeScript, and Tailwind CSS, following a component-based architecture:

- **Pages**: Main application views (Index, TestRealtimeChat)
- **Components**: Reusable UI elements (Header, UnifiedSearch, ConversationList)
- **Hooks**: Custom logic encapsulation (useRealtimeChat, useTextToSpeech, useVoiceRecording)
- **Types**: TypeScript definitions for type safety
- **Integrations**: External service connections (Supabase)

### Backend Services

The application leverages Supabase Edge Functions for backend processing:

- **chat-with-assistant**: Processes chat messages and returns AI responses
- **text-to-speech**: Converts text to spoken audio
- **voice-to-text**: Transcribes audio to text
- **realtime-voice-chat**: Manages WebSocket connections for real-time audio communication

### Database Structure

The Supabase database contains two main tables:

- **conversations**: Stores chat history and AI responses
  - query, response, assistant_type, thread_id, session_id, visualizations
- **chat_attachments**: Stores uploaded file references
  - file_path, file_name, content_type, size

### External APIs

- **OpenAI API**: Powers the AI assistants and processing
  - GPT-4 for text generation
  - Whisper for speech-to-text
  - TTS for text-to-speech

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/bun
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/notion-intelligence.git
   cd notion-intelligence
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

5. Deploy Supabase Edge Functions:
   ```bash
   supabase functions deploy chat-with-assistant
   supabase functions deploy text-to-speech
   supabase functions deploy voice-to-text
   supabase functions deploy realtime-voice-chat
   ```

## Usage

### Text Interaction

1. Select the appropriate assistant type (Knowledge, Frameworks, Benchmarks, or General)
2. Type your question in the search box
3. View the AI response and any visualizations
4. Continue the conversation in the same thread or start a new one

### Voice Interaction

1. Enable voice mode by clicking the voice button
2. Click the microphone button to start recording
3. Speak your question clearly
4. The AI will transcribe your speech, process it, and respond with both text and voice

### File Attachments

1. Click the attachment button to upload files
2. Select files relevant to your query
3. Submit your question with the attachments for context-aware responses

## Project Structure

```
src/
├── components/      # UI components
│   ├── Header.tsx   # App header
│   ├── UnifiedSearch.tsx  # Search interface
│   ├── ConversationList.tsx  # Chat history display
│   └── search/      # Search-related components
├── hooks/           # Custom React hooks
│   ├── useRealtimeChat.ts  # WebSocket management
│   ├── useTextToSpeech.ts  # TTS functionality
│   └── useVoiceRecording.ts  # Voice input processing
├── pages/           # Application pages
│   ├── Index.tsx    # Main application page
│   └── TestRealtimeChat.tsx  # WebSocket testing page
├── types/           # TypeScript type definitions
│   └── chat.ts      # Chat-related types
├── lib/             # Utility libraries
│   └── types.ts     # Shared type definitions
└── integrations/    # External service integrations
    └── supabase/    # Supabase client setup

supabase/
├── functions/       # Supabase Edge Functions
│   ├── chat-with-assistant/  # AI chat processing
│   ├── text-to-speech/       # Text-to-speech conversion
│   ├── voice-to-text/        # Speech-to-text transcription
│   └── realtime-voice-chat/  # WebSocket server
└── migrations/      # Database migrations
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the AI models
- Supabase for the backend infrastructure
- React and Tailwind CSS for the frontend framework
