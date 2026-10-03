import MeOApp from '../../components/MeOApp';

/**
 * Chat, at /chat.
 *
 * It used to be the app's home. The record is now, because a trend product
 * whose landing page is a chat box reads as a chatbot with health features
 * rather than a record with a chat in it. Chat did not get smaller in the
 * move — it is still where the conversation happens, and it is still reached
 * from the rail, from chat history, and from the ask bar on every screen.
 *
 * `?chat=<id>` still opens a specific conversation, so existing links and the
 * chat-history rail keep working unchanged.
 */
export default function ChatPage() {
  return <MeOApp />;
}
