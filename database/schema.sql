--
-- PostgreSQL database dump
--

\restrict DGpVgl9rY7NQJ4qSFfjsHNo6pNY5m8s3uF3bcEL13cPZ4JCipf5sGcu1GCF42hA

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: message_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.message_status AS ENUM (
    'new',
    'analyzed',
    'waiting',
    'approved',
    'sent',
    'failed',
    'ignored'
);


ALTER TYPE public.message_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: action_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.action_logs (
    id integer NOT NULL,
    draft_id integer,
    message_id integer,
    action character varying(50) NOT NULL,
    actor character varying(100) DEFAULT 'admin'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.action_logs OWNER TO postgres;

--
-- Name: action_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.action_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.action_logs_id_seq OWNER TO postgres;

--
-- Name: action_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.action_logs_id_seq OWNED BY public.action_logs.id;


--
-- Name: ai_drafts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_drafts (
    id integer NOT NULL,
    message_id integer,
    draft_text text,
    approval_status public.message_status DEFAULT 'waiting'::public.message_status,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    suggested_platform character varying(50),
    priority character varying(50) DEFAULT 'normal'::character varying,
    confidence_score integer,
    reasoning_summary text,
    detected_risk character varying(100),
    override_reason text,
    retry_count integer DEFAULT 0,
    last_error text,
    client_id integer
);


ALTER TABLE public.ai_drafts OWNER TO postgres;

--
-- Name: ai_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_drafts_id_seq OWNER TO postgres;

--
-- Name: ai_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_drafts_id_seq OWNED BY public.ai_drafts.id;


--
-- Name: channel_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.channel_mappings (
    id integer NOT NULL,
    teams_chat_id text NOT NULL,
    teams_chat_name text NOT NULL,
    slack_channel_id text NOT NULL,
    slack_channel_name text NOT NULL,
    project_name text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    whatsapp_number character varying(50),
    whatsapp_numbers text[] DEFAULT '{}'::text[],
    whatsapp_group_name text,
    tenant_id text
);


ALTER TABLE public.channel_mappings OWNER TO postgres;

--
-- Name: COLUMN channel_mappings.whatsapp_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.channel_mappings.whatsapp_number IS 'WhatsApp number/group to forward messages to (format: +919876543210)';


--
-- Name: COLUMN channel_mappings.whatsapp_group_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.channel_mappings.whatsapp_group_name IS 'Exact WhatsApp group title (matches whatsapp_messages.group_name and SELECTED_WHATSAPP_GROUPS)';


--
-- Name: channel_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.channel_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.channel_mappings_id_seq OWNER TO postgres;

--
-- Name: channel_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.channel_mappings_id_seq OWNED BY public.channel_mappings.id;


--
-- Name: channel_summaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.channel_summaries (
    id integer NOT NULL,
    channel_id text NOT NULL,
    source text NOT NULL,
    channel_name text,
    summary_text text,
    message_count integer DEFAULT 10,
    last_updated timestamp without time zone DEFAULT now(),
    dismissed boolean DEFAULT false,
    image_urls text[] DEFAULT '{}'::text[],
    latest_message_at timestamp with time zone
);


ALTER TABLE public.channel_summaries OWNER TO postgres;

--
-- Name: channel_summaries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.channel_summaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.channel_summaries_id_seq OWNER TO postgres;

--
-- Name: channel_summaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.channel_summaries_id_seq OWNED BY public.channel_summaries.id;


--
-- Name: client_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_history (
    id integer NOT NULL,
    source text NOT NULL,
    group_id text NOT NULL,
    group_name text,
    task_summary text,
    last_updated timestamp with time zone DEFAULT now(),
    tenant_id text
);


ALTER TABLE public.client_history OWNER TO postgres;

--
-- Name: client_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_history_id_seq OWNER TO postgres;

--
-- Name: client_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_history_id_seq OWNED BY public.client_history.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    default_platform character varying(50),
    slack_channel character varying(255),
    whatsapp_number character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    slack_user_id character varying(100),
    slack_channel character varying(100),
    whatsapp_number character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: drafts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drafts (
    id integer NOT NULL,
    message_id integer NOT NULL,
    draft_text text NOT NULL,
    category character varying(100),
    priority character varying(20) DEFAULT 'medium'::character varying,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.drafts OWNER TO postgres;

--
-- Name: drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drafts_id_seq OWNER TO postgres;

--
-- Name: drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.drafts_id_seq OWNED BY public.drafts.id;


--
-- Name: forward_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forward_logs (
    id integer NOT NULL,
    source text,
    destination text,
    source_channel text,
    dest_channel text,
    message_preview text,
    status text,
    error_reason text,
    forwarded_at timestamp with time zone DEFAULT now(),
    task_id integer,
    retry_count integer DEFAULT 0,
    last_retried_at timestamp with time zone,
    card_content text,
    created_at timestamp with time zone DEFAULT now(),
    teams_chat_id text,
    teams_chat_name text,
    group_name text,
    failure_reason text,
    sender text,
    ai_category text,
    ai_reason text,
    is_batched boolean DEFAULT false,
    media_urls jsonb DEFAULT '[]'::jsonb,
    tenant_id text
);


ALTER TABLE public.forward_logs OWNER TO postgres;

--
-- Name: COLUMN forward_logs.ai_category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.forward_logs.ai_category IS 'Classification from OpenClaw (e.g. client_approval)';


--
-- Name: COLUMN forward_logs.ai_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.forward_logs.ai_reason IS 'The explanation from the AI for its decision';


--
-- Name: COLUMN forward_logs.media_urls; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.forward_logs.media_urls IS 'JSON array of images/files processed for this decision';


--
-- Name: forward_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.forward_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.forward_logs_id_seq OWNER TO postgres;

--
-- Name: forward_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.forward_logs_id_seq OWNED BY public.forward_logs.id;


--
-- Name: incoming_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incoming_messages (
    id integer NOT NULL,
    source character varying(50),
    sender character varying(255),
    content text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    attachments jsonb,
    client_id integer
);


ALTER TABLE public.incoming_messages OWNER TO postgres;

--
-- Name: incoming_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.incoming_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incoming_messages_id_seq OWNER TO postgres;

--
-- Name: incoming_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.incoming_messages_id_seq OWNED BY public.incoming_messages.id;


--
-- Name: message_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_logs (
    id integer NOT NULL,
    draft_id integer,
    action_type character varying(100),
    performed_by character varying(100),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.message_logs OWNER TO postgres;

--
-- Name: message_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.message_logs_id_seq OWNER TO postgres;

--
-- Name: message_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_logs_id_seq OWNED BY public.message_logs.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    source character varying(50) NOT NULL,
    sender character varying(255) NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    file_url text,
    file_name text,
    file_type text,
    thread_id text,
    dismissed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: slack_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slack_messages (
    id integer NOT NULL,
    sender character varying(255),
    sender_id character varying(100),
    body text,
    "timestamp" timestamp with time zone,
    channel_id character varying(100),
    channel_name character varying(255),
    ts character varying(50),
    forwarded_to_teams boolean DEFAULT false,
    forwarded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    dismissed boolean DEFAULT false,
    edited_body text,
    files jsonb DEFAULT '[]'::jsonb,
    tenant_id text
);


ALTER TABLE public.slack_messages OWNER TO postgres;

--
-- Name: COLUMN slack_messages.dismissed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.slack_messages.dismissed IS 'True if user dismissed this message from dashboard';


--
-- Name: slack_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.slack_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.slack_messages_id_seq OWNER TO postgres;

--
-- Name: slack_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.slack_messages_id_seq OWNED BY public.slack_messages.id;


--
-- Name: slack_threads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.slack_threads (
    thread_id text NOT NULL,
    channel_id text NOT NULL,
    channel_name text,
    summary text,
    client_reply_count integer DEFAULT 0,
    last_processed_ts text,
    forwarded_at_counts jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id text
);


ALTER TABLE public.slack_threads OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    source character varying(20) NOT NULL,
    source_message_id integer,
    client_name character varying(255),
    platform_label character varying(100),
    body text,
    links jsonb DEFAULT '[]'::jsonb,
    images jsonb DEFAULT '[]'::jsonb,
    status character varying(30) DEFAULT 'pending'::character varying,
    teams_task_id character varying(255),
    teams_plan_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id text,
    teams_activity_id text,
    teams_conversation_id text,
    completed_at timestamp with time zone,
    completed_by text
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: teams_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams_conversations (
    id integer NOT NULL,
    conversation_id text NOT NULL,
    conversation_name text,
    service_url text NOT NULL,
    tenant_id text,
    bot_id text,
    bot_name text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.teams_conversations OWNER TO postgres;

--
-- Name: teams_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teams_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_conversations_id_seq OWNER TO postgres;

--
-- Name: teams_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teams_conversations_id_seq OWNED BY public.teams_conversations.id;


--
-- Name: teams_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams_messages (
    id integer NOT NULL,
    sender character varying(255),
    body text,
    "timestamp" timestamp with time zone,
    message_type character varying(50),
    files jsonb DEFAULT '[]'::jsonb,
    links jsonb DEFAULT '[]'::jsonb,
    source_id character varying(255),
    source_type character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    approval_status character varying(20) DEFAULT 'waiting'::character varying,
    suggested_platform character varying(20),
    approved_draft text,
    message_id character varying(255),
    chat_name character varying(255),
    priority character varying(20) DEFAULT 'normal'::character varying,
    flag_admin boolean DEFAULT false,
    ai_reasoning text,
    recipient_name character varying(255),
    recipient_slack_id character varying(100),
    recipient_whatsapp character varying(50),
    should_forward boolean DEFAULT false,
    ai_category text,
    ai_should_forward boolean,
    ai_priority text,
    ai_reason text,
    forwarded_to_slack boolean DEFAULT false,
    forwarded_to_slack_at timestamp without time zone,
    forwarded_to_whatsapp boolean DEFAULT false,
    forwarded_to_whatsapp_at timestamp with time zone,
    dismissed boolean DEFAULT false,
    tenant_id text
);


ALTER TABLE public.teams_messages OWNER TO postgres;

--
-- Name: COLUMN teams_messages.dismissed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.teams_messages.dismissed IS 'True if user dismissed this message from dashboard';


--
-- Name: teams_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teams_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teams_messages_id_seq OWNER TO postgres;

--
-- Name: teams_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teams_messages_id_seq OWNED BY public.teams_messages.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'manager'::character varying,
    department character varying(100),
    teams_display_name character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    tenant_id text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: whatsapp_batch_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_batch_tasks (
    id integer NOT NULL,
    group_name text,
    task_title text,
    description text,
    category text,
    priority text,
    files jsonb DEFAULT '[]'::jsonb,
    links jsonb DEFAULT '[]'::jsonb,
    teams_chat_id text,
    forwarded boolean DEFAULT false,
    scanned_at timestamp with time zone DEFAULT now(),
    tenant_id text
);


ALTER TABLE public.whatsapp_batch_tasks OWNER TO postgres;

--
-- Name: whatsapp_batch_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_batch_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_batch_tasks_id_seq OWNER TO postgres;

--
-- Name: whatsapp_batch_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_batch_tasks_id_seq OWNED BY public.whatsapp_batch_tasks.id;


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_messages (
    id integer NOT NULL,
    sender character varying(255) NOT NULL,
    sender_phone character varying(50) NOT NULL,
    body text,
    message_sid character varying(100),
    "timestamp" timestamp with time zone DEFAULT now(),
    media_urls jsonb DEFAULT '[]'::jsonb,
    direction character varying(20),
    forwarded_to_teams boolean DEFAULT false,
    forwarded_to_slack boolean DEFAULT false,
    forwarded_at timestamp with time zone,
    ai_category character varying(100),
    ai_should_forward boolean,
    ai_priority character varying(20),
    ai_reason text,
    created_at timestamp with time zone DEFAULT now(),
    dismissed boolean DEFAULT false,
    content_summary text,
    action_required text,
    urgency_indicators text,
    group_name character varying(255),
    edited_body text,
    batch_scanned boolean DEFAULT false,
    tenant_id text,
    CONSTRAINT whatsapp_messages_direction_check CHECK (((direction)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])))
);


ALTER TABLE public.whatsapp_messages OWNER TO postgres;

--
-- Name: TABLE whatsapp_messages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.whatsapp_messages IS 'Stores incoming and outgoing WhatsApp messages via Twilio';


--
-- Name: COLUMN whatsapp_messages.dismissed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_messages.dismissed IS 'True if user dismissed this message from dashboard';


--
-- Name: COLUMN whatsapp_messages.content_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_messages.content_summary IS 'Brief summary of message content from OpenClaw analysis';


--
-- Name: COLUMN whatsapp_messages.action_required; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_messages.action_required IS 'Action required based on OpenClaw analysis';


--
-- Name: COLUMN whatsapp_messages.urgency_indicators; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_messages.urgency_indicators IS 'Urgency indicators detected by OpenClaw';


--
-- Name: COLUMN whatsapp_messages.group_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_messages.group_name IS 'WhatsApp group name where the message was sent/received';


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_messages_id_seq OWNER TO postgres;

--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_messages_id_seq OWNED BY public.whatsapp_messages.id;


--
-- Name: action_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_logs ALTER COLUMN id SET DEFAULT nextval('public.action_logs_id_seq'::regclass);


--
-- Name: ai_drafts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_drafts ALTER COLUMN id SET DEFAULT nextval('public.ai_drafts_id_seq'::regclass);


--
-- Name: channel_mappings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channel_mappings ALTER COLUMN id SET DEFAULT nextval('public.channel_mappings_id_seq'::regclass);


--
-- Name: channel_summaries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channel_summaries ALTER COLUMN id SET DEFAULT nextval('public.channel_summaries_id_seq'::regclass);


--
-- Name: client_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_history ALTER COLUMN id SET DEFAULT nextval('public.client_history_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: drafts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drafts ALTER COLUMN id SET DEFAULT nextval('public.drafts_id_seq'::regclass);


--
-- Name: forward_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forward_logs ALTER COLUMN id SET DEFAULT nextval('public.forward_logs_id_seq'::regclass);


--
-- Name: incoming_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incoming_messages ALTER COLUMN id SET DEFAULT nextval('public.incoming_messages_id_seq'::regclass);


--
-- Name: message_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_logs ALTER COLUMN id SET DEFAULT nextval('public.message_logs_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: slack_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_messages ALTER COLUMN id SET DEFAULT nextval('public.slack_messages_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: teams_conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams_conversations ALTER COLUMN id SET DEFAULT nextval('public.teams_conversations_id_seq'::regclass);


--
-- Name: teams_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams_messages ALTER COLUMN id SET DEFAULT nextval('public.teams_messages_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: whatsapp_batch_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_batch_tasks ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_batch_tasks_id_seq'::regclass);


--
-- Name: whatsapp_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_messages ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_messages_id_seq'::regclass);


--
-- Name: action_logs action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_drafts ai_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_pkey PRIMARY KEY (id);


--
-- Name: channel_mappings channel_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channel_mappings
    ADD CONSTRAINT channel_mappings_pkey PRIMARY KEY (id);


--
-- Name: channel_mappings channel_mappings_teams_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channel_mappings
    ADD CONSTRAINT channel_mappings_teams_chat_id_key UNIQUE (teams_chat_id);


--
-- Name: channel_summaries channel_summaries_channel_id_source_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channel_summaries
    ADD CONSTRAINT channel_summaries_channel_id_source_key UNIQUE (channel_id, source);


--
-- Name: channel_summaries channel_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channel_summaries
    ADD CONSTRAINT channel_summaries_pkey PRIMARY KEY (id);


--
-- Name: client_history client_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_history
    ADD CONSTRAINT client_history_pkey PRIMARY KEY (id);


--
-- Name: client_history client_history_source_group_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_history
    ADD CONSTRAINT client_history_source_group_id_key UNIQUE (source, group_id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: drafts drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_pkey PRIMARY KEY (id);


--
-- Name: forward_logs forward_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forward_logs
    ADD CONSTRAINT forward_logs_pkey PRIMARY KEY (id);


--
-- Name: incoming_messages incoming_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incoming_messages
    ADD CONSTRAINT incoming_messages_pkey PRIMARY KEY (id);


--
-- Name: message_logs message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: slack_messages slack_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_messages
    ADD CONSTRAINT slack_messages_pkey PRIMARY KEY (id);


--
-- Name: slack_messages slack_messages_ts_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_messages
    ADD CONSTRAINT slack_messages_ts_key UNIQUE (ts);


--
-- Name: slack_threads slack_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.slack_threads
    ADD CONSTRAINT slack_threads_pkey PRIMARY KEY (thread_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: teams_conversations teams_conversations_conversation_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams_conversations
    ADD CONSTRAINT teams_conversations_conversation_id_key UNIQUE (conversation_id);


--
-- Name: teams_conversations teams_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams_conversations
    ADD CONSTRAINT teams_conversations_pkey PRIMARY KEY (id);


--
-- Name: teams_messages teams_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams_messages
    ADD CONSTRAINT teams_messages_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_batch_tasks whatsapp_batch_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_batch_tasks
    ADD CONSTRAINT whatsapp_batch_tasks_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_message_sid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_message_sid_key UNIQUE (message_sid);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: idx_channel_mappings_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_channel_mappings_tenant_id ON public.channel_mappings USING btree (tenant_id);


--
-- Name: idx_channel_mappings_whatsapp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_channel_mappings_whatsapp ON public.channel_mappings USING btree (whatsapp_number);


--
-- Name: idx_client_history_tenant_source_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_history_tenant_source_group ON public.client_history USING btree (tenant_id, source, group_id);


--
-- Name: idx_drafts_message_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_drafts_message_id ON public.drafts USING btree (message_id);


--
-- Name: idx_drafts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_drafts_status ON public.drafts USING btree (status);


--
-- Name: idx_forward_logs_tenant_id_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forward_logs_tenant_id_status ON public.forward_logs USING btree (tenant_id, status);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_dismissed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_dismissed ON public.messages USING btree (dismissed);


--
-- Name: idx_messages_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_source ON public.messages USING btree (source);


--
-- Name: idx_slack_dismissed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_slack_dismissed ON public.slack_messages USING btree (dismissed);


--
-- Name: idx_slack_messages_tenant_id_ts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_slack_messages_tenant_id_ts ON public.slack_messages USING btree (tenant_id, "timestamp" DESC);


--
-- Name: idx_slack_threads_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_slack_threads_tenant_id ON public.slack_threads USING btree (tenant_id);


--
-- Name: idx_tasks_tenant_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_tenant_activity ON public.tasks USING btree (tenant_id, teams_activity_id);


--
-- Name: idx_tasks_tenant_id_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_tenant_id_created ON public.tasks USING btree (tenant_id, created_at DESC);


--
-- Name: idx_tasks_tenant_status_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_tenant_status_created ON public.tasks USING btree (tenant_id, status, created_at);


--
-- Name: idx_teams_conversations_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_conversations_tenant_id ON public.teams_conversations USING btree (tenant_id);


--
-- Name: idx_teams_dismissed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_dismissed ON public.teams_messages USING btree (dismissed);


--
-- Name: idx_teams_messages_tenant_id_ts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teams_messages_tenant_id_ts ON public.teams_messages USING btree (tenant_id, "timestamp" DESC);


--
-- Name: idx_teams_messages_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_teams_messages_unique ON public.teams_messages USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_teams_msg_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_teams_msg_unique ON public.teams_messages USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: idx_whatsapp_ai_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_ai_priority ON public.whatsapp_messages USING btree (ai_priority);


--
-- Name: idx_whatsapp_ai_should_forward; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_ai_should_forward ON public.whatsapp_messages USING btree (ai_should_forward);


--
-- Name: idx_whatsapp_batch_tasks_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_batch_tasks_tenant_id ON public.whatsapp_batch_tasks USING btree (tenant_id);


--
-- Name: idx_whatsapp_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_direction ON public.whatsapp_messages USING btree (direction);


--
-- Name: idx_whatsapp_dismissed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_dismissed ON public.whatsapp_messages USING btree (dismissed);


--
-- Name: idx_whatsapp_group_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_group_name ON public.whatsapp_messages USING btree (group_name);


--
-- Name: idx_whatsapp_messages_tenant_id_ts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_messages_tenant_id_ts ON public.whatsapp_messages USING btree (tenant_id, "timestamp" DESC);


--
-- Name: idx_whatsapp_sender_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_sender_phone ON public.whatsapp_messages USING btree (sender_phone);


--
-- Name: idx_whatsapp_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_timestamp ON public.whatsapp_messages USING btree ("timestamp" DESC);


--
-- Name: action_logs action_logs_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.drafts(id) ON DELETE SET NULL;


--
-- Name: action_logs action_logs_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: ai_drafts ai_drafts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: ai_drafts ai_drafts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.incoming_messages(id) ON DELETE CASCADE;


--
-- Name: drafts drafts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: incoming_messages incoming_messages_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incoming_messages
    ADD CONSTRAINT incoming_messages_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: message_logs message_logs_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.ai_drafts(id) ON DELETE CASCADE;

-- Runtime configuration values (for System Admin overrides like Supabase account switch)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    setting_key text UNIQUE NOT NULL,
    setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings USING btree (setting_key);


--
-- PostgreSQL database dump complete
--

\unrestrict DGpVgl9rY7NQJ4qSFfjsHNo6pNY5m8s3uF3bcEL13cPZ4JCipf5sGcu1GCF42hA

