-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'bhakti_pass', 'premium');

-- CreateEnum
CREATE TYPE "Tradition" AS ENUM ('shaiva', 'vaishnava', 'shakta', 'smarta', 'jain', 'sikh', 'buddhist', 'other');

-- CreateEnum
CREATE TYPE "TempleStatus" AS ENUM ('active', 'inactive', 'pending_review');

-- CreateEnum
CREATE TYPE "PriestVerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PriestStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "PriestTier" AS ENUM ('instant_pool', 'verified', 'senior', 'standard');

-- CreateEnum
CREATE TYPE "DispatchTier" AS ENUM ('instant', 'one_hour', 'senior', 'scheduled');

-- CreateEnum
CREATE TYPE "OfferState" AS ENUM ('sent', 'accepted', 'declined', 'expired', 'superseded');

-- CreateEnum
CREATE TYPE "PujaCategory" AS ENUM ('daily', 'special_occasion', 'planetary', 'prosperity', 'health', 'memorial', 'festival');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending_payment', 'confirmed', 'priest_assigned', 'in_progress', 'completed', 'video_uploaded', 'delivered', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('razorpay', 'stripe', 'phonepe');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('initiated', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('aarti', 'chalisa', 'mantra', 'bhajan', 'story', 'article', 'shloka', 'video_reel');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('offline', 'live', 'scheduled');

-- CreateEnum
CREATE TYPE "StreamProvider" AS ENUM ('YOUTUBE', 'IVS', 'EXTERNAL_RTMP');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('bhakti_pass_monthly', 'bhakti_pass_yearly', 'nri_premium_monthly', 'nri_premium_yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'past_due');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEVOTEE', 'PANDIT', 'STORE_OWNER', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MarketplacePlan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "MarketplaceSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'rejected');

-- CreateEnum
CREATE TYPE "ProviderRole" AS ENUM ('PANDIT', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'STORE_OWNER', 'TEMPLE_MANAGER', 'GAUSHALA_MANAGER');

-- CreateEnum
CREATE TYPE "ProviderPayoutStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'reversed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BOOKING', 'SUBSCRIPTION', 'PAYOUT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('PANDIT', 'STORE', 'ASTROLOGER', 'WELLNESS', 'GAUSHALA', 'TEMPLE');

-- CreateEnum
CREATE TYPE "ChatConversationKind" AS ENUM ('puja_booking', 'astrology', 'wellness', 'temple', 'gaushala', 'store_order', 'support');

-- CreateEnum
CREATE TYPE "ChatConversationStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "ChatMessageKind" AS ENUM ('text', 'system', 'call_link');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('created', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('BOOKING', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WellnessSessionType" AS ENUM ('YOGA', 'MEDITATION', 'VIPASSANA', 'PRANAYAMA', 'OTHER');

-- CreateEnum
CREATE TYPE "WellnessSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WellnessEnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "LeadRole" AS ENUM ('TEMPLE', 'PRIEST', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUEUED', 'EMAILED', 'REPLIED', 'CONVERTED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'REPLIED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'CONFIRMED', 'INVITED', 'CONVERTED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "ReferralClaimStatus" AS ENUM ('pending', 'signed_up', 'qualifying', 'rewarded', 'void');

-- CreateEnum
CREATE TYPE "CreditLedgerReason" AS ENUM ('referral_reward', 'refund_to_credit', 'promo_grant', 'redemption_debit', 'adjustment');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "preferred_language" "Language" NOT NULL DEFAULT 'hi',
    "location_city" TEXT,
    "location_state" TEXT,
    "is_nri" BOOLEAN NOT NULL DEFAULT false,
    "nri_country" TEXT,
    "gotra" TEXT,
    "nakshatra" TEXT,
    "rashi" TEXT,
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'free',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_reason" TEXT,
    "blocked_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMPTZ(6),
    "deletion_purge_after" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'home',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temples" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_local" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deity_primary" TEXT NOT NULL,
    "deities" TEXT[],
    "tradition" "Tradition" NOT NULL DEFAULT 'other',
    "address_line" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website_url" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "timing_info" JSONB,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_date" TIMESTAMP(3),
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "live_darshan_enabled" BOOLEAN NOT NULL DEFAULT false,
    "stream_url" TEXT,
    "status" "TempleStatus" NOT NULL DEFAULT 'pending_review',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector(1024),

    CONSTRAINT "temples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "specializations" TEXT[],
    "languages" TEXT[],
    "experience_years" INTEGER NOT NULL,
    "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
    "certification_docs" JSONB,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" "PriestVerificationStatus" NOT NULL DEFAULT 'pending',
    "bio" TEXT,
    "avatar_url" TEXT,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    "status" "PriestStatus" NOT NULL DEFAULT 'active',
    "tier" "PriestTier" NOT NULL DEFAULT 'standard',
    "is_on_duty" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "city" TEXT,
    "service_radius_km" INTEGER NOT NULL DEFAULT 15,
    "acceptance_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "response_sla_sec" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "priests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priest_puja_offerings" (
    "id" UUID NOT NULL,
    "priest_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deity" TEXT NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_bookings_per_slot" INTEGER NOT NULL DEFAULT 1,
    "available_slots" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "priest_puja_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temple_priests" (
    "id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "priest_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temple_priests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puja_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_local" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "PujaCategory" NOT NULL,
    "deity" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "nri_price" DECIMAL(10,2) NOT NULL,
    "samagri_included" BOOLEAN NOT NULL DEFAULT true,
    "samagri_items" JSONB,
    "images" JSONB NOT NULL DEFAULT '[]',
    "video_proof_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector(1024),

    CONSTRAINT "puja_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temple_puja_offerings" (
    "id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "puja_type_id" UUID NOT NULL,
    "price_override" DECIMAL(10,2),
    "nri_price" DECIMAL(10,2),
    "assigned_priest_id" UUID,
    "available_slots" JSONB NOT NULL DEFAULT '[]',
    "max_bookings_per_slot" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "temple_puja_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puja_bookings" (
    "id" UUID NOT NULL,
    "booking_number" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "puja_type_id" UUID NOT NULL,
    "priest_id" UUID,
    "temple_puja_offering_id" UUID NOT NULL,
    "priest_puja_offering_id" UUID,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time_slot" TEXT NOT NULL,
    "devotee_names" JSONB NOT NULL,
    "sankalp_details" TEXT,
    "special_instructions" TEXT,
    "price_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "platform_commission" DECIMAL(10,2) NOT NULL,
    "priest_payout" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending_payment',
    "video_proof_url" TEXT,
    "video_uploaded_at" TIMESTAMP(3),
    "prasad_delivery_requested" BOOLEAN NOT NULL DEFAULT false,
    "prasad_delivery_address_id" UUID,
    "prasad_tracking_id" TEXT,
    "rating" INTEGER,
    "review_text" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "dispatch_tier" "DispatchTier" NOT NULL DEFAULT 'scheduled',
    "offer_expires_at" TIMESTAMP(3),
    "assigned_via" TEXT,
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "cancel_policy_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puja_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_offers" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "priest_id" UUID NOT NULL,
    "state" "OfferState" NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temple_payouts" (
    "id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "ProviderPayoutStatus" NOT NULL DEFAULT 'pending',
    "reference" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temple_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "panchang_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "booking_id" UUID,
    "order_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "payment_gateway" "PaymentGateway" NOT NULL,
    "gateway_payment_id" TEXT,
    "gateway_order_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'initiated',
    "method" TEXT,
    "refund_amount" DECIMAL(10,2),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priest_payouts" (
    "id" UUID NOT NULL,
    "priest_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "payout_method" TEXT NOT NULL,
    "payout_reference" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priest_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" UUID NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "title_local" TEXT,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audio_url" TEXT,
    "video_url" TEXT,
    "image_url" TEXT,
    "deity" TEXT,
    "language" "Language" NOT NULL DEFAULT 'hi',
    "duration_seconds" INTEGER,
    "tags" TEXT[],
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector(1024),

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_panchang" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "tithi" TEXT NOT NULL,
    "nakshatra" TEXT NOT NULL,
    "yoga" TEXT NOT NULL,
    "karana" TEXT NOT NULL,
    "sunrise" TEXT NOT NULL,
    "sunset" TEXT NOT NULL,
    "rahu_kaal" TEXT NOT NULL,
    "shubh_muhurat" JSONB NOT NULL,
    "festivals" TEXT[],
    "vrat" TEXT[],
    "special_info" TEXT,
    "location_city" TEXT NOT NULL DEFAULT 'Delhi',

    CONSTRAINT "daily_panchang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_darshan_streams" (
    "id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "stream_key" TEXT NOT NULL,
    "playback_url" TEXT NOT NULL,
    "status" "StreamStatus" NOT NULL DEFAULT 'offline',
    "scheduled_start" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "peak_viewers" INTEGER NOT NULL DEFAULT 0,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "stream_provider" "StreamProvider" NOT NULL DEFAULT 'YOUTUBE',
    "youtube_video_id" TEXT,
    "youtube_channel_id" TEXT,
    "attribution" TEXT,
    "title" TEXT,
    "description" TEXT,
    "camera_location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_darshan_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "gateway_subscription_id" TEXT,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_translation_cache" (
    "id" UUID NOT NULL,
    "source_text" TEXT NOT NULL,
    "source_language" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "translated_text" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_translation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pandit_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "temple_name" TEXT,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "specialties" TEXT[],
    "languages" TEXT[],
    "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_pujas" INTEGER NOT NULL DEFAULT 0,
    "price_per_puja" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "bio" TEXT,
    "city" TEXT,
    "state" TEXT,
    "availability" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "available_for_antyeshti" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pandit_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antim_sanskar_bookings" (
    "id" UUID NOT NULL,
    "booking_number" TEXT NOT NULL,
    "deceased_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_relation" TEXT,
    "city" TEXT NOT NULL,
    "preferred_ghat" TEXT,
    "preferred_date" DATE NOT NULL,
    "package_tier" TEXT NOT NULL,
    "package_price_inr" INTEGER NOT NULL,
    "asthi_visarjan_river" TEXT,
    "notes" TEXT,
    "user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending_coordinator',
    "assigned_pandit_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antim_sanskar_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "store_name" TEXT NOT NULL,
    "gst_number" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "categories" TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "commission" DECIMAL(5,4) NOT NULL DEFAULT 0.20,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_products" (
    "id" UUID NOT NULL,
    "store_profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT,
    "category" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "astrologer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "specialties" TEXT[],
    "experience" INTEGER NOT NULL DEFAULT 0,
    "languages" TEXT[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_per_minute" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "total_consultations" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "availability" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "astrologer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wellness_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "specialties" TEXT[],
    "certifications" TEXT[],
    "experience" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_per_session" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "bio" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wellness_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gaushala_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "gaushala_name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "total_cows" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gaushala_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temple_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "temple_name" TEXT NOT NULL,
    "deity" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "total_streams" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temple_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "MarketplacePlan" NOT NULL,
    "role" "UserRole" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "MarketplaceSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "booking_id" TEXT,
    "store_order_id" TEXT,
    "wellness_enrollment_id" TEXT,
    "payout_request_id" UUID,
    "provider_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(5,4) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "role" "ProviderRole" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'pending',
    "method" TEXT NOT NULL DEFAULT 'upi',
    "reference" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processed_by" UUID,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "provider_type" "ProviderType" NOT NULL,
    "product_id" UUID,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_steps" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "step" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "kind" "ChatConversationKind" NOT NULL,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'open',
    "devotee_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "linked_booking_id" UUID,
    "subject" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devotee_unread" INTEGER NOT NULL DEFAULT 0,
    "provider_unread" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "kind" "ChatMessageKind" NOT NULL DEFAULT 'text',
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_call_sessions" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "room_name" TEXT NOT NULL,
    "jitsi_url" TEXT NOT NULL,
    "started_by_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,

    CONSTRAINT "chat_call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ratings" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "devotee_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "stars" INTEGER NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "gaushala_id" TEXT,
    "temple_id" UUID,
    "amount_inr" DECIMAL(10,2) NOT NULL,
    "razorpay_order_id" TEXT NOT NULL,
    "razorpay_payment_id" TEXT,
    "receipt_number" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'created',
    "donor_pan" TEXT,
    "dedication" TEXT,
    "donor_name_snapshot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cows" (
    "id" UUID NOT NULL,
    "gaushala_id" UUID NOT NULL,
    "tag_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT,
    "age_years" INTEGER,
    "gender" TEXT NOT NULL DEFAULT 'female',
    "health_status" TEXT NOT NULL DEFAULT 'healthy',
    "arrival_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cow_health_records" (
    "id" UUID NOT NULL,
    "cow_id" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "record_type" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "vet_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cow_health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" UUID NOT NULL,
    "gaushala_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'general',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_to_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "user_id" UUID NOT NULL,
    "store_profile_id" UUID,
    "items" JSONB NOT NULL,
    "total_amount_inr" DECIMAL(10,2) NOT NULL,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'PENDING',
    "shipping_address" JSONB NOT NULL,
    "payment_id" UUID,
    "tracking_number" TEXT,
    "status_history" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wellness_sessions" (
    "id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "WellnessSessionType" NOT NULL DEFAULT 'OTHER',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "price_inr" DECIMAL(10,2) NOT NULL,
    "room_url" TEXT,
    "status" "WellnessSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wellness_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wellness_enrollments" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "payment_id" UUID,
    "razorpay_order_id" TEXT,
    "status" "WellnessEnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attended_at" TIMESTAMP(3),

    CONSTRAINT "wellness_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "role" "LeadRole" NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT,
    "email" TEXT,
    "whatsapp_number" TEXT,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "last_contacted_at" TIMESTAMP(3),
    "contact_count" INTEGER NOT NULL DEFAULT 0,
    "converted_user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_logs" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "template_key" TEXT NOT NULL,
    "status" "OutreachStatus" NOT NULL,
    "payload" JSONB,
    "error_msg" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outreach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "preferredDeity" TEXT,
    "panchangOptIn" BOOLEAN NOT NULL DEFAULT true,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT NOT NULL,
    "referredByCode" TEXT,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "lastNudgedAt" TIMESTAMP(3),
    "nudgeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_drafts" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "posted_url" TEXT,
    "rejected_reason" TEXT,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fcm_device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "language" TEXT,
    "aarti_opt_in" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fcm_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temple_follows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temple_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kundli_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "dob" DATE NOT NULL,
    "tob" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kundli_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_slug" TEXT NOT NULL,
    "chapter_slug" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "scroll_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_verse" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_lesson_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "user_id" UUID NOT NULL,
    "current_days" INTEGER NOT NULL DEFAULT 0,
    "longest_days" INTEGER NOT NULL DEFAULT 0,
    "last_active_day" DATE NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_key" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gurukuls" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "website_url" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_verified" BOOLEAN NOT NULL DEFAULT false,
    "contact_phone" TEXT,
    "tradition" TEXT NOT NULL,
    "is_residential" BOOLEAN NOT NULL DEFAULT false,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "accepts_minors" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gurukuls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gurukul_programs" (
    "id" UUID NOT NULL,
    "gurukul_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "mode_of_study" TEXT NOT NULL,
    "age_min" INTEGER NOT NULL DEFAULT 0,
    "age_max" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "fee_annual_inr" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gurukul_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gurukul_applications" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "applicant_user_id" UUID NOT NULL,
    "applicant_type" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "student_age_years" INTEGER NOT NULL,
    "student_email" TEXT,
    "guardian_name" TEXT,
    "guardian_relation" TEXT,
    "guardian_phone" TEXT,
    "guardian_aadhaar_last4" TEXT,
    "consent_signed" BOOLEAN NOT NULL DEFAULT false,
    "consent_signed_at" TIMESTAMP(3),
    "statement" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "forwarded_at" TIMESTAMP(3),
    "decision_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gurukul_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_claims" (
    "id" UUID NOT NULL,
    "code_id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referee_id" UUID,
    "booking_id" UUID,
    "status" "ReferralClaimStatus" NOT NULL DEFAULT 'pending',
    "reward_amount" DECIMAL(10,2),
    "reward_currency" TEXT,
    "reward_ledger_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rewarded_at" TIMESTAMP(3),

    CONSTRAINT "referral_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance_paise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "delta_paise" INTEGER NOT NULL,
    "reason" "CreditLedgerReason" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "money_audit_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" TEXT NOT NULL DEFAULT 'system',
    "actor_id" TEXT,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "payment_id" TEXT,
    "commission_id" TEXT,
    "payout_id" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gateway" TEXT,
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT,
    "gateway_refund_id" TEXT,
    "status_before" TEXT,
    "status_after" TEXT,
    "idempotency_key" TEXT,
    "request_id" TEXT,
    "ip" TEXT,
    "note" TEXT,
    "metadata" JSONB,

    CONSTRAINT "money_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_link_tokens" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_confirmation',
    "code_hash" TEXT,
    "code_expires_at" TIMESTAMPTZ(6),
    "code_attempts" INTEGER NOT NULL DEFAULT 0,
    "channel" TEXT,
    "reason" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(6),
    "purge_after" TIMESTAMPTZ(6),
    "purged_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "warnings" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "temples_slug_key" ON "temples"("slug");

-- CreateIndex
CREATE INDEX "temples_slug_idx" ON "temples"("slug");

-- CreateIndex
CREATE INDEX "temples_city_idx" ON "temples"("city");

-- CreateIndex
CREATE INDEX "temples_state_idx" ON "temples"("state");

-- CreateIndex
CREATE INDEX "temples_is_verified_idx" ON "temples"("is_verified");

-- CreateIndex
CREATE INDEX "temples_city_state_status_idx" ON "temples"("city", "state", "status");

-- CreateIndex
CREATE UNIQUE INDEX "priests_user_id_key" ON "priests"("user_id");

-- CreateIndex
CREATE INDEX "priest_puja_offerings_priest_id_idx" ON "priest_puja_offerings"("priest_id");

-- CreateIndex
CREATE INDEX "priest_puja_offerings_is_active_idx" ON "priest_puja_offerings"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "temple_priests_temple_id_priest_id_key" ON "temple_priests"("temple_id", "priest_id");

-- CreateIndex
CREATE UNIQUE INDEX "puja_types_slug_key" ON "puja_types"("slug");

-- CreateIndex
CREATE INDEX "puja_types_slug_idx" ON "puja_types"("slug");

-- CreateIndex
CREATE INDEX "puja_types_category_idx" ON "puja_types"("category");

-- CreateIndex
CREATE INDEX "puja_types_is_active_idx" ON "puja_types"("is_active");

-- CreateIndex
CREATE INDEX "temple_puja_offerings_assigned_priest_id_idx" ON "temple_puja_offerings"("assigned_priest_id");

-- CreateIndex
CREATE UNIQUE INDEX "temple_puja_offerings_temple_id_puja_type_id_key" ON "temple_puja_offerings"("temple_id", "puja_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "puja_bookings_booking_number_key" ON "puja_bookings"("booking_number");

-- CreateIndex
CREATE INDEX "puja_bookings_user_id_idx" ON "puja_bookings"("user_id");

-- CreateIndex
CREATE INDEX "puja_bookings_temple_id_idx" ON "puja_bookings"("temple_id");

-- CreateIndex
CREATE INDEX "puja_bookings_status_idx" ON "puja_bookings"("status");

-- CreateIndex
CREATE INDEX "puja_bookings_scheduled_date_idx" ON "puja_bookings"("scheduled_date");

-- CreateIndex
CREATE INDEX "puja_bookings_temple_id_scheduled_date_status_idx" ON "puja_bookings"("temple_id", "scheduled_date", "status");

-- CreateIndex
CREATE INDEX "puja_bookings_priest_puja_offering_id_idx" ON "puja_bookings"("priest_puja_offering_id");

-- CreateIndex
CREATE INDEX "puja_bookings_priest_id_idx" ON "puja_bookings"("priest_id");

-- CreateIndex
CREATE INDEX "puja_bookings_created_at_idx" ON "puja_bookings"("created_at" DESC);

-- CreateIndex
CREATE INDEX "puja_bookings_dispatch_tier_status_idx" ON "puja_bookings"("dispatch_tier", "status");

-- CreateIndex
CREATE INDEX "dispatch_offers_booking_id_state_idx" ON "dispatch_offers"("booking_id", "state");

-- CreateIndex
CREATE INDEX "dispatch_offers_priest_id_state_idx" ON "dispatch_offers"("priest_id", "state");

-- CreateIndex
CREATE INDEX "dispatch_offers_state_expires_at_idx" ON "dispatch_offers"("state", "expires_at");

-- CreateIndex
CREATE INDEX "temple_payouts_temple_id_status_idx" ON "temple_payouts"("temple_id", "status");

-- CreateIndex
CREATE INDEX "temple_payouts_status_idx" ON "temple_payouts"("status");

-- CreateIndex
CREATE INDEX "temple_payouts_booking_id_idx" ON "temple_payouts"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_panchang_opt_in_idx" ON "push_subscriptions"("panchang_opt_in");

-- CreateIndex
CREATE INDEX "payments_gateway_payment_id_idx" ON "payments"("gateway_payment_id");

-- CreateIndex
CREATE INDEX "payments_gateway_order_id_idx" ON "payments"("gateway_order_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "priest_payouts_priest_id_idx" ON "priest_payouts"("priest_id");

-- CreateIndex
CREATE INDEX "priest_payouts_status_idx" ON "priest_payouts"("status");

-- CreateIndex
CREATE INDEX "priest_payouts_booking_id_idx" ON "priest_payouts"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_items_slug_key" ON "content_items"("slug");

-- CreateIndex
CREATE INDEX "content_items_slug_idx" ON "content_items"("slug");

-- CreateIndex
CREATE INDEX "content_items_type_idx" ON "content_items"("type");

-- CreateIndex
CREATE INDEX "content_items_deity_idx" ON "content_items"("deity");

-- CreateIndex
CREATE INDEX "content_items_language_idx" ON "content_items"("language");

-- CreateIndex
CREATE INDEX "content_items_status_idx" ON "content_items"("status");

-- CreateIndex
CREATE INDEX "content_items_created_at_idx" ON "content_items"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_panchang_date_key" ON "daily_panchang"("date");

-- CreateIndex
CREATE INDEX "daily_panchang_date_location_city_idx" ON "daily_panchang"("date", "location_city");

-- CreateIndex
CREATE INDEX "live_darshan_streams_temple_id_idx" ON "live_darshan_streams"("temple_id");

-- CreateIndex
CREATE INDEX "live_darshan_streams_status_idx" ON "live_darshan_streams"("status");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_translation_cache_content_hash_key" ON "ai_translation_cache"("content_hash");

-- CreateIndex
CREATE INDEX "user_role_assignments_user_id_idx" ON "user_role_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_user_id_role_key" ON "user_role_assignments"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "pandit_profiles_user_id_key" ON "pandit_profiles"("user_id");

-- CreateIndex
CREATE INDEX "pandit_profiles_city_idx" ON "pandit_profiles"("city");

-- CreateIndex
CREATE INDEX "pandit_profiles_approved_idx" ON "pandit_profiles"("approved");

-- CreateIndex
CREATE INDEX "pandit_profiles_available_for_antyeshti_idx" ON "pandit_profiles"("available_for_antyeshti");

-- CreateIndex
CREATE UNIQUE INDEX "antim_sanskar_bookings_booking_number_key" ON "antim_sanskar_bookings"("booking_number");

-- CreateIndex
CREATE INDEX "antim_sanskar_bookings_city_idx" ON "antim_sanskar_bookings"("city");

-- CreateIndex
CREATE INDEX "antim_sanskar_bookings_preferred_date_idx" ON "antim_sanskar_bookings"("preferred_date");

-- CreateIndex
CREATE INDEX "antim_sanskar_bookings_status_idx" ON "antim_sanskar_bookings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "store_profiles_user_id_key" ON "store_profiles"("user_id");

-- CreateIndex
CREATE INDEX "store_profiles_city_idx" ON "store_profiles"("city");

-- CreateIndex
CREATE INDEX "store_profiles_approved_idx" ON "store_profiles"("approved");

-- CreateIndex
CREATE INDEX "store_products_store_profile_id_idx" ON "store_products"("store_profile_id");

-- CreateIndex
CREATE INDEX "store_products_is_active_idx" ON "store_products"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "astrologer_profiles_user_id_key" ON "astrologer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "astrologer_profiles_approved_idx" ON "astrologer_profiles"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "wellness_profiles_user_id_key" ON "wellness_profiles"("user_id");

-- CreateIndex
CREATE INDEX "wellness_profiles_approved_idx" ON "wellness_profiles"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "gaushala_profiles_user_id_key" ON "gaushala_profiles"("user_id");

-- CreateIndex
CREATE INDEX "gaushala_profiles_approved_idx" ON "gaushala_profiles"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "temple_profiles_user_id_key" ON "temple_profiles"("user_id");

-- CreateIndex
CREATE INDEX "temple_profiles_city_idx" ON "temple_profiles"("city");

-- CreateIndex
CREATE INDEX "temple_profiles_approved_idx" ON "temple_profiles"("approved");

-- CreateIndex
CREATE INDEX "marketplace_subscriptions_user_id_idx" ON "marketplace_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "marketplace_subscriptions_status_idx" ON "marketplace_subscriptions"("status");

-- CreateIndex
CREATE INDEX "commissions_provider_id_idx" ON "commissions"("provider_id");

-- CreateIndex
CREATE INDEX "commissions_status_idx" ON "commissions"("status");

-- CreateIndex
CREATE INDEX "commissions_booking_id_idx" ON "commissions"("booking_id");

-- CreateIndex
CREATE INDEX "commissions_store_order_id_idx" ON "commissions"("store_order_id");

-- CreateIndex
CREATE INDEX "commissions_wellness_enrollment_id_idx" ON "commissions"("wellness_enrollment_id");

-- CreateIndex
CREATE INDEX "commissions_payout_request_id_idx" ON "commissions"("payout_request_id");

-- CreateIndex
CREATE INDEX "commissions_created_at_idx" ON "commissions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "commissions_provider_id_status_payout_request_id_idx" ON "commissions"("provider_id", "status", "payout_request_id");

-- CreateIndex
CREATE INDEX "payout_requests_provider_id_status_idx" ON "payout_requests"("provider_id", "status");

-- CreateIndex
CREATE INDEX "payout_requests_status_idx" ON "payout_requests"("status");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "reviews_provider_id_idx" ON "reviews"("provider_id");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at" DESC);

-- CreateIndex
CREATE INDEX "onboarding_steps_user_id_idx" ON "onboarding_steps"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_steps_user_id_role_step_key" ON "onboarding_steps"("user_id", "role", "step");

-- CreateIndex
CREATE INDEX "chat_conversations_devotee_id_last_message_at_idx" ON "chat_conversations"("devotee_id", "last_message_at");

-- CreateIndex
CREATE INDEX "chat_conversations_provider_id_last_message_at_idx" ON "chat_conversations"("provider_id", "last_message_at");

-- CreateIndex
CREATE INDEX "chat_conversations_linked_booking_id_idx" ON "chat_conversations"("linked_booking_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_call_sessions_room_name_key" ON "chat_call_sessions"("room_name");

-- CreateIndex
CREATE INDEX "chat_call_sessions_conversation_id_started_at_idx" ON "chat_call_sessions"("conversation_id", "started_at");

-- CreateIndex
CREATE INDEX "service_ratings_provider_id_created_at_idx" ON "service_ratings"("provider_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_ratings_conversation_id_devotee_id_key" ON "service_ratings"("conversation_id", "devotee_id");

-- CreateIndex
CREATE UNIQUE INDEX "donations_razorpay_order_id_key" ON "donations"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "donations_receipt_number_key" ON "donations"("receipt_number");

-- CreateIndex
CREATE INDEX "donations_user_id_created_at_idx" ON "donations"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "donations_gaushala_id_created_at_idx" ON "donations"("gaushala_id", "created_at");

-- CreateIndex
CREATE INDEX "donations_temple_id_created_at_idx" ON "donations"("temple_id", "created_at");

-- CreateIndex
CREATE INDEX "cows_gaushala_id_created_at_idx" ON "cows"("gaushala_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cows_gaushala_id_tag_number_key" ON "cows"("gaushala_id", "tag_number");

-- CreateIndex
CREATE INDEX "cow_health_records_cow_id_recorded_at_idx" ON "cow_health_records"("cow_id", "recorded_at");

-- CreateIndex
CREATE INDEX "volunteers_gaushala_id_active_idx" ON "volunteers"("gaushala_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets"("created_at" DESC);

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticket_id_created_at_idx" ON "support_ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_order_number_key" ON "store_orders"("order_number");

-- CreateIndex
CREATE INDEX "store_orders_user_id_idx" ON "store_orders"("user_id");

-- CreateIndex
CREATE INDEX "store_orders_store_profile_id_idx" ON "store_orders"("store_profile_id");

-- CreateIndex
CREATE INDEX "store_orders_status_idx" ON "store_orders"("status");

-- CreateIndex
CREATE INDEX "store_orders_created_at_idx" ON "store_orders"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "store_orders_user_id_idempotency_key_key" ON "store_orders"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "wellness_sessions_instructor_id_idx" ON "wellness_sessions"("instructor_id");

-- CreateIndex
CREATE INDEX "wellness_sessions_scheduled_at_idx" ON "wellness_sessions"("scheduled_at");

-- CreateIndex
CREATE INDEX "wellness_sessions_status_idx" ON "wellness_sessions"("status");

-- CreateIndex
CREATE INDEX "wellness_enrollments_user_id_idx" ON "wellness_enrollments"("user_id");

-- CreateIndex
CREATE INDEX "wellness_enrollments_status_idx" ON "wellness_enrollments"("status");

-- CreateIndex
CREATE INDEX "wellness_enrollments_razorpay_order_id_idx" ON "wellness_enrollments"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "wellness_enrollments_session_id_user_id_key" ON "wellness_enrollments"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "leads_role_status_idx" ON "leads"("role", "status");

-- CreateIndex
CREATE INDEX "leads_city_role_idx" ON "leads"("city", "role");

-- CreateIndex
CREATE UNIQUE INDEX "leads_role_email_key" ON "leads"("role", "email");

-- CreateIndex
CREATE UNIQUE INDEX "leads_role_phone_key" ON "leads"("role", "phone");

-- CreateIndex
CREATE INDEX "outreach_logs_lead_id_idx" ON "outreach_logs"("lead_id");

-- CreateIndex
CREATE INDEX "outreach_logs_status_sent_at_idx" ON "outreach_logs"("status", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_key" ON "waitlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_referralCode_key" ON "waitlist"("referralCode");

-- CreateIndex
CREATE INDEX "waitlist_referralCode_idx" ON "waitlist"("referralCode");

-- CreateIndex
CREATE INDEX "waitlist_referredByCode_idx" ON "waitlist"("referredByCode");

-- CreateIndex
CREATE INDEX "waitlist_status_idx" ON "waitlist"("status");

-- CreateIndex
CREATE INDEX "content_drafts_status_generated_at_idx" ON "content_drafts"("status", "generated_at");

-- CreateIndex
CREATE INDEX "content_drafts_type_idx" ON "content_drafts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "fcm_device_tokens_device_token_key" ON "fcm_device_tokens"("device_token");

-- CreateIndex
CREATE INDEX "fcm_device_tokens_user_id_idx" ON "fcm_device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "temple_follows_temple_id_idx" ON "temple_follows"("temple_id");

-- CreateIndex
CREATE UNIQUE INDEX "temple_follows_user_id_temple_id_key" ON "temple_follows"("user_id", "temple_id");

-- CreateIndex
CREATE INDEX "kundli_requests_signature_idx" ON "kundli_requests"("signature");

-- CreateIndex
CREATE INDEX "kundli_requests_user_id_idx" ON "kundli_requests"("user_id");

-- CreateIndex
CREATE INDEX "reading_progress_user_id_idx" ON "reading_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_user_id_book_slug_key" ON "reading_progress"("user_id", "book_slug");

-- CreateIndex
CREATE INDEX "user_lesson_progress_user_id_idx" ON "user_lesson_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_lesson_progress_user_id_lesson_id_key" ON "user_lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_key_key" ON "user_badges"("user_id", "badge_key");

-- CreateIndex
CREATE UNIQUE INDEX "gurukuls_slug_key" ON "gurukuls"("slug");

-- CreateIndex
CREATE INDEX "gurukuls_state_city_idx" ON "gurukuls"("state", "city");

-- CreateIndex
CREATE INDEX "gurukuls_tradition_idx" ON "gurukuls"("tradition");

-- CreateIndex
CREATE INDEX "gurukul_programs_gurukul_id_idx" ON "gurukul_programs"("gurukul_id");

-- CreateIndex
CREATE INDEX "gurukul_applications_program_id_status_idx" ON "gurukul_applications"("program_id", "status");

-- CreateIndex
CREATE INDEX "gurukul_applications_applicant_user_id_idx" ON "gurukul_applications"("applicant_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_claims_referrer_id_status_idx" ON "referral_claims"("referrer_id", "status");

-- CreateIndex
CREATE INDEX "referral_claims_referee_id_idx" ON "referral_claims"("referee_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_credits_user_id_key" ON "user_credits"("user_id");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_user_id_created_at_idx" ON "credit_ledger_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_reason_idx" ON "credit_ledger_entries"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_entries_user_id_idempotency_key_key" ON "credit_ledger_entries"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "money_audit_events_booking_id_occurred_at_idx" ON "money_audit_events"("booking_id", "occurred_at");

-- CreateIndex
CREATE INDEX "money_audit_events_payment_id_occurred_at_idx" ON "money_audit_events"("payment_id", "occurred_at");

-- CreateIndex
CREATE INDEX "money_audit_events_commission_id_idx" ON "money_audit_events"("commission_id");

-- CreateIndex
CREATE INDEX "money_audit_events_payout_id_idx" ON "money_audit_events"("payout_id");

-- CreateIndex
CREATE INDEX "money_audit_events_actor_id_occurred_at_idx" ON "money_audit_events"("actor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "money_audit_events_event_type_occurred_at_idx" ON "money_audit_events"("event_type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "money_audit_events_occurred_at_idx" ON "money_audit_events"("occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "money_audit_events_idempotency_key_key" ON "money_audit_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "magic_link_tokens_expires_at_idx" ON "magic_link_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "magic_link_tokens_user_email_idx" ON "magic_link_tokens"("user_email");

-- CreateIndex
CREATE INDEX "account_deletion_requests_user_id_created_at_idx" ON "account_deletion_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "account_deletion_requests_purge_after_idx" ON "account_deletion_requests"("purge_after");

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priests" ADD CONSTRAINT "priests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priest_puja_offerings" ADD CONSTRAINT "priest_puja_offerings_priest_id_fkey" FOREIGN KEY ("priest_id") REFERENCES "priests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_priests" ADD CONSTRAINT "temple_priests_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_priests" ADD CONSTRAINT "temple_priests_priest_id_fkey" FOREIGN KEY ("priest_id") REFERENCES "priests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_puja_offerings" ADD CONSTRAINT "temple_puja_offerings_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_puja_offerings" ADD CONSTRAINT "temple_puja_offerings_puja_type_id_fkey" FOREIGN KEY ("puja_type_id") REFERENCES "puja_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_puja_offerings" ADD CONSTRAINT "temple_puja_offerings_assigned_priest_id_fkey" FOREIGN KEY ("assigned_priest_id") REFERENCES "priests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puja_bookings" ADD CONSTRAINT "puja_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puja_bookings" ADD CONSTRAINT "puja_bookings_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puja_bookings" ADD CONSTRAINT "puja_bookings_puja_type_id_fkey" FOREIGN KEY ("puja_type_id") REFERENCES "puja_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puja_bookings" ADD CONSTRAINT "puja_bookings_priest_id_fkey" FOREIGN KEY ("priest_id") REFERENCES "priests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puja_bookings" ADD CONSTRAINT "puja_bookings_temple_puja_offering_id_fkey" FOREIGN KEY ("temple_puja_offering_id") REFERENCES "temple_puja_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puja_bookings" ADD CONSTRAINT "puja_bookings_priest_puja_offering_id_fkey" FOREIGN KEY ("priest_puja_offering_id") REFERENCES "priest_puja_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puja_bookings" ADD CONSTRAINT "puja_bookings_prasad_delivery_address_id_fkey" FOREIGN KEY ("prasad_delivery_address_id") REFERENCES "user_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "puja_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_priest_id_fkey" FOREIGN KEY ("priest_id") REFERENCES "priests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_payouts" ADD CONSTRAINT "temple_payouts_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_payouts" ADD CONSTRAINT "temple_payouts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "puja_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "puja_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priest_payouts" ADD CONSTRAINT "priest_payouts_priest_id_fkey" FOREIGN KEY ("priest_id") REFERENCES "priests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priest_payouts" ADD CONSTRAINT "priest_payouts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "puja_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_darshan_streams" ADD CONSTRAINT "live_darshan_streams_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_store_profile_id_fkey" FOREIGN KEY ("store_profile_id") REFERENCES "store_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payout_request_id_fkey" FOREIGN KEY ("payout_request_id") REFERENCES "payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "store_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_devotee_id_fkey" FOREIGN KEY ("devotee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_call_sessions" ADD CONSTRAINT "chat_call_sessions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_call_sessions" ADD CONSTRAINT "chat_call_sessions_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_ratings" ADD CONSTRAINT "service_ratings_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_ratings" ADD CONSTRAINT "service_ratings_devotee_id_fkey" FOREIGN KEY ("devotee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_ratings" ADD CONSTRAINT "service_ratings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cow_health_records" ADD CONSTRAINT "cow_health_records_cow_id_fkey" FOREIGN KEY ("cow_id") REFERENCES "cows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_store_profile_id_fkey" FOREIGN KEY ("store_profile_id") REFERENCES "store_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wellness_sessions" ADD CONSTRAINT "wellness_sessions_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wellness_enrollments" ADD CONSTRAINT "wellness_enrollments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "wellness_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wellness_enrollments" ADD CONSTRAINT "wellness_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wellness_enrollments" ADD CONSTRAINT "wellness_enrollments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_lesson_progress" ADD CONSTRAINT "user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gurukuls" ADD CONSTRAINT "gurukuls_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gurukul_programs" ADD CONSTRAINT "gurukul_programs_gurukul_id_fkey" FOREIGN KEY ("gurukul_id") REFERENCES "gurukuls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gurukul_applications" ADD CONSTRAINT "gurukul_applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "gurukul_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gurukul_applications" ADD CONSTRAINT "gurukul_applications_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_claims" ADD CONSTRAINT "referral_claims_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger_entries" ADD CONSTRAINT "credit_ledger_entries_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "user_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

