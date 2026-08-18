import { getLatestConversationId, listMessages } from "@/lib/services/ai-service";
import { ChatView } from "./chat-view";

export default async function AiCoachPage() {
  const conversationId = await getLatestConversationId();
  const messages = conversationId ? await listMessages(conversationId) : [];

  return <ChatView initialConversationId={conversationId} initialMessages={messages} />;
}
