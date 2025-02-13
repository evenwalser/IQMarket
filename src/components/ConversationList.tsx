
import type { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
}

export const ConversationList = ({ conversations }: ConversationListProps) => (
  <section className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
    </div>
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <div key={conversation.id} className="bg-white p-6 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-lg text-gray-900">Q: {conversation.query}</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full capitalize">
              {conversation.assistant_type}
            </span>
          </div>
          <p className="text-gray-600 whitespace-pre-wrap">A: {conversation.response}</p>
          <div className="mt-4 text-sm text-gray-500">
            {new Date(conversation.created_at).toLocaleString()}
          </div>
        </div>
      ))}
      {conversations.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No conversations yet. Start by asking a question above!
        </div>
      )}
    </div>
  </section>
);
