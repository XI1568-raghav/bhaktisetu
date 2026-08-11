# apps\mobile\lib\inbox.tsx

- MessagesEntry · function · L27-L75 — Profile-screen row that navigates to the role's messages screen and keeps an unread-message badge roughly fresh by polling the conversation count every 30 seconds.
- load · function · L34-L45 — Fetches the provider's conversations and reduces their per-conversation unread counts into a single badge total, silently keeping the prior count on failure.
- Counterparty · interface · L114-L118 — Describes the other participant in a conversation (id, display name, avatar) for list and thread headers.
- ConversationSummary · interface · L120-L130 — Shapes a conversation list item including side, unread count, last-message preview, and linked booking so the inbox can render rows without extra fetches.
- Message · interface · L132-L141 — Shapes a single thread message, distinguishing text, system, and call_link kinds plus a mine flag for bubble alignment.
- Inbox · function · L145-L248 — Conversation-list screen that polls the user's conversations every 3 seconds while authenticated and swaps to a Thread view when a row is tapped.
- onRefresh · function · L175-L179 — Pull-to-refresh handler that re-runs the conversation fetch under the refresh spinner.
- ConversationRow · function · L250-L288 — Renders one conversation row with initials avatar, unread badge, and a snippet that decorates system and call_link messages so they read differently from plain text.
- ThreadProps · interface · L290-L296 — Props contract for the Thread screen: which conversation to show, who the counterparty is, which side the viewer is on, and back/refresh callbacks.
- ExistingRating · interface · L298-L298 — Holds an already-submitted rating (stars plus optional text) so the RatingBar can show prior state instead of a blank form.
- Thread · function · L300-L499 — Single-conversation screen that incrementally syncs messages via a since-cursor poll, marks the thread read, and exposes send, video-call, and post-call rating actions.
- send · function · L374-L388 — Posts the trimmed draft to the conversation, then clears the input and refreshes both the thread and the list; a failed send leaves the draft in place for retry.
- onThreadRefresh · function · L390-L395 — Pull-to-refresh that resets the since-cursor so the next fetch reloads the full message history rather than an incremental delta.
- startCall · function · L397-L421 — Starts a Jitsi video call for the conversation, refreshes messages so the call_link card appears, and opens the room in the system browser with an alert fallback.
- submitRating · function · L423-L434 — Submits the devotee's star rating and optional review text for the conversation and stores it locally so the bar reflects the saved state.
- MessageBubble · function · L501-L549 — Renders a message according to its kind: centered system notice, a joinable video-call card that opens the Jitsi URL, or a standard chat bubble.
- RatingBarProps · interface · L551-L555 — Props contract for the RatingBar: any existing rating, the counterparty name for the prompt, and the submit callback.
- RatingBar · function · L557-L629 — Post-call rating bar shown to devotees once a call has ended, letting them pick a star rating with optional review text or edit a previously submitted rating.
