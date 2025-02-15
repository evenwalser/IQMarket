
import { ChatMessage } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-500">
        Start a conversation with your AI advisor
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] px-4 py-2 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <div>{msg.content}</div>
            {msg.attachments?.map((attachment, i) => (
              <div key={i} className="mt-2">
                {attachment.type === 'image' ? (
                  <img 
                    src={attachment.url} 
                    alt={attachment.name}
                    className="max-w-full rounded-md"
                  />
                ) : (
                  <a 
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline"
                  >
                    {attachment.name}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};
