-- ServiceRating: post-call / post-delivery 1..5 star rating tied to a
-- ChatConversation. One rating per devotee per conversation. CASCADEs
-- with conversation removal so cleanup is automatic.

CREATE TABLE "service_ratings" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "devotee_id"      uuid NOT NULL,
  "provider_id"     uuid NOT NULL,
  "stars"           integer NOT NULL,
  "body"            text,
  "created_at"      timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_ratings_stars_check" CHECK ("stars" BETWEEN 1 AND 5),
  CONSTRAINT "service_ratings_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE,
  CONSTRAINT "service_ratings_devotee_id_fkey"
    FOREIGN KEY ("devotee_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "service_ratings_provider_id_fkey"
    FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "service_ratings_conversation_id_devotee_id_key"
  ON "service_ratings"("conversation_id", "devotee_id");

CREATE INDEX "service_ratings_provider_id_created_at_idx"
  ON "service_ratings"("provider_id", "created_at");
