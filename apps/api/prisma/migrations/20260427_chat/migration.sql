-- Human-to-human chat (devotee ↔ provider) for post-payment service delivery.
-- Run this in Supabase SQL editor after the pgvector migration.

-- 1) Enums
CREATE TYPE "ChatConversationKind" AS ENUM (
  'puja_booking',
  'astrology',
  'wellness',
  'temple',
  'gaushala',
  'store_order',
  'support'
);

CREATE TYPE "ChatConversationStatus" AS ENUM ('open', 'closed');

CREATE TYPE "ChatMessageKind" AS ENUM ('text', 'system', 'call_link');

-- 2) chat_conversations
CREATE TABLE "chat_conversations" (
  "id"                UUID                       NOT NULL DEFAULT gen_random_uuid(),
  "kind"              "ChatConversationKind"     NOT NULL,
  "status"            "ChatConversationStatus"   NOT NULL DEFAULT 'open',
  "devotee_id"        UUID                       NOT NULL,
  "provider_id"       UUID                       NOT NULL,
  "linked_booking_id" UUID,
  "subject"           TEXT,
  "last_message_at"   TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "devotee_unread"    INTEGER                    NOT NULL DEFAULT 0,
  "provider_unread"   INTEGER                    NOT NULL DEFAULT 0,
  "created_at"        TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)               NOT NULL,

  CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_conversations_devotee_id_fkey"
    FOREIGN KEY ("devotee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chat_conversations_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "chat_conversations_devotee_id_last_message_at_idx"
  ON "chat_conversations" ("devotee_id", "last_message_at");
CREATE INDEX "chat_conversations_provider_id_last_message_at_idx"
  ON "chat_conversations" ("provider_id", "last_message_at");
CREATE INDEX "chat_conversations_linked_booking_id_idx"
  ON "chat_conversations" ("linked_booking_id");

-- 3) chat_messages
CREATE TABLE "chat_messages" (
  "id"              UUID               NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID               NOT NULL,
  "sender_id"       UUID               NOT NULL,
  "kind"            "ChatMessageKind"  NOT NULL DEFAULT 'text',
  "body"            TEXT               NOT NULL,
  "metadata"        JSONB,
  "read_at"         TIMESTAMP(3),
  "created_at"      TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chat_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "chat_messages_conversation_id_created_at_idx"
  ON "chat_messages" ("conversation_id", "created_at");

-- 4) chat_call_sessions
CREATE TABLE "chat_call_sessions" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id"  UUID         NOT NULL,
  "room_name"        TEXT         NOT NULL,
  "jitsi_url"        TEXT         NOT NULL,
  "started_by_id"    UUID         NOT NULL,
  "started_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at"         TIMESTAMP(3),
  "duration_seconds" INTEGER,

  CONSTRAINT "chat_call_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "chat_call_sessions_room_name_key" UNIQUE ("room_name"),
  CONSTRAINT "chat_call_sessions_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "chat_call_sessions_started_by_id_fkey"
    FOREIGN KEY ("started_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "chat_call_sessions_conversation_id_started_at_idx"
  ON "chat_call_sessions" ("conversation_id", "started_at");
