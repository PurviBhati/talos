--
-- PostgreSQL database dump
--

\restrict cAefFhjC146s6YL9wy6isOrWUXdWpscd2U414eIcpRY1vlyj3bgoHJsVz6rjIoB

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
-- Name: message_status; Type: TYPE; Schema: public; Owner: -
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: action_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_logs (
    id integer NOT NULL,
    draft_id integer,
    message_id integer,
    action character varying(50) NOT NULL,
    actor character varying(100) DEFAULT 'admin'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: action_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.action_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: action_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.action_logs_id_seq OWNED BY public.action_logs.id;


--
-- Name: ai_drafts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: ai_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_drafts_id_seq OWNED BY public.ai_drafts.id;


--
-- Name: channel_mappings; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN channel_mappings.whatsapp_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.channel_mappings.whatsapp_number IS 'WhatsApp number/group to forward messages to (format: +919876543210)';


--
-- Name: channel_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_mappings_id_seq OWNED BY public.channel_mappings.id;


--
-- Name: channel_summaries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: channel_summaries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.channel_summaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: channel_summaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.channel_summaries_id_seq OWNED BY public.channel_summaries.id;


--
-- Name: client_history; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: client_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_history_id_seq OWNED BY public.client_history.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    default_platform character varying(50),
    slack_channel character varying(255),
    whatsapp_number character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: drafts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.drafts_id_seq OWNED BY public.drafts.id;


--
-- Name: forward_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN forward_logs.ai_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forward_logs.ai_category IS 'Classification from OpenClaw (e.g. client_approval)';


--
-- Name: COLUMN forward_logs.ai_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forward_logs.ai_reason IS 'The explanation from the AI for its decision';


--
-- Name: COLUMN forward_logs.media_urls; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.forward_logs.media_urls IS 'JSON array of images/files processed for this decision';


--
-- Name: forward_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forward_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forward_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forward_logs_id_seq OWNED BY public.forward_logs.id;


--
-- Name: incoming_messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: incoming_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.incoming_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: incoming_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.incoming_messages_id_seq OWNED BY public.incoming_messages.id;


--
-- Name: message_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_logs (
    id integer NOT NULL,
    draft_id integer,
    action_type character varying(100),
    performed_by character varying(100),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: message_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_logs_id_seq OWNED BY public.message_logs.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: slack_messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN slack_messages.dismissed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slack_messages.dismissed IS 'True if user dismissed this message from dashboard';


--
-- Name: slack_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.slack_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: slack_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.slack_messages_id_seq OWNED BY public.slack_messages.id;


--
-- Name: slack_threads; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: teams_conversations; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: teams_conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_conversations_id_seq OWNED BY public.teams_conversations.id;


--
-- Name: teams_messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN teams_messages.dismissed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.teams_messages.dismissed IS 'True if user dismissed this message from dashboard';


--
-- Name: teams_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teams_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teams_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teams_messages_id_seq OWNED BY public.teams_messages.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: whatsapp_batch_tasks; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: whatsapp_batch_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_batch_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_batch_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_batch_tasks_id_seq OWNED BY public.whatsapp_batch_tasks.id;


--
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: TABLE whatsapp_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.whatsapp_messages IS 'Stores incoming and outgoing WhatsApp messages via Twilio';


--
-- Name: COLUMN whatsapp_messages.dismissed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_messages.dismissed IS 'True if user dismissed this message from dashboard';


--
-- Name: COLUMN whatsapp_messages.content_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_messages.content_summary IS 'Brief summary of message content from OpenClaw analysis';


--
-- Name: COLUMN whatsapp_messages.action_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_messages.action_required IS 'Action required based on OpenClaw analysis';


--
-- Name: COLUMN whatsapp_messages.urgency_indicators; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_messages.urgency_indicators IS 'Urgency indicators detected by OpenClaw';


--
-- Name: COLUMN whatsapp_messages.group_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.whatsapp_messages.group_name IS 'WhatsApp group name where the message was sent/received';


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.whatsapp_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.whatsapp_messages_id_seq OWNED BY public.whatsapp_messages.id;


--
-- Name: action_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_logs ALTER COLUMN id SET DEFAULT nextval('public.action_logs_id_seq'::regclass);


--
-- Name: ai_drafts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts ALTER COLUMN id SET DEFAULT nextval('public.ai_drafts_id_seq'::regclass);


--
-- Name: channel_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_mappings ALTER COLUMN id SET DEFAULT nextval('public.channel_mappings_id_seq'::regclass);


--
-- Name: channel_summaries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_summaries ALTER COLUMN id SET DEFAULT nextval('public.channel_summaries_id_seq'::regclass);


--
-- Name: client_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_history ALTER COLUMN id SET DEFAULT nextval('public.client_history_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: drafts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drafts ALTER COLUMN id SET DEFAULT nextval('public.drafts_id_seq'::regclass);


--
-- Name: forward_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forward_logs ALTER COLUMN id SET DEFAULT nextval('public.forward_logs_id_seq'::regclass);


--
-- Name: incoming_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incoming_messages ALTER COLUMN id SET DEFAULT nextval('public.incoming_messages_id_seq'::regclass);


--
-- Name: message_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs ALTER COLUMN id SET DEFAULT nextval('public.message_logs_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: slack_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slack_messages ALTER COLUMN id SET DEFAULT nextval('public.slack_messages_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: teams_conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_conversations ALTER COLUMN id SET DEFAULT nextval('public.teams_conversations_id_seq'::regclass);


--
-- Name: teams_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_messages ALTER COLUMN id SET DEFAULT nextval('public.teams_messages_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: whatsapp_batch_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_batch_tasks ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_batch_tasks_id_seq'::regclass);


--
-- Name: whatsapp_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_messages_id_seq'::regclass);


--
-- Data for Name: action_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.action_logs (id, draft_id, message_id, action, actor, created_at) FROM stdin;
\.


--
-- Data for Name: ai_drafts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_drafts (id, message_id, draft_text, approval_status, created_at, suggested_platform, priority, confidence_score, reasoning_summary, detected_risk, override_reason, retry_count, last_error, client_id) FROM stdin;
1	2	Hello,\n\nHere is an update from our team:\n\n"Project file updated."\n\nPlease let us know if you need any clarification.\n\nBest regards,\nTeam	waiting	2026-02-23 14:46:21.97161	\N	normal	\N	\N	\N	\N	0	\N	\N
2	3	Hello,\n\nHere is an update from our team:\n\n"Project file updated."\n\nPlease let us know if you need any clarification.\n\nBest regards,\nTeam	waiting	2026-02-23 14:56:21.556311	\N	normal	\N	\N	\N	\N	0	\N	\N
3	4	Hello,\n\nHere is an update from our team:\n\n"Project file updated."\n\nPlease let us know if you need any clarification.\n\nBest regards,\nTeam	waiting	2026-02-23 15:14:22.438269	\N	normal	\N	\N	\N	\N	0	\N	\N
4	5	Hello,\n\nHere is an update from our team:\n\n"Project file updated."\n\nPlease let us know if you need any clarification.\n\nBest regards,\nTeam	waiting	2026-02-23 15:16:19.072585	\N	normal	\N	\N	\N	\N	0	\N	\N
6	7	Hello,\n\nHere is an update from our team:\n\n"Client needs urgent security fix deployed tonight."\n\nPlease let us know if you need any clarification.\n\nBest regards,\nTeam	approved	2026-02-23 15:28:39.69584	\N	normal	\N	\N	\N	\N	0	\N	\N
8	9	Hi team, we have an urgent request from the client for a security fix that needs to be deployed tonight. Please prioritize this task and let me know if you need any assistance. Thank you!	approved	2026-02-23 15:55:36.750279	slack	high	\N	\N	\N	\N	0	\N	\N
7	8	Hello,\n\nHere is an update from our team:\n\n"Client needs urgent security fix deployed tonight."\n\nPlease let us know if you need any clarification.\n\nBest regards,\nTeam	approved	2026-02-23 15:36:10.279285	\N	normal	\N	\N	\N	\N	0	\N	\N
5	6	Hello,\n\nHere is an update from our team:\n\n"Client wants urgent revision before Friday."\n\nPlease let us know if you need any clarification.\n\nBest regards,\nTeam	approved	2026-02-23 15:17:09.197062	\N	normal	\N	\N	\N	\N	0	\N	\N
9	24	Please review the following images: 1) [Slider 1](https://buildbite.com/hubfs/slider-1.svg), 2) [Slider 2](https://buildbite.com/hubfs/slider-2.svg), 3) [Slider 3](https://buildbite.com/hubfs/slider-3.svg). We need to compress them as they are currently over 500kb. The target size for thumbnails should be no more than 50kb.	waiting	2026-02-26 16:42:55.949862	slack	normal	\N	\N	\N	\N	0	\N	\N
10	25	Hi team, please review the following images: 1. [Slider 1](https://buildbite.com/hubfs/slider-1.svg) 2. [Slider 2](https://buildbite.com/hubfs/slider-2.svg) 3. [Slider 3](https://buildbite.com/hubfs/slider-3.svg). They need to be compressed as they are currently over 500kb. The thumbnails should ideally be under 50kb. Thank you!	waiting	2026-02-26 16:42:58.304778	slack	normal	\N	\N	\N	\N	0	\N	\N
11	28	Hi team, please check the images linked below. They need to be compressed as they are currently over 500kb each. For thumbnails, they should be no more than 50kb. Thank you! \n\n1. [Slider 1](https://buildbite.com/hubfs/slider-1.svg) \n2. [Slider 2](https://buildbite.com/hubfs/slider-2.svg) \n3. [Slider 3](https://buildbite.com/hubfs/slider-3.svg)	waiting	2026-02-26 16:43:16.426049	slack	normal	\N	\N	\N	\N	0	\N	\N
12	39	Hello team, it seems that the data for 'troupai' is missing in the documentation. Can we look into this?	waiting	2026-02-26 17:14:09.328445	slack	normal	\N	\N	\N	\N	0	\N	\N
13	46	Hi team, please note that we need to update the latest projects in the Webflow partner directory for the main account. Let's assign this task to Kushal. Thank you!	waiting	2026-02-26 17:24:12.2295	slack	normal	\N	\N	\N	\N	0	\N	\N
14	47	Hi team, please note that we need to update the latest projects in the Webflow partner directory for the main account. Let's assign this task to Kushal. Thank you!	waiting	2026-02-26 17:24:14.055249	slack	normal	\N	\N	\N	\N	0	\N	\N
15	48	Hi Kushal, please update the latest projects in the Webflow partner directory on the main account. Thank you!	waiting	2026-02-26 17:29:57.313693	slack	normal	\N	\N	\N	\N	0	\N	\N
16	49	Hi Kushal, please update the latest projects in the Webflow partner directory on the main account. Thank you!	waiting	2026-02-26 17:29:59.00318	slack	normal	\N	\N	\N	\N	0	\N	\N
17	54	Hi Parth, I've noticed that the homepage is taking about 30 seconds to load. I've attached a screen recording for your reference. Could you please take a look?	waiting	2026-02-26 17:49:02.377708	slack	normal	\N	\N	\N	\N	0	\N	\N
18	57	Hi team, we are ready to make the project live. Please confirm the next steps. Thank you!	waiting	2026-02-26 18:31:11.002007	slack	normal	\N	\N	\N	\N	0	\N	\N
19	59	Hello team, we are ready to make the project live. Please confirm the final steps.	waiting	2026-02-26 18:31:16.136661	slack	normal	\N	\N	\N	\N	0	\N	\N
20	82	Hi team, could someone please review the homepage for Atomic Object? There are a few items in Figma that need attention, as well as some additional elements for the insights post. Thank you!	waiting	2026-02-27 10:38:13.339347	slack	normal	\N	\N	\N	\N	0	\N	\N
21	83	Hi Vatsal, could you please share the proposal for Ceel/Ryan when you have it ready? Thank you!	waiting	2026-02-27 10:38:24.340422	slack	normal	\N	\N	\N	\N	0	\N	\N
\.


--
-- Data for Name: channel_mappings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.channel_mappings (id, teams_chat_id, teams_chat_name, slack_channel_id, slack_channel_name, project_name, active, created_at, whatsapp_number, whatsapp_numbers, whatsapp_group_name, tenant_id) FROM stdin;
16	19:56b13a6c70aa4384a083e7bbc4ee8f14@thread.v2	Seller Umbrella	none	none	Sellers Umbrella	t	2026-03-30 14:28:42.439534	\N	{}	Sellers Umbrella - MXP Webflow Development	tenant-default
1	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	Buildbite	C0AHE5C59NH	#privateopenclawdemo	Buildbite	t	2026-03-09 14:48:19.156011	\N	{}	\N	tenant-default
10	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	Avishkar Developers	none	none	Avishkar Developers	t	2026-03-13 13:12:39.511842	\N	{}	Avishkar Branding	tenant-default
3	19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2	Ignite Deep Tech	C0AHHG10HDG	openclawtest	Ignite	t	2026-03-09 14:48:19.156011	\N	{}	\N	tenant-default
11	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	Deep Group	none	none	Deep Group	t	2026-03-13 13:12:39.511842	\N	{}	Deep Website	tenant-default
9	19:da0a2b138a4445078f1d639a5dcb16ac@thread.v2	Test Group	none	none	Atomic Object	t	2026-03-13 13:12:39.511842	\N	{}	Test-grp	tenant-default
\.


--
-- Data for Name: channel_summaries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.channel_summaries (id, channel_id, source, channel_name, summary_text, message_count, last_updated, dismissed, image_urls, latest_message_at) FROM stdin;
9	Deep Website	whatsapp	Deep Website	NO_ACTION	1	2026-04-08 16:25:20.368132	f	{https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775559925750_whatsapp_1775559925749.jpg}	\N
8	Avishkar Branding	whatsapp	Avishkar Branding	NO_ACTION	1	2026-04-04 09:00:28.717747	f	{}	\N
2	Deep Group	teams	Deep Group	LINKS: https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link, https://deep-group.webflow.io/	3	2026-04-08 16:25:04.82053	t	{}	\N
3	Buildbite	teams	Buildbite	FILES: image\nLINKS: https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&viewport=906%2C665%2C0.08&t=6mme91TH5PE0UNUP-1&scaling=min-zoom&content-scaling=fixed&page-id=3025%3A6, https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&viewport=906%2C665%2C0.08&t=6mme91TH5PE0UNUP-	7	2026-04-08 16:25:07.538982	t	{}	\N
427	appsrow test grp	teams	appsrow test grp	NO_ACTION	1	2026-04-08 16:25:08.512385	f	{}	\N
6	C0AH24BPHRD	slack	C0AH24BPHRD	A message was posted in the Slack channel C0AH24BPHRD by an unknown user, stating "Dev intern" for test purposes. There were no discussions, decisions, or actions agreed upon in this message. There are no pending items or follow-ups indicated. The context appears to be related to testing or verifying functionality within the Slack platform.	1	2026-03-24 14:21:44.930288	t	{}	\N
5	C0AHE5C59NH	slack	C0AHE5C59NH	The message in the Slack channel mentions the name "Abhishek Soni," but lacks additional context or details regarding any discussion, requests, decisions, actions, or pending items. Without further information, it's unclear what the overall topic or project context is. Further clarification or additional messages would be needed to provide a comprehensive summary.	1	2026-03-24 14:21:42.909225	t	{}	\N
14	#testdemo	slack	#testdemo	(NO_ACTION,{})	1	2026-03-26 18:06:26.060096	t	{}	\N
20	Ignite Deep Tech	teams	Ignite Deep Tech	NO_ACTION	3	2026-04-08 16:25:09.399401	f	{}	\N
4	Avishkar Developers	teams	Avishkar Developers	FILES: image\nLINKS: https://www.figma.com/design/zx8RvisHG0pE7LWS58TVrX/Avishkar-Developers?node-id=9829-8780&t=V4EMvGgVa8NdqSzK-1	4	2026-04-08 16:25:11.777759	t	{}	\N
293	Seller Umbrella	teams	Seller Umbrella	LINKS: https://advertising.amazon.com/partners/directory/details/amzn1.ads1.ma1.ck8lnsp2l2welghoag14ssq2y/Sellers-Umbrella?ref_=prtdrl_shr_cy, https://sellercentral.amazon.com/gspn/provider-details/Advertising%20Optimization/c9b50585-3d39-472b-b66f-a2d47d1202a2?ref_=sc_gspn_alst_adt-c9b50585&localeSelection=en_US&sellFrom=US&sellIn=US, https://www.amazon.com/gp/product/B0GF1R2XPV	3	2026-04-08 16:25:13.93729	f	{}	\N
1	Atomic Object	teams	Atomic Object	FILES: image	2	2026-04-08 16:25:14.895341	t	{}	\N
208	Pelotech - Josef	teams	Pelotech - Josef	LINKS: https://pelotech-3af9bb.webflow.io/cloud-modernization-services, https://pelotech-3af9bb.webflow.io/devops-automation-consulting	2	2026-04-08 16:25:15.922372	f	{}	\N
15	#privateopenclawdemo	slack	#privateopenclawdemo	TASK: Change the current background colors with the new design and make it in green instead of pink.	10	2026-04-08 16:25:17.226265	t	{}	\N
7	Sellers Umbrella - MXP Webflow Development	whatsapp	Sellers Umbrella - MXP Webflow Development	LINKS: https://meet.google.com/igj-ogzj-gju	4	2026-04-07 12:56:35.294707	t	{}	\N
193	#openclawtest	slack	#openclawtest	TASK: Update the footer section color to dark olive green, Update the Event page with discussed changes, Add the button mentioned earlier, Update the hero section as mentioned earlier, Check the schema issue\nFILES: document, image\nNO_ACTION	10	2026-04-08 16:25:18.483184	f	{}	\N
18	Test-grp	whatsapp	Test-grp	TASK: Remove the button on the right side.	3	2026-04-08 16:25:19.388906	f	{https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775640543847_whatsapp_quoted_1775640543847.jpg}	\N
\.


--
-- Data for Name: client_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_history (id, source, group_id, group_name, task_summary, last_updated, tenant_id) FROM stdin;
1	whatsapp	Test-grp	Test-grp	- [02 Apr 2026] Follow-up on update request: Purvi Bhatia is asking for an update on a previous request. Please review the context to determine what specific update is being referred to and provide the necessary information or status.\n- [02 Apr 2026] Check image updates: Purvi Bhatia asked if the images have been checked. Ensure that all the images mentioned in previous discussions are reviewed and confirm their status.\n- [02 Apr 2026] Follow-up on project update: Purvi Bhatia is asking for an update on the project. Please provide the latest status and any relevant details regarding the progress.\n- [02 Apr 2026] Redesign two landing pages using new template: Redesign the 'Cleaning and janitorial' and 'General contractors' landing pages using the new template for persona-pages. Swap out the copy and images as per the new template.\n- [02 Apr 2026] Link new template under 'who it's for': Link the new template under 'who it's for' with the name 'Home builders'.\n- [02 Apr 2026] Redesign two landing pages using new template: Redesign the two landing pages for 'Cleaning and janitorial' and 'General contractors' using the new template provided for persona-pages. Swap out the copy and images as instructed.\n- [02 Apr 2026] Push new template live: Push the new template live as per the provided Figma link. It should be linked under 'who it's for' with the name 'Home builders'.\n- [02 Apr 2026] Remove background images and update with real worker images: Remove the current background images and update them with the real worker images that will be provided.\n- [03 Apr 2026] Review and update task optimization sheet: Review the task optimization sheet shared by Purvi Bhatia and make necessary updates/changes to improve task optimization.\n- [03 Apr 2026] Delete Global Data Innovation Peach page: Delete the page at the following URL as requested by Purvi Bhatia.\n- [03 Apr 2026] Make AI Trust Certificate Program pages visible and add Stripe payment: Make the specified pages visible without login for the AI Trust Certificate Program and add Stripe payment after Module 2.\n- [03 Apr 2026] Redesign two landing pages using new template: Redesign the two previously created landing pages using the new template provided for persona-pages. Ensure that the design follows the exact same template, swapping out the copy and images as needed.\n- [03 Apr 2026] Update Webflow Pages with New Content and Design Changes: Implement updates across various pages on the Deep Group website, including banner titles, additional pictures, font adjustments, and content revisions.\n- [07 Apr 2026] Update Footer: Update the footer as requested by Purvi Bhatia. Ensure that any necessary changes or additions are made to align with the current project requirements.\n- [07 Apr 2026] Update Footer with New Image: Update the footer of the website using the image provided by Purvi Bhatia. Ensure the changes align with the current project requirements and the new design specifications.	2026-04-07 12:59:44.015169+05:30	tenant-default
7	whatsapp	Deep Website	Deep Website	- [03 Apr 2026] Use project images from specified folders: Use images from Google Drive - Deep Central > Project Details folder and the additional OneDrive folder for the latest images on Saptak, Shivanta, and other projects. Ensure webflowdev33@gmail.com has access to the Microsoft drive.\n- [03 Apr 2026] Use project images from specified folders: Use project images from Google Drive - Deep Central > Project Details folder and the additional OneDrive folder: https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa0lJQmVhQ2dBQUFBQUFZVDYwR1NUOWpKQ3pCR1N2WnJSOVhB&id=5EE4D8E878659E90%2110344&cid=5EE4D8E878659E90&sb=name&sd=1. The second folder contains the latest images on Saptak and Shivanta and other projects. Ensure webflowdev33@gmail.com has access to the Microsoft drive.\n- [06 Apr 2026] Provide HD photos of Ixora sample house and available photos of Marigold: Nupur Patel requested HD photos of the Ixora sample house and available photos of Marigold. Additionally, for the Abode project, 3D images will be used as it is under construction. Access to 3Ds used for brochures is available, but sample house photos or any other photo shoot done are needed at the earliest possible time.	2026-04-06 15:00:52.568362+05:30	tenant-default
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, default_platform, slack_channel, whatsapp_number, created_at) FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contacts (id, name, email, slack_user_id, slack_channel, whatsapp_number, notes, created_at) FROM stdin;
\.


--
-- Data for Name: drafts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.drafts (id, message_id, draft_text, category, priority, reason, status, approved_at, created_at) FROM stdin;
\.


--
-- Data for Name: forward_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forward_logs (id, source, destination, source_channel, dest_channel, message_preview, status, error_reason, forwarded_at, task_id, retry_count, last_retried_at, card_content, created_at, teams_chat_id, teams_chat_name, group_name, failure_reason, sender, ai_category, ai_reason, is_batched, media_urls, tenant_id) FROM stdin;
96	whatsapp	teams	Test-grp	Test Group	Update module 7 to match previous changes.	delivered	\N	2026-04-08 14:52:06.521656+05:30	92	0	\N	\N	2026-04-08 14:52:06.521656+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
100	slack	teams	C0AHHG10HDG	Ignite Deep Tech	Update footer color to dark olive green, provide Figma link, share document, confirm button and hero section updates, an	delivered	\N	2026-04-08 15:01:14.873036+05:30	97	0	\N	\N	2026-04-08 15:01:14.873036+05:30	\N	\N	\N	\N	\N	change_request	Multiple actionable tasks related to project updates and changes.	f	[]	tenant-default
104	slack	teams	C0AHE5C59NH	Buildbite	Change the current background colors to green instead of pink.	dead	Teams task card send failed (no activity id): 19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	2026-04-08 15:52:54.69462+05:30	101	4	2026-04-08 16:02:53.241768+05:30	\N	2026-04-08 15:52:54.69462+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	change_request	The message contains a specific request to change design colors.	f	[]	tenant-default
19	whatsapp	teams	Test-grp	Atomic Object	Hello atomic group\nCan you please change the hero section?	delivered	\N	2026-03-25 18:38:41.460017+05:30	\N	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
21	slack	teams	C0AHHG10HDG	Pelotech - Josef	"Can you update the footer section?"	delivered	\N	2026-03-26 17:38:47.624566+05:30	18	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
97	whatsapp	teams	Test-grp	Test Group	Replicate the changes in module 1 as done in module 7.	delivered	\N	2026-04-08 14:58:12.334728+05:30	93	0	\N	\N	2026-04-08 14:58:12.334728+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
101	slack	teams	C0AHHG10HDG	Ignite Deep Tech	Check the schema for potential issues.	delivered	\N	2026-04-08 15:04:30.414722+05:30	98	0	\N	\N	2026-04-08 15:04:30.414722+05:30	\N	\N	\N	\N	\N	technical_issue	The message indicates a potential issue with the schema that needs checking.	f	[]	tenant-default
105	slack	teams	C0AHE5C59NH	Group Chat	Change background colors to the provided design in green, not pink, and provide feedback on appearance.	delivered	\N	2026-04-08 15:58:34.3503+05:30	102	0	\N	\N	2026-04-08 15:58:34.3503+05:30	\N	\N	\N	\N	\N	change_request	Request for design change and feedback on appearance.	f	[]	tenant-default
98	whatsapp	teams	Test-grp	Test Group	Client requests removal of the button on the right side of the design.	delivered	\N	2026-04-08 14:59:22.575647+05:30	95	0	\N	\N	2026-04-08 14:59:22.575647+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
102	slack	teams	C0AHHG10HDG	Ignite Deep Tech	Complete the tasks of adding the button, updating the hero section, adding the image, and checking the schema as soon as	delivered	\N	2026-04-08 15:07:31.887354+05:30	99	0	\N	\N	2026-04-08 15:07:31.887354+05:30	\N	\N	\N	\N	\N	change_request	Urgent request to complete tasks as soon as possible.	f	[]	tenant-default
20	whatsapp	teams	Test-grp	Atomic Object	Hello Atomic group, \n\ncan you increse the font size in the Hero section H1. and delete h2 heading \n\n	delivered	\N	2026-03-25 18:41:34.290534+05:30	\N	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
22	slack	teams	C0AHHG10HDG	Pelotech - Josef	"Can you update the footer section?"	delivered	\N	2026-03-26 17:39:11.30614+05:30	19	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
23	slack	teams	C0AHE5C59NH	Buildbite	can u please use the images we provided, it will look real.	delivered	\N	2026-03-26 17:44:28.968255+05:30	20	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
33	slack	teams	C0AHE5C59NH	Buildbite	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	delivered	\N	2026-03-26 18:05:06.126329+05:30	30	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
35	slack	teams	C0AHE5C59NH	Buildbite	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me	delivered	\N	2026-03-26 18:10:25.344944+05:30	31	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
37	slack	teams	C0AHE5C59NH	Buildbite	Hi, is the Event page ready with all that we spoke about yesterday?	delivered	\N	2026-03-26 18:18:19.262482+05:30	32	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
38	slack	teams	C0AHHG10HDG	Ignite Deep Tech	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me	delivered	\N	2026-03-26 18:22:46.532144+05:30	33	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
39	slack	teams	C0AHE5C59NH	Buildbite	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	delivered	\N	2026-03-26 18:27:12.32349+05:30	35	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
53	whatsapp	teams	Test-grp	Atomic Object	As i mentioned, this is too dark. It looks good but too dark. Please make changes	delivered	\N	2026-04-01 18:26:48.636293+05:30	57	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
77	whatsapp	teams	Test-grp	Test Group	Update the footer to place 'ME' after 'MY TEAM'.	delivered	\N	2026-04-07 13:15:38.178068+05:30	84	0	\N	\N	2026-04-07 13:15:38.178068+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
78	whatsapp	teams	Test-grp	Test Group	Urgent request to update the footer by placing 'ME' after 'My Teams'.	delivered	\N	2026-04-07 13:16:10.488662+05:30	85	0	\N	\N	2026-04-07 13:16:10.488662+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
79	whatsapp	teams	Test-grp	Test Group	Remove the specified page.	delivered	\N	2026-04-07 13:25:04.376309+05:30	86	0	\N	\N	2026-04-07 13:25:04.376309+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
80	whatsapp	teams	Test-grp	Test Group	Urgent tasks: Remove background images, update task sheet, delete page, make pages visible without login, add stripe pay	delivered	\N	2026-04-07 14:11:18.16767+05:30	87	0	\N	\N	2026-04-07 14:11:18.16767+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
40	whatsapp	teams	Test-grp	Atomic Object	(https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing) before the blue butto	delivered	\N	2026-03-26 18:28:48.526375+05:30	37	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
41	whatsapp	teams	Sellers Umbrella - MXP Webflow Development	Buildbite	All 5 shapes are approved. Please proceed with 3D stone development.\n\nOne correction, Icon 5 (Globe with arrow) is label	delivered	\N	2026-03-30 16:30:24.258831+05:30	38	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
42	whatsapp	teams	Test-grp	Atomic Object	Can u fix the bottom nav section?	delivered	\N	2026-03-30 17:18:46.258421+05:30	40	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
43	whatsapp	teams	Test-grp	Atomic Object	Can you update the image on home page .	delivered	\N	2026-03-30 17:24:44.594633+05:30	41	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
3	whatsapp	teams	Test-grp	unknown	Change the categories	dead	no mapping found	2026-03-25 17:46:10.740947+05:30	\N	4	2026-04-02 16:21:04.788456+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
4	whatsapp	teams	Test-grp	unknown	Change the categories	dead	no mapping found	2026-03-25 17:46:10.832676+05:30	\N	4	2026-04-02 16:21:04.790744+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
5	whatsapp	teams	Test-grp	unknown	Change the background color!!!	dead	no mapping found	2026-03-25 17:50:50.320245+05:30	\N	4	2026-04-02 16:21:04.793614+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
6	whatsapp	teams	Test-grp	unknown	Change the background color!!!	dead	no mapping found	2026-03-25 17:50:51.544106+05:30	\N	4	2026-04-02 16:21:04.797395+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
8	whatsapp	teams	Avishkar Branding	unknown	@91354038329460 please use the above creative.	dead	no mapping found	2026-03-25 17:52:58.745693+05:30	\N	4	2026-04-02 16:21:04.802866+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
10	whatsapp	teams	Test-grp	unknown	https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa…	dead	no mapping found	2026-03-25 17:55:35.740268+05:30	\N	4	2026-04-02 16:21:04.807907+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
11	whatsapp	teams	Test-grp	unknown	Refer this link for the content	dead	no mapping found	2026-03-25 17:55:43.095172+05:30	\N	4	2026-04-02 16:21:04.810631+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
12	whatsapp	teams	Test-grp	unknown	Refer this link for the content	dead	no mapping found	2026-03-25 17:55:43.135539+05:30	\N	4	2026-04-02 16:21:04.81329+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
14	whatsapp	teams	Test-grp	unknown	https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa…	dead	no mapping found	2026-03-25 17:58:39.101316+05:30	\N	4	2026-04-02 16:21:04.818113+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
15	whatsapp	teams	Test-grp	unknown	Atomic grp:\nCan u please work on these links?	dead	no mapping found	2026-03-25 18:04:26.617595+05:30	\N	4	2026-04-02 16:21:04.820582+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
16	whatsapp	teams	Test-grp	unknown	Atomic grp:\nCan u please work on these links?	dead	no mapping found	2026-03-25 18:04:27.286983+05:30	\N	4	2026-04-02 16:21:04.823427+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
18	whatsapp	teams	Test-grp	unknown	*UnifiedHub*\nIgnore - test auto forwarding \nhttps://buildbite.com/insights/author/lars-micha%C3%ABl\n	dead	no mapping found	2026-03-25 18:05:53.312367+05:30	\N	4	2026-04-02 16:21:04.830301+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
24	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>)  before the blue bu	dead	no mapping found	2026-03-26 17:44:49.794343+05:30	\N	4	2026-04-02 16:21:04.832962+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
26	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	dead	no mapping found	2026-03-26 17:49:54.232524+05:30	\N	4	2026-04-02 16:26:04.817626+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
27	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	dead	no mapping found	2026-03-26 17:50:06.572636+05:30	\N	4	2026-04-02 16:26:04.83208+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
28	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	dead	no mapping found	2026-03-26 17:50:37.059831+05:30	\N	4	2026-04-02 16:26:04.836272+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
30	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	dead	no mapping found	2026-03-26 17:59:48.7253+05:30	\N	4	2026-04-02 16:26:04.84459+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
31	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	dead	no mapping found	2026-03-26 18:03:41.241647+05:30	\N	4	2026-04-02 16:26:04.847404+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
32	slack	teams	C0AHHG10HDG	unknown	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me	dead	no mapping found	2026-03-26 18:04:34.543032+05:30	\N	4	2026-04-02 16:26:04.850076+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
36	slack	teams	C0AHHG10HDG	unknown	Hi, is the Event page ready with all that we spoke about yesterday?	dead	no mapping found	2026-03-26 18:17:53.306646+05:30	\N	4	2026-04-02 16:26:04.856892+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
44	whatsapp	teams	Test-grp	Atomic Object	Also update the H1 line	delivered	\N	2026-03-30 17:24:45.326963+05:30	42	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
45	whatsapp	teams	Test-grp	Atomic Object	Add sub heading	delivered	\N	2026-03-30 17:25:39.657587+05:30	43	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
46	whatsapp	teams	Test-grp	Atomic Object	All 5 shapes are approved. Please proceed with 3D stone development.\n\nOne correction, Icon 5 (Globe with arrow) is label	delivered	\N	2026-03-30 17:29:23.987838+05:30	45	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
47	slack	teams	C0AHE5C59NH	Buildbite	also add dark/light theme with a button and not emoji.	delivered	\N	2026-03-30 17:35:34.364311+05:30	46	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
48	whatsapp	teams	Deep Website	Deep Group	All Folders for Events,CSR, Awards, etc.- https://drive.google.com/drive/folders/0ADH3U8cgoX4JUk9PVA	delivered	\N	2026-04-01 15:03:03.125068+05:30	50	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
49	whatsapp	teams	Deep Website	Deep Group	All Project Details and Pictures will be kept at - https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGj	delivered	\N	2026-04-01 15:03:03.153399+05:30	51	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
50	whatsapp	teams	Test-grp	Atomic Object	https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link	delivered	\N	2026-04-01 17:27:30.22319+05:30	54	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
51	whatsapp	teams	Test-grp	Atomic Object	Make the changes asap	delivered	\N	2026-04-01 18:09:56.564434+05:30	55	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
52	whatsapp	teams	Test-grp	Atomic Object	Remove "buy again" button	delivered	\N	2026-04-01 18:16:47.321874+05:30	56	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
54	whatsapp	teams	Test-grp	Atomic Object	Remove "buy again" button	delivered	\N	2026-04-01 18:28:09.867629+05:30	59	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
55	whatsapp	teams	Test-grp	Atomic Object	Cool, please go ahead.	delivered	\N	2026-04-02 14:19:21.964351+05:30	60	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
56	whatsapp	teams	Test-grp	Atomic Object	Approved	delivered	\N	2026-04-02 14:32:40.103598+05:30	61	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
57	whatsapp	teams	Test-grp	Atomic Object	Looks cool	delivered	\N	2026-04-02 14:47:18.12696+05:30	62	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
58	whatsapp	teams	Test-grp	Atomic Object	Approved	delivered	\N	2026-04-02 15:06:18.49373+05:30	\N	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
59	whatsapp	teams	Test-grp	Atomic Object	So this is the new template for all persona-pages. Can you help redesign the two landing pages we created previously?\n\nC	delivered	\N	2026-04-02 15:55:26.853098+05:30	64	0	\N	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
1	whatsapp	teams	Test-grp	unknown	Hello "atomic grp"\nCan you please also check the hearder and the footer section?	dead	no mapping found	2026-03-25 17:39:37.67848+05:30	\N	4	2026-04-02 16:21:04.770108+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
2	whatsapp	teams	Test-grp	unknown	Hello "atomic grp"\nCan you please also check the hearder and the footer section?	dead	no mapping found	2026-03-25 17:39:38.022681+05:30	\N	4	2026-04-02 16:21:04.786106+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
7	whatsapp	teams	Avishkar Branding	unknown	@91354038329460 please use the above creative.	dead	no mapping found	2026-03-25 17:52:58.456064+05:30	\N	4	2026-04-02 16:21:04.80065+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
9	whatsapp	teams	Test-grp	unknown	https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa…	dead	no mapping found	2026-03-25 17:55:34.964448+05:30	\N	4	2026-04-02 16:21:04.805618+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
13	whatsapp	teams	Test-grp	unknown	https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa…	dead	no mapping found	2026-03-25 17:58:39.086297+05:30	\N	4	2026-04-02 16:21:04.815891+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
17	whatsapp	teams	Test-grp	unknown	*UnifiedHub*\nIgnore - test auto forwarding \nhttps://buildbite.com/insights/author/lars-micha%C3%ABl\n	dead	no mapping found	2026-03-25 18:05:52.988081+05:30	\N	4	2026-04-02 16:21:04.826577+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
25	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	dead	no mapping found	2026-03-26 17:48:11.719962+05:30	\N	4	2026-04-02 16:21:04.835989+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
29	slack	teams	C0AHHG10HDG	unknown	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue but	dead	no mapping found	2026-03-26 17:56:36.846796+05:30	\N	4	2026-04-02 16:26:04.840123+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
34	slack	teams	C0AHHG10HDG	unknown	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me	dead	no mapping found	2026-03-26 18:09:59.987577+05:30	\N	4	2026-04-02 16:26:04.854068+05:30	\N	2026-04-02 16:00:10.117233+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
60	whatsapp	teams	Test-grp	Atomic Object	Remove the images from background. I'll provide you our real workers images	delivered	\N	2026-04-02 18:22:54.533489+05:30	66	0	\N	\N	2026-04-02 18:22:54.533489+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
61	whatsapp	teams	Deep Website	Deep Group	Hi! Can you use project images from google drive - Deep Central > Project Details folder as well as this additional fold	delivered	\N	2026-04-03 10:33:15.147339+05:30	68	0	\N	\N	2026-04-03 10:33:15.147339+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
62	whatsapp	teams	Test-grp	Atomic Object	Please delete this page entirely https://trust-certificate-program.teachery.co/global-data-innovation-peach	delivered	\N	2026-04-03 11:21:09.920517+05:30	72	0	\N	\N	2026-04-03 11:21:09.920517+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
63	whatsapp	teams	Test-grp	Atomic Object	Hi,\n\nI’m sharing the task optimization sheet with you:\n\nhttps://docs.google.com/spreadsheets/d/1xoUAQd-HSev178TkPmNPiPQF	delivered	\N	2026-04-03 11:21:10.270482+05:30	73	0	\N	\N	2026-04-03 11:21:10.270482+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
64	whatsapp	teams	Test-grp	Atomic Object	For the AI Trust Certificate Program.  Please make the following three pages visible without login and add stripe paymen	delivered	\N	2026-04-03 11:21:10.478495+05:30	74	0	\N	\N	2026-04-03 11:21:10.478495+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
65	whatsapp	teams	Sellers Umbrella - MXP Webflow Development	Buildbite	ok	delivered	\N	2026-04-03 11:40:35.552502+05:30	\N	0	\N	\N	2026-04-03 11:40:35.552502+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
66	whatsapp	teams	Deep Website	Deep Group	Ok	delivered	\N	2026-04-03 11:48:51.813568+05:30	\N	0	\N	\N	2026-04-03 11:48:51.813568+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
67	whatsapp	teams	Test-grp	Test Group	Ok	delivered	\N	2026-04-03 12:13:43.257541+05:30	\N	0	\N	\N	2026-04-03 12:13:43.257541+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
68	whatsapp	teams	Test-grp	Test Group	Sure	delivered	\N	2026-04-03 12:15:04.578526+05:30	\N	0	\N	\N	2026-04-03 12:15:04.578526+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
69	whatsapp	teams	Test-grp	Test Group	We do have them, and it should be the same in the new one.	delivered	\N	2026-04-03 12:45:38.100878+05:30	\N	0	\N	\N	2026-04-03 12:45:38.100878+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
70	whatsapp	teams	Test-grp	Test Group	Sure	delivered	\N	2026-04-03 12:46:22.66712+05:30	\N	0	\N	\N	2026-04-03 12:46:22.66712+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
71	whatsapp	teams	Avishkar Branding	Avishkar Developers	Okay	delivered	\N	2026-04-03 13:02:38.577569+05:30	\N	0	\N	\N	2026-04-03 13:02:38.577569+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
72	whatsapp	teams	Sellers Umbrella - MXP Webflow Development	Buildbite	[MAYUR SINGH] Hello @274409873006660\n\nApologies for the delayed response. \nWe’ve completed all the 3D elements and made 	delivered	\N	2026-04-06 14:56:22.606636+05:30	76	0	\N	\N	2026-04-06 14:56:22.606636+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
73	whatsapp	teams	Deep Website	Deep Group	[Nupur Patel] For @abode we will use 3D as it is under construction\n[Nupur Patel] @218386235654275 , pls provide HD phot	delivered	\N	2026-04-06 14:56:30.569428+05:30	77	0	\N	\N	2026-04-06 14:56:30.569428+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
74	whatsapp	teams	Sellers Umbrella - MXP Webflow Development	Buildbite	@274409873006660\nJoin using this link\n\nhttps://meet.google.com/igj-ogzj-gju	delivered	\N	2026-04-06 15:27:50.041363+05:30	79	0	\N	\N	2026-04-06 15:27:50.041363+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
75	whatsapp	teams	Deep Website	Deep Group	What were the other design options you showcased? Can I see them again?	delivered	\N	2026-04-06 15:29:42.804394+05:30	\N	0	\N	\N	2026-04-06 15:29:42.804394+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
76	whatsapp	teams	Deep Website	Deep Group	For residential project- related projects has to be residential..	delivered	\N	2026-04-06 15:33:41.511426+05:30	81	0	\N	\N	2026-04-06 15:33:41.511426+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
81	slack	teams	unknown	unknown	please update it asap.	dead	no mapping found	2026-04-07 14:26:41.423371+05:30	\N	4	2026-04-07 14:30:45.722448+05:30	\N	2026-04-07 14:26:41.423371+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	\N	\N	f	[]	tenant-default
82	slack	teams	C0AHHG10HDG	Ignite Deep Tech	Update the footer color to dark olive green, provide Figma link, share the document, and confirm if the button has been 	dead	is_batched is not defined	2026-04-07 16:15:40.110497+05:30	88	4	2026-04-07 16:19:15.24192+05:30	\N	2026-04-07 16:15:40.110497+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	change_request	The message contains a request for confirmation on a previously mentioned task.	f	[]	tenant-default
83	slack	teams	C0AHHG10HDG	Ignite Deep Tech	Update the footer color to dark olive green, provide the Figma link, share the document, confirm Event page readiness, a	dead	is_batched is not defined	2026-04-07 16:27:17.725506+05:30	89	4	2026-04-07 16:29:15.121464+05:30	\N	2026-04-07 16:27:17.725506+05:30	\N	\N	\N	Missing teams_chat_id or card_content	\N	change_request	Multiple actionable requests for updates and changes.	f	[]	tenant-default
84	whatsapp	teams	Deep Website	Deep Group	Check the design image for Indraprasth Abode and provide feedback.	delivered	\N	2026-04-07 16:35:48.249082+05:30	91	0	\N	\N	2026-04-07 16:35:48.249082+05:30	\N	\N	\N	\N	\N	\N	\N	f	[]	tenant-default
85	teams	teams-drafts	Internal Chat	Review Dashboard	check comments Design intern. Kishan Ravaliya	delivered	\N	2026-04-07 17:29:17.788214+05:30	\N	0	\N	\N	2026-04-07 17:29:17.788214+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	f	[]	tenant-default
86	teams	teams-drafts	Internal Chat	Review Dashboard	https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link	delivered	\N	2026-04-07 17:37:29.392384+05:30	\N	0	\N	\N	2026-04-07 17:37:29.392384+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	f	[]	tenant-default
87	teams	teams-drafts	Internal Chat	Review Dashboard	comments Resolve Abhishek Soni	delivered	\N	2026-04-07 18:02:52.672516+05:30	\N	0	\N	\N	2026-04-07 18:02:52.672516+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	f	[]	tenant-default
88	teams	teams-drafts	Internal Chat	Review Dashboard	okk	delivered	\N	2026-04-07 18:04:31.999335+05:30	\N	0	\N	\N	2026-04-07 18:04:31.999335+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	f	[]	tenant-default
89	teams	teams-drafts	Internal Chat	Review Dashboard	Amazon Ads Partner: https://advertising.amazon.com/partners/directory/details/amzn1.ads1.ma1.ck8lnsp2l2welghoag14ssq2y/S	delivered	\N	2026-04-07 18:25:23.583171+05:30	\N	0	\N	\N	2026-04-07 18:25:23.583171+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	f	[]	tenant-default
90	teams	teams-drafts	Internal Chat	Review Dashboard	Abhishek Soni\n\nI’ve completed the Media Index and have begun working on the Press Release page.\n\nI will address the rema	delivered	\N	2026-04-07 18:32:58.697392+05:30	\N	0	\N	\N	2026-04-07 18:32:58.697392+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	f	[]	tenant-default
91	teams	teams-drafts	Internal Chat	Review Dashboard	https://buildbite-25848238.hs-sites-eu1.com/cleaning-janitorial-services-new\n\nhttps://buildbite-25848238.hs-sites-eu1.co	delivered	\N	2026-04-08 10:36:52.004425+05:30	\N	0	\N	\N	2026-04-08 10:36:52.004425+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	f	[]	tenant-default
92	teams	teams-drafts	Internal Chat	Review Dashboard	Abhishek Soni please check	delivered	\N	2026-04-08 10:38:52.343497+05:30	\N	0	\N	\N	2026-04-08 10:38:52.343497+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	f	[]	tenant-default
93	teams	teams-drafts	Internal Chat	Review Dashboard	Not satisfying to me	delivered	\N	2026-04-08 10:53:49.292491+05:30	\N	0	\N	\N	2026-04-08 10:53:49.292491+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	f	[]	tenant-default
94	teams	teams-drafts	Internal Chat	Review Dashboard	Mayursingh Chundawat please come	delivered	\N	2026-04-08 11:06:13.904547+05:30	\N	0	\N	\N	2026-04-08 11:06:13.904547+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	f	[]	tenant-default
95	teams	teams-drafts	Internal Chat	Review Dashboard	Aditya Panchal,  please check	delivered	\N	2026-04-08 11:39:50.903973+05:30	\N	0	\N	\N	2026-04-08 11:39:50.903973+05:30	\N	\N	\N	\N	\N	system	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	f	[]	tenant-default
99	slack	teams	C0AHHG10HDG	Ignite Deep Tech	Update footer color to dark olive green, update hero section, provide Figma link, share document, confirm button additio	delivered	\N	2026-04-08 15:00:22.423938+05:30	96	0	\N	\N	2026-04-08 15:00:22.423938+05:30	\N	\N	\N	\N	\N	change_request	Multiple requests for updates and changes to the project.	f	[]	tenant-default
103	slack	teams	C0AHE5C59NH	Buildbite	Change the current background colors with the new design.	delivered	\N	2026-04-08 15:34:39.944032+05:30	100	0	\N	\N	2026-04-08 15:34:39.944032+05:30	\N	\N	\N	\N	\N	change_request	Request to change background colors with a new design.	f	[]	tenant-default
\.


--
-- Data for Name: incoming_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incoming_messages (id, source, sender, content, status, created_at, attachments, client_id) FROM stdin;
1	teams	John	Project file updated.	pending	2026-02-23 14:33:55.446385	\N	\N
2	teams	John	Project file updated.	pending	2026-02-23 14:46:21.918141	\N	\N
3	teams	John	Project file updated.	pending	2026-02-23 14:56:21.546078	\N	\N
4	teams	John	Project file updated.	pending	2026-02-23 15:14:22.401312	\N	\N
5	teams	John	Project file updated.	pending	2026-02-23 15:16:19.028261	\N	\N
6	teams	John	Client wants urgent revision before Friday.	pending	2026-02-23 15:17:09.194599	\N	\N
7	teams	John	Client needs urgent security fix deployed tonight.	pending	2026-02-23 15:28:39.670163	\N	\N
8	teams	John	Client needs urgent security fix deployed tonight.	pending	2026-02-23 15:36:10.23644	\N	\N
9	teams	John	Client needs urgent security fix deployed tonight.	pending	2026-02-23 15:55:32.594291	\N	\N
10	teams-channel	Dev intern	<p>hi - test.</p>	pending	2026-02-26 15:13:11.17934	\N	\N
11	teams-channel	parth parmar	<p><at id="0">Khushal</at>&nbsp;<at id="1">Tank</at>&nbsp;stagging link of partnership page&nbsp;</p>	pending	2026-02-26 15:13:12.321113	\N	\N
12	teams-channel	Dev intern	<p>hi - test.</p>	pending	2026-02-26 15:13:12.619971	\N	\N
13	teams-channel	parth parmar	<p><at id="0">Khushal</at>&nbsp;<at id="1">Tank</at>&nbsp;stagging link of partnership page&nbsp;</p>	pending	2026-02-26 15:13:16.314712	\N	\N
14	teams-channel	Dev intern	<p>hi - test.</p>	pending	2026-02-26 15:13:19.623366	\N	\N
15	teams-channel	parth parmar	<p><at id="0">Khushal</at>&nbsp;<at id="1">Tank</at>&nbsp;stagging link of partnership page&nbsp;</p>	pending	2026-02-26 15:13:36.080218	\N	\N
16	teams-channel	parth parmar	<p><at id="0">Kishan</at>&nbsp;<at id="1">Ravaliya</at>&nbsp;let's conclude this today&nbsp;</p>	pending	2026-02-26 15:13:36.170011	\N	\N
17	teams-channel	parth parmar	<p><at id="0">Kishan</at>&nbsp;<at id="1">Ravaliya</at>&nbsp;let's conclude this today&nbsp;</p>	pending	2026-02-26 15:13:36.201641	\N	\N
18	teams-channel	Kishan Ravaliya	<p><a href="https://antonbobrov.github.io/threejs-runic-alphabet/" rel="noreferrer noopener" title="https://antonbobrov.github.io/threejs-runic-alphabet/" target="_blank">https://antonbobrov.github.io/threejs-runic-alphabet/</a></p>	pending	2026-02-26 16:36:55.27642	\N	\N
19	teams-channel	Kishan Ravaliya	<p><a href="https://antonbobrov.github.io/threejs-runic-alphabet/" rel="noreferrer noopener" title="https://antonbobrov.github.io/threejs-runic-alphabet/" target="_blank">https://antonbobrov.github.io/threejs-runic-alphabet/</a></p>	pending	2026-02-26 16:36:55.834556	\N	\N
20	teams-channel	Kishan Ravaliya	<p><a href="https://antonbobrov.github.io/threejs-runic-alphabet/" rel="noreferrer noopener" title="https://antonbobrov.github.io/threejs-runic-alphabet/" target="_blank">https://antonbobrov.github.io/threejs-runic-alphabet/</a></p>	pending	2026-02-26 16:36:56.707866	\N	\N
21	teams-channel	Kishan Ravaliya	<p><a href="https://antonbobrov.github.io/threejs-runic-alphabet/" rel="noreferrer noopener" title="https://antonbobrov.github.io/threejs-runic-alphabet/" target="_blank">https://antonbobrov.github.io/threejs-runic-alphabet/</a></p>	pending	2026-02-26 16:36:58.904157	\N	\N
22	teams-channel	Kishan Ravaliya	<p><a href="https://antonbobrov.github.io/threejs-runic-alphabet/" rel="noreferrer noopener" title="https://antonbobrov.github.io/threejs-runic-alphabet/" target="_blank">https://antonbobrov.github.io/threejs-runic-alphabet/</a></p>	pending	2026-02-26 16:37:06.679757	\N	\N
23	teams-channel	Kishan Ravaliya	<p><a href="https://antonbobrov.github.io/threejs-runic-alphabet/" rel="noreferrer noopener" title="https://antonbobrov.github.io/threejs-runic-alphabet/" target="_blank">https://antonbobrov.github.io/threejs-runic-alphabet/</a></p>	pending	2026-02-26 16:37:24.297422	\N	\N
24	teams-channel	parth parmar	<p><a href="https://buildbite.com/hubfs/slider-1.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-1.svg" target="_blank">https://buildbite.com/hubfs/slider-1.svg</a></p>\n<p><a href="https://buildbite.com/hubfs/slider-2.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-2.svg" target="_blank">https://buildbite.com/hubfs/slider-2.svg</a></p>\n<p><a href="https://buildbite.com/hubfs/slider-3.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-3.svg" target="_blank">https://buildbite.com/hubfs/slider-3.svg</a></p>\n<p>&nbsp;</p>\n<p>check 1 to 6 images. and comptessed as all the images are more then 500kb and it's a thumbnail so not more then 50kb.&nbsp;</p>	pending	2026-02-26 16:42:52.10315	\N	\N
25	teams-channel	parth parmar	<p><a href="https://buildbite.com/hubfs/slider-1.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-1.svg" target="_blank">https://buildbite.com/hubfs/slider-1.svg</a></p>\n<p><a href="https://buildbite.com/hubfs/slider-2.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-2.svg" target="_blank">https://buildbite.com/hubfs/slider-2.svg</a></p>\n<p><a href="https://buildbite.com/hubfs/slider-3.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-3.svg" target="_blank">https://buildbite.com/hubfs/slider-3.svg</a></p>\n<p>&nbsp;</p>\n<p>check 1 to 6 images. and comptessed as all the images are more then 500kb and it's a thumbnail so not more then 50kb.&nbsp;</p>	pending	2026-02-26 16:42:55.023972	\N	\N
26	teams-channel	parth parmar	<p><at id="0">Design</at>&nbsp;<at id="1">intern</at>&nbsp;<at id="2">Kishan</at>&nbsp;<at id="3">Ravaliya</at></p>	pending	2026-02-26 16:43:01.124268	\N	\N
27	teams-channel	parth parmar	<p><at id="0">Design</at>&nbsp;<at id="1">intern</at>&nbsp;<at id="2">Kishan</at>&nbsp;<at id="3">Ravaliya</at></p>	pending	2026-02-26 16:43:04.567335	\N	\N
28	teams-channel	parth parmar	<p><a href="https://buildbite.com/hubfs/slider-1.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-1.svg" target="_blank">https://buildbite.com/hubfs/slider-1.svg</a></p>\n<p><a href="https://buildbite.com/hubfs/slider-2.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-2.svg" target="_blank">https://buildbite.com/hubfs/slider-2.svg</a></p>\n<p><a href="https://buildbite.com/hubfs/slider-3.svg" rel="noreferrer noopener" title="https://buildbite.com/hubfs/slider-3.svg" target="_blank">https://buildbite.com/hubfs/slider-3.svg</a></p>\n<p>&nbsp;</p>\n<p>check 1 to 6 images. and comptessed as all the images are more then 500kb and it's a thumbnail so not more then 50kb.&nbsp;</p>	pending	2026-02-26 16:43:12.844831	\N	\N
29	teams-channel	Aditya Panchal	<p><at id="0">Sandeepsingh</at>&nbsp;<at id="1">Sisodiya</at>&nbsp;let me know when to conduct interview</p>	pending	2026-02-26 16:43:16.767014	\N	\N
30	teams-channel	Khushal Tank	<p><img src="https://graph.microsoft.com/v1.0/chats/19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2/messages/1772104409521/hostedContents/aWQ9eF8wLXNpbi1kMy1lYTdhMzBmYTk4NDY2MzJmMWMzNzRiNGVkYTU1ODlmYyx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMy1lYTdhMzBmYTk4NDY2MzJmMWMzNzRiNGVkYTU1ODlmYy92aWV3cy9pbWdv/$value" width="337.8378378378378" height="250" alt="image" itemid="0-sin-d3-ea7a30fa9846632f1c374b4eda5589fc"></p>\n<p>LinkedIn Link Missing</p>	pending	2026-02-26 16:43:32.346561	\N	\N
31	teams-channel	Khushal Tank	<p><img src="https://graph.microsoft.com/v1.0/chats/19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2/messages/1772104409521/hostedContents/aWQ9eF8wLXNpbi1kMy1lYTdhMzBmYTk4NDY2MzJmMWMzNzRiNGVkYTU1ODlmYyx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMy1lYTdhMzBmYTk4NDY2MzJmMWMzNzRiNGVkYTU1ODlmYy92aWV3cy9pbWdv/$value" width="337.8378378378378" height="250" alt="image" itemid="0-sin-d3-ea7a30fa9846632f1c374b4eda5589fc"></p>\n<p>LinkedIn Link Missing</p>	pending	2026-02-26 16:43:33.971014	\N	\N
32	teams-channel	Vatsal Patel	<p><a href="https://appsrow-my.sharepoint.com/:x:/p/sales/IQBBIRfwBrVVRo1nRBfkWE39AQ-bSV62ekaGZHIbirYhnZc?rtime=qgq0fSZ13kg" itemtype="http://schema.skype.com/HyperLink/Files" rel="noreferrer noopener" title="https://appsrow-my.sharepoint.com/:x:/p/sales/IQBBIRfwBrVVRo1nRBfkWE39AQ-bSV62ekaGZHIbirYhnZc?rtime=qgq0fSZ13kg" target="_blank" itemid="F0172141-B506-4655-8D67-4417E4584DFD">Webflow Portfolio Latest.xlsx</a></p><attachment id="F0172141-B506-4655-8D67-4417E4584DFD"></attachment>	pending	2026-02-26 16:44:22.831196	\N	\N
33	teams-channel	Vatsal Patel	<p><a href="https://appsrow-my.sharepoint.com/:x:/p/sales/IQBBIRfwBrVVRo1nRBfkWE39AQ-bSV62ekaGZHIbirYhnZc?rtime=qgq0fSZ13kg" itemtype="http://schema.skype.com/HyperLink/Files" rel="noreferrer noopener" title="https://appsrow-my.sharepoint.com/:x:/p/sales/IQBBIRfwBrVVRo1nRBfkWE39AQ-bSV62ekaGZHIbirYhnZc?rtime=qgq0fSZ13kg" target="_blank" itemid="F0172141-B506-4655-8D67-4417E4584DFD">Webflow Portfolio Latest.xlsx</a></p><attachment id="F0172141-B506-4655-8D67-4417E4584DFD"></attachment>	pending	2026-02-26 16:44:26.137489	\N	\N
34	teams-channel	Dev intern	<p>hello - test.</p>	pending	2026-02-26 17:09:19.654038	\N	\N
35	teams-channel	Dev intern	<p>hello - test.</p>	pending	2026-02-26 17:09:21.337958	\N	\N
36	teams-channel	parth parmar	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p><attachment id="c4437db9-3386-4775-b07e-a3839cc1b6f9"></attachment>	pending	2026-02-26 17:11:28.253052	\N	\N
37	teams-channel	parth parmar	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p><attachment id="c4437db9-3386-4775-b07e-a3839cc1b6f9"></attachment>	pending	2026-02-26 17:11:30.781398	\N	\N
38	teams-channel	Khushal Tank	<p>troupai</p>\n<p>Iska data nhi he docs me</p>	pending	2026-02-26 17:14:05.609395	\N	\N
39	teams-channel	Khushal Tank	<p>troupai</p>\n<p>Iska data nhi he docs me</p>	pending	2026-02-26 17:14:07.719619	\N	\N
40	teams-channel	Khushal Tank	<p>Cohort #1 dono point iske he</p>	pending	2026-02-26 17:14:13.708728	\N	\N
41	teams-channel	Khushal Tank	<p>Cohort #1 dono point iske he</p>	pending	2026-02-26 17:14:16.344246	\N	\N
42	teams-channel	Design intern	<p><at id="0">Khushal</at>&nbsp;<at id="1">Tank</at></p><attachment id="4e63e291-c43d-4430-ac20-44b4b26a21d1"></attachment>	pending	2026-02-26 17:16:08.261095	\N	\N
43	teams-channel	Design intern	<p><at id="0">Khushal</at>&nbsp;<at id="1">Tank</at></p><attachment id="4e63e291-c43d-4430-ac20-44b4b26a21d1"></attachment>	pending	2026-02-26 17:16:09.72088	\N	\N
44	teams-channel	Khushal Tank	<p><img src="https://graph.microsoft.com/v1.0/chats/19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2/messages/1772106775581/hostedContents/aWQ9eF8wLWNpbi1kMy0xMzU3ODY4MmJhNzdjNGMzNDg1NTUzYWI2OTE5OWQ1Yix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kMy0xMzU3ODY4MmJhNzdjNGMzNDg1NTUzYWI2OTE5OWQ1Yi92aWV3cy9pbWdv/$value" width="463.76101860920664" height="250" alt="image" itemid="0-cin-d3-13578682ba77c4c3485553ab69199d5b"></p>\n<p>&nbsp;</p>\n<p>Cohort #1</p>	pending	2026-02-26 17:22:58.377708	\N	\N
45	teams-channel	Khushal Tank	<p><img src="https://graph.microsoft.com/v1.0/chats/19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2/messages/1772106775581/hostedContents/aWQ9eF8wLWNpbi1kMy0xMzU3ODY4MmJhNzdjNGMzNDg1NTUzYWI2OTE5OWQ1Yix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kMy0xMzU3ODY4MmJhNzdjNGMzNDg1NTUzYWI2OTE5OWQ1Yi92aWV3cy9pbWdv/$value" width="463.76101860920664" height="250" alt="image" itemid="0-cin-d3-13578682ba77c4c3485553ab69199d5b"></p>\n<p>&nbsp;</p>\n<p>Cohort #1</p>	pending	2026-02-26 17:23:00.741573	\N	\N
46	teams-channel	Sandeepsingh Sisodiya	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;Pls add this task update latest projects in webflow partner directory main account .. give it to kushal .</p>	pending	2026-02-26 17:24:09.419455	\N	\N
47	teams-channel	Sandeepsingh Sisodiya	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;Pls add this task update latest projects in webflow partner directory main account .. give it to kushal .</p>	pending	2026-02-26 17:24:12.272536	\N	\N
48	teams-channel	Abhishek Soni	<p>update latest projects in webflow partner directory main account .. give it to kushal .</p>	pending	2026-02-26 17:29:55.93748	\N	\N
49	teams-channel	Abhishek Soni	<p>update latest projects in webflow partner directory main account .. give it to kushal .</p>	pending	2026-02-26 17:29:57.268721	\N	\N
50	teams-channel	Abhishek Soni	<p>Partner profile Account ?</p>	pending	2026-02-26 17:31:06.408722	\N	\N
51	teams-channel	Abhishek Soni	<p>Partner profile Account ?</p>	pending	2026-02-26 17:31:08.993346	\N	\N
52	teams-channel	Dev intern	<p>hi-test</p>	pending	2026-02-26 17:44:20.771037	\N	\N
53	teams-channel	Dev intern	<p>hi- again</p>	pending	2026-02-26 17:44:52.608239	\N	\N
54	teams-channel	Abhishek Soni	<p>hmm strange. <a href="https://me-kp05381.slack.com/team/U05RU2TUAPQ" rel="noreferrer noopener" title="https://me-kp05381.slack.com/team/U05RU2TUAPQ" target="_blank">@Parth</a> - here's a screen recording. I've been timing it and it takes about 30 seconds for the homepage to load for me</p>	pending	2026-02-26 17:49:00.122816	\N	\N
55	teams-channel	Dev intern	<p>ssup.</p>	pending	2026-02-26 18:14:22.244329	\N	\N
56	teams-channel	Dev intern	<p><a href="https://docs.google.com/document/d/1tKkHb_BdR4wtXvwyTLceO4tzo7cXTb5698qQwdFLU4w/edit?usp=sharing" rel="noreferrer noopener" title="https://docs.google.com/document/d/1tKkHb_BdR4wtXvwyTLceO4tzo7cXTb5698qQwdFLU4w/edit?usp=sharing" target="_blank">https://docs.google.com/document/d/1tKkHb_BdR4wtXvwyTLceO4tzo7cXTb5698qQwdFLU4w/edit?usp=sharing</a></p>	pending	2026-02-26 18:29:53.519893	\N	\N
57	teams-channel	Sandeepsingh Sisodiya	<attachment id="1772089092336"></attachment>\n<p>make it live&nbsp;</p>	pending	2026-02-26 18:31:07.725898	\N	\N
58	teams-channel	Khushal Tank	<p><a href="https://buildbite-25848238.hs-sites-eu1.com/cleaning-and-janitorial-services" rel="noreferrer noopener" title="https://buildbite-25848238.hs-sites-eu1.com/cleaning-and-janitorial-services" target="_blank">https://buildbite-25848238.hs-sites-eu1.com/cleaning-and-janitorial-services</a></p>\n<p>&nbsp;</p>\n<p>images update this page</p>	pending	2026-02-26 18:31:09.012298	\N	\N
59	teams-channel	Sandeepsingh Sisodiya	<attachment id="1772102597625"></attachment>\n<p>make it live&nbsp;</p>	pending	2026-02-26 18:31:14.329117	\N	\N
60	teams-channel	Sandeepsingh Sisodiya	<p>yes</p>	pending	2026-02-26 18:31:27.833245	\N	\N
61	teams-channel	Sandeepsingh Sisodiya	<p>He has added already previous all projects&nbsp;</p>	pending	2026-02-26 18:31:48.001117	\N	\N
62	teams-channel	Abhishek Soni	<p>ok</p>	pending	2026-02-26 18:32:07.772608	\N	\N
63	teams-channel	Abhishek Soni	<p>he is fully occupied rn... &nbsp;but informe . &nbsp;Him to do that.&nbsp;</p>	pending	2026-02-26 18:32:36.341074	\N	\N
64	teams-channel	parth parmar	<p>Not urgent for today.</p>\n<p>But add to his task so it will be list on the task list.</p>	pending	2026-02-26 18:33:33.939812	\N	\N
65	teams-channel	Abhishek Soni	<p><a href="https://buildbite.com/lp/construction-demo" rel="noreferrer noopener" title="https://buildbite.com/lp/construction-demo" target="_blank">https://buildbite.com/lp/construction-demo</a> &nbsp;need this&nbsp;</p>	pending	2026-02-26 18:35:03.045902	\N	\N
66	teams-channel	Abhishek Soni	<p><a href="https://www.figma.com/design/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=2480-8430&amp;t=RZSGZFVOdCa1RF4F-0" rel="noreferrer noopener" title="https://www.figma.com/design/hpbzrdbau5magcwvzdtetl/buildbite?node-id=2480-8430&amp;t=rzsgzfvodca1rf4f-0" target="_blank">https://www.figma.com/design/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=2480-8430&amp;t=RZSGZFVOdCa1RF4F-0</a></p>\n<attachment id="app-preview-card-ps465a5deb9d994ddeb99674b59ea92dcf"></attachment>	pending	2026-02-26 18:39:52.002564	\N	\N
67	teams-channel	Dev intern	<attachment id="1772110864838"></attachment>\n<p>done</p>	pending	2026-02-26 18:41:06.317348	\N	\N
68	teams-channel	Abhishek Soni	<p><at id="0">parth</at>&nbsp;<at id="1">parmar</at>. check mail please&nbsp;</p>	pending	2026-02-26 18:42:34.321091	\N	\N
69	teams-channel	Abhishek Soni	<p><a href="https://docs.google.com/document/d/1oJavm2SVkxS-o58wgzj4YWhfYQxKfbr3s9UtenJOTPQ/edit?tab=t.0#heading=h.362thxhpluma" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://docs.google.com/document/d/1oJavm2SVkxS-o58wgzj4YWhfYQxKfbr3s9UtenJOTPQ/edit?tab=t.0#heading=h.362thxhpluma" target="_blank" itemid="default">https://docs.google.com/document/d/1oJavm2SVkxS-o58wgzj4YWhfYQxKfbr3s9UtenJOTPQ/edit?tab=t.0#headin…</a></p>	pending	2026-02-26 18:44:44.1926	\N	\N
70	teams-channel	Abhishek Soni	<p><at id="0">parth</at>&nbsp;<at id="1">parmar</at></p>	pending	2026-02-26 18:44:44.395198	\N	\N
71	teams-channel	Mayursingh Chundawat	<p>hi</p>	pending	2026-02-26 18:44:44.59751	\N	\N
72	teams-channel	Abhishek Soni	<p>tali sent something&nbsp;</p>	pending	2026-02-26 18:44:56.385671	\N	\N
73	teams-channel	Khushal Tank	<p>&nbsp;</p>\n<table>\n<tbody>\n<tr>\n<td>record</td>\n</tr>\n<tr>\n<td>AIMass</td>\n</tr>\n<tr>\n<td>DataFlint</td>\n</tr>\n<tr>\n<td>DYM</td>\n</tr>\n<tr>\n<td>Huskeys</td>\n</tr>\n<tr>\n<td>Impala.ai</td>\n</tr>\n<tr>\n<td>Jazz Sec</td>\n</tr>\n<tr>\n<td>MNDL Bio</td>\n</tr>\n<tr>\n<td>Particle Lab</td>\n</tr>\n<tr>\n<td>SkyPulse</td>\n</tr>\n<tr>\n<td>Twine Security</td>\n</tr>\n</tbody>\n</table>\n<p>&nbsp;</p>	pending	2026-02-26 18:45:54.049492	\N	\N
74	teams-channel	Khushal Tank	<p>&nbsp;</p>\n<table>\n<tbody>\n<tr>\n<td>Parent Record &gt; Tech Stream</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>HW &amp; Manufacturing</td>\n</tr>\n<tr>\n<td>Security and Privacy</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>Security and Privacy</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>HW &amp; Manufacturing</td>\n</tr>\n<tr>\n<td>Autonomous/ Robotics</td>\n</tr>\n<tr>\n<td>Security and Privacy</td>\n</tr>\n</tbody>\n</table>\n<p>&nbsp;</p>	pending	2026-02-26 18:45:56.09916	\N	\N
75	teams-channel	Khushal Tank	<p>&nbsp;</p>\n<table>\n<tbody>\n<tr>\n<td>Parent Record &gt; Name</td>\n</tr>\n<tr>\n<td>AIMass</td>\n</tr>\n<tr>\n<td>DataFlint</td>\n</tr>\n<tr>\n<td>DYM</td>\n</tr>\n<tr>\n<td>Huskeys</td>\n</tr>\n<tr>\n<td>Impala.ai</td>\n</tr>\n<tr>\n<td>Jazz Sec</td>\n</tr>\n<tr>\n<td>MNDL Bio</td>\n</tr>\n<tr>\n<td>Particle Lab</td>\n</tr>\n<tr>\n<td>SkyPulse</td>\n</tr>\n<tr>\n<td>Twine Security</td>\n</tr>\n</tbody>\n</table>\n<p>&nbsp;</p>	pending	2026-02-26 18:46:27.830518	\N	\N
76	teams-channel	Khushal Tank	<p>&nbsp;</p>\n<table>\n<tbody>\n<tr>\n<td>Parent Record &gt; Tech Stream</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>HW &amp; Manufacturing</td>\n</tr>\n<tr>\n<td>Security and Privacy</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>Security and Privacy</td>\n</tr>\n<tr>\n<td>Data, Cloud &amp; Edge</td>\n</tr>\n<tr>\n<td>HW &amp; Manufacturing</td>\n</tr>\n<tr>\n<td>Autonomous/ Robotics</td>\n</tr>\n<tr>\n<td>Security and Privacy</td>\n</tr>\n</tbody>\n</table>\n<p>&nbsp;</p>	pending	2026-02-26 18:46:32.890674	\N	\N
77	teams-channel	Abhishek Soni	<p><a href="https://drive.google.com/drive/folders/16MBSlXnfJgSQIbofkBiRn_NAQ18uvWJP?usp=sharing" rel="noreferrer noopener" title="https://drive.google.com/drive/folders/16MBSlXnfJgSQIbofkBiRn_NAQ18uvWJP?usp=sharing" target="_blank">https://drive.google.com/drive/folders/16MBSlXnfJgSQIbofkBiRn_NAQ18uvWJP?usp=sharing</a></p>	pending	2026-02-26 18:48:35.425363	\N	\N
78	teams-channel	Abhishek Soni	<p>videos</p>	pending	2026-02-26 18:48:41.679106	\N	\N
79	teams-channel	Mayursingh Chundawat	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p>\n<p>I’ve completed the Insights post and have started working on the Offices page.</p>	pending	2026-02-26 18:51:06.709253	\N	\N
80	teams-channel	Khushal Tank	<attachment id="1772111279167"></attachment>\n<p><a href="https://buildbite-25848238.hs-sites-eu1.com/cleaning-and-janitorial-services" rel="noreferrer noopener" title="https://buildbite-25848238.hs-sites-eu1.com/cleaning-and-janitorial-services" target="_blank">https://buildbite-25848238.hs-sites-eu1.com/cleaning-and-janitorial-services</a></p>\n<p>&nbsp;</p>\n<p>DOne</p>	pending	2026-02-27 10:37:31.436242	\N	\N
81	teams-channel	Sandeepsingh Sisodiya	Ryan	pending	2026-02-27 10:37:37.537098	\N	\N
82	teams-channel	Abhishek Soni	<p>can you take a look at the homepage for atomic object? there are a couple of items there in figma. theres are a couple of others for the insights post as well</p>	pending	2026-02-27 10:38:11.440077	\N	\N
83	teams-channel	Sandeepsingh Sisodiya	<div><at id="0">Vatsal Patel</at> if we have proposal for Ceel / Ryan do share with me</div>	pending	2026-02-27 10:38:21.573436	\N	\N
\.


--
-- Data for Name: message_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_logs (id, draft_id, action_type, performed_by, metadata, created_at) FROM stdin;
1	1	test_manual	system	{}	2026-02-24 11:34:21.979768
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, source, sender, content, file_url, file_name, file_type, thread_id, dismissed, created_at) FROM stdin;
\.


--
-- Data for Name: slack_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.slack_messages (id, sender, sender_id, body, "timestamp", channel_id, channel_name, ts, forwarded_to_teams, forwarded_at, created_at, dismissed, edited_body, files, tenant_id) FROM stdin;
57	purvi.​appsrow	\N	also lemme know if you updated the hero section i mentioned earlier?	2026-04-08 15:00:07.477+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-04-08 15:00:22.422596+05:30	2026-04-08 15:00:09.744054+05:30	f	\N	[]	tenant-default
60	purvi.​appsrow	\N	also do it asap.	2026-04-08 15:07:16.302+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-04-08 15:07:31.885441+05:30	2026-04-08 15:07:19.090181+05:30	f	\N	[]	tenant-default
62	purvi.​appsrow	\N	also make it in green and not in pink.	2026-04-08 15:52:40.445+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-04-08 15:52:42.346134+05:30	f	\N	[]	tenant-default
24	purvi.​appsrow	\N	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me with the figma link.	2026-03-26 17:29:56.352+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-03-26 17:29:59.867823+05:30	f	\N	[]	tenant-default
58	purvi.​appsrow	\N	also add this image.	2026-04-08 15:01:00.106+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-04-08 15:01:14.871414+05:30	2026-04-08 15:01:01.812117+05:30	f	\N	[]	tenant-default
37	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 18:03:37.345+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 18:03:41.207548+05:30	f	\N	[]	tenant-default
38	purvi.​appsrow	\N	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me with the figma link.\nalso share me the document.	2026-03-26 18:04:30.92+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 18:04:34.49415+05:30	f	\N	[]	tenant-default
39	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 18:04:57.903+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-03-26 18:05:06.119413+05:30	2026-03-26 18:05:01.067741+05:30	f	\N	[]	tenant-default
40	purvi.​appsrow	\N	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me with the figma link.\nalso share me the document.	2026-03-26 18:09:57.73+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 18:09:59.964906+05:30	f	\N	[]	tenant-default
25	purvi.​appsrow	\N	update the footer within 2 days, i want to publish it.	2026-03-26 17:30:50.93+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-03-26 17:30:55.115397+05:30	f	\N	[]	tenant-default
26	purvi.​appsrow	\N	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me with the figma link.\nalso share me the document.	2026-03-26 17:35:04.129+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-03-26 17:35:10.040987+05:30	2026-03-26 17:35:05.945583+05:30	f	\N	[]	tenant-default
27	purvi.​appsrow	\N	"Can you update the footer section?"	2026-03-26 17:38:38.708+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-03-26 17:38:47.577614+05:30	2026-03-26 17:38:42.228933+05:30	f	\N	[]	tenant-default
28	purvi.​appsrow	\N	"Can you update the footer section?"	2026-03-26 17:38:06.733+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-03-26 17:39:11.30231+05:30	2026-03-26 17:39:10.977083+05:30	f	\N	[]	tenant-default
29	purvi.​appsrow	\N	can u please use the images we provided, it will look real.	2026-03-26 17:44:21.24+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-03-26 17:44:28.965919+05:30	2026-03-26 17:44:24.603775+05:30	f	\N	[]	tenant-default
30	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>)  before the blue button and the logos near the last paragraph.  Add photos of TheMerode to the right of the first paragraph	2026-03-26 17:44:46.018+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 17:44:49.776039+05:30	f	\N	[]	tenant-default
31	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 17:48:08.583+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 17:48:11.6816+05:30	f	\N	[]	tenant-default
32	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 17:49:50.363+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 17:49:54.20493+05:30	f	\N	[]	tenant-default
33	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 17:50:04.184+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 17:50:06.560566+05:30	f	\N	[]	tenant-default
34	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 17:50:34.873+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 17:50:37.017262+05:30	f	\N	[]	tenant-default
35	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 17:56:32.828+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 17:56:36.721207+05:30	f	\N	[]	tenant-default
36	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 17:59:46.477+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 17:59:48.697655+05:30	f	\N	[]	tenant-default
41	purvi.​appsrow	\N	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me with the figma link.\nalso share me the document.	2026-03-26 18:10:19.102+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-03-26 18:10:25.34237+05:30	2026-03-26 18:10:22.235474+05:30	f	\N	[]	tenant-default
42	purvi.​appsrow	\N	Hi, is the Event page ready with all that we spoke about yesterday?	2026-03-26 18:17:49.854+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-03-26 18:17:53.271708+05:30	f	\N	[]	tenant-default
43	purvi.​appsrow	\N	Hi, is the Event page ready with all that we spoke about yesterday?	2026-03-26 18:18:12.89+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-03-26 18:18:19.2311+05:30	2026-03-26 18:18:14.937339+05:30	f	\N	[]	tenant-default
44	purvi.​appsrow	\N	hello <@U0AHE0726MB>\n\ncan you please update the footer section and change it's color to dark olive green?\nalso update me with the figma link.\nalso share me the document.	2026-03-26 18:22:38.367+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-03-26 18:22:46.500711+05:30	2026-03-26 18:22:42.304383+05:30	f	\N	[]	tenant-default
45	purvi.​appsrow	\N	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	2026-03-26 18:27:03.513+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-03-26 18:27:12.308871+05:30	2026-03-26 18:27:06.847842+05:30	f	\N	[]	tenant-default
46	purvi.​appsrow	\N	also add dark/light theme with a button and not emoji.	2026-03-30 17:35:25.449+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-03-30 17:35:34.338862+05:30	2026-03-30 17:35:31.383293+05:30	f	\N	[]	tenant-default
47	purvi.​appsrow	\N	uihoiuhiu	2026-03-30 17:38:44.994+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-03-30 17:38:49.535945+05:30	f	\N	[]	tenant-default
48	purvi.​appsrow	\N	test	2026-03-30 17:38:49.213+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-03-30 17:38:52.045523+05:30	f	\N	[]	tenant-default
49	purvi.​appsrow	\N	Above is content for 2 News posts - I have included 2 awards as news and I. will add third as soon as I get images for relevant one...	2026-04-01 17:48:46.603+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-04-01 17:48:50.496291+05:30	f	\N	[]	tenant-default
50	purvi.​appsrow	\N	ALSO KEEP THEM IN SLIDE	2026-04-01 18:51:14.754+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-04-01 18:51:18.151149+05:30	f	\N	[]	tenant-default
51	purvi.​appsrow	\N	DID U CHECKED THIS?	2026-04-01 18:54:19.529+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-04-01 18:54:23.265529+05:30	f	\N	[]	tenant-default
52	purvi.​appsrow	\N	ANY UPDATES ON THIS?	2026-04-01 18:56:31.956+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-04-01 18:56:35.499684+05:30	f	\N	[]	tenant-default
55	purvi.​appsrow	\N	also lemme know if u added the button, i mentioned earlier.	2026-04-07 16:15:22.719+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-04-07 16:15:40.099218+05:30	2026-04-07 16:15:24.93469+05:30	f	\N	[]	tenant-default
53	purvi.​appsrow	\N	PLEASE UPDATE IT ASAP.	2026-04-01 18:59:52.237+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-04-01 18:59:55.313415+05:30	f	\N	[]	tenant-default
54	purvi.​appsrow	\N	please update it asap.	2026-04-07 14:26:26.404+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	f	\N	2026-04-07 14:26:31.249444+05:30	f	\N	[]	tenant-default
56	purvi.​appsrow	\N	Ignite grp	2026-04-07 16:26:59.073+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-04-07 16:27:17.670034+05:30	2026-04-07 16:27:02.831811+05:30	f	\N	[]	tenant-default
59	purvi.​appsrow	\N	i guess there's something here in schema.\nplease check it	2026-04-08 15:04:12.279+05:30	C0AHHG10HDG	C0AHHG10HDG	\N	t	2026-04-08 15:04:30.412937+05:30	2026-04-08 15:04:17.692514+05:30	f	\N	[]	tenant-default
61	purvi.​appsrow	\N	can u please change the current bg colors with this design?	2026-04-08 15:34:22.494+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-04-08 15:34:39.939662+05:30	2026-04-08 15:34:25.593705+05:30	f	\N	[]	tenant-default
63	purvi.​appsrow	\N	also lemme know, how it looks	2026-04-08 15:58:17.257+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	t	2026-04-08 15:58:34.348735+05:30	2026-04-08 15:58:21.046574+05:30	f	\N	[]	tenant-default
\.


--
-- Data for Name: slack_threads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.slack_threads (thread_id, channel_id, channel_name, summary, client_reply_count, last_processed_ts, forwarded_at_counts, created_at, updated_at, tenant_id) FROM stdin;
1774526396.352649	C0AHE5C59NH	C0AHE5C59NH	- Summary: Purvi has shared content for two news posts, including details about two awards, and plans to add a third once the relevant images are obtained.\n- Key requests:\n  - Addition of a third award to the news posts once images are available.\n- Urgency: Medium\n- Next action: Wait for Purvi to provide the images for the third award and then update the news posts accordingly.	1	1775045926.603159	[]	2026-04-01 17:48:58.817408+05:30	2026-04-01 17:48:58.817408+05:30	tenant-default
1774528497.903219	C0AHE5C59NH	C0AHE5C59NH	- Summary: Purvi from AppsRow has requested that certain items be included in a slide presentation.\n- Key requests:\n  - Ensure specific items are kept in the slide.\n- Urgency: Medium\n- Next action: Review the slide presentation to confirm the requested items are included.	1	1775049674.754969	[1]	2026-04-01 18:51:20.957982+05:30	2026-04-01 18:51:20.957982+05:30	tenant-default
1773824721.309919	C0AHE5C59NH	C0AHE5C59NH	- Summary: Purvi from AppsRow is inquiring if a specific task or item has been checked.\n- Key requests:\n  - Confirmation on whether a particular task or item has been checked.\n- Urgency: Medium\n- Next action: Verify the status of the task or item in question and update Purvi accordingly.	1	1775049859.529439	[1]	2026-04-01 18:54:25.918246+05:30	2026-04-01 18:54:25.918246+05:30	tenant-default
1774526450.930649	C0AHE5C59NH	C0AHE5C59NH	Update Footer Section	2	1775050192.237149	[1, 2]	2026-04-01 18:56:40.434113+05:30	2026-04-01 18:59:59.195299+05:30	tenant-default
1774526886.733149	C0AHHG10HDG	C0AHHG10HDG	\N	1	1775558722.719699	[]	2026-04-07 16:15:26.763505+05:30	2026-04-07 16:15:26.763505+05:30	tenant-default
1775559419.073349	C0AHHG10HDG	C0AHHG10HDG	\N	0	1775559419.073349	[]	2026-04-07 16:27:02.870563+05:30	2026-04-07 16:27:02.870563+05:30	tenant-default
1774529558.367879	C0AHHG10HDG	C0AHHG10HDG	\N	1	1775640607.477089	[]	2026-04-08 15:00:12.194449+05:30	2026-04-08 15:00:12.194449+05:30	tenant-default
1773744294.795569	C0AHHG10HDG	C0AHHG10HDG	\N	1	1775640660.106969	[]	2026-04-08 15:01:03.390121+05:30	2026-04-08 15:01:03.390121+05:30	tenant-default
1773728316.492469	C0AHHG10HDG	C0AHHG10HDG	\N	2	1775641036.302159	[]	2026-04-08 15:04:20.154038+05:30	2026-04-08 15:07:21.020425+05:30	tenant-default
1774006738.377289	C0AHE5C59NH	C0AHE5C59NH	\N	3	1775644097.257449	[2]	2026-04-08 15:34:27.643357+05:30	2026-04-08 15:58:22.597667+05:30	tenant-default
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, source, source_message_id, client_name, platform_label, body, links, images, status, teams_task_id, teams_plan_id, created_at, updated_at, tenant_id, teams_activity_id, teams_conversation_id, completed_at, completed_by) FROM stdin;
92	whatsapp	\N	Purvi Bhatia	Test-grp	Update module 7 to match previous changes.	[]	[]	pending	\N	\N	2026-04-08 14:52:05.279003+05:30	2026-04-08 14:52:05.279003+05:30	tenant-default	\N	\N	\N	\N
96	slack	\N	purvi.​appsrow	Ignite	Update the footer section color to dark olive green., Update the hero section as mentioned earlier., Provide the Figma link., Share the document., Confirm if the button mentioned earlier has been added.	[]	[]	pending	\N	\N	2026-04-08 15:00:22.15199+05:30	2026-04-08 15:00:22.15199+05:30	tenant-default	\N	\N	\N	\N
99	slack	\N	purvi.​appsrow	Ignite	Add the button mentioned earlier., Update the hero section as mentioned earlier., Add the specified image., Check the schema for issues.	[]	[]	pending	\N	\N	2026-04-08 15:07:30.784986+05:30	2026-04-08 15:07:30.784986+05:30	tenant-default	\N	\N	\N	\N
102	slack	\N	purvi.​appsrow	Buildbite	Change the current background colors with the provided design., Make the design in green instead of pink., Provide feedback on how the design looks.	[]	[]	pending	\N	\N	2026-04-08 15:58:33.320024+05:30	2026-04-08 15:58:33.320024+05:30	tenant-default	\N	\N	\N	\N
1	whatsapp	\N	- Nirav	Sellers Umbrella - MXP Webflow Development	Schedule meeting for 5pm	[]	[]	pending	\N	\N	2026-03-26 13:16:55.788939+05:30	2026-03-26 13:16:55.788939+05:30	tenant-default	\N	\N	\N	\N
93	whatsapp	\N	Purvi Bhatia	Test-grp	Replicate the changes in module 1 as done in module 7.	[]	[]	pending	\N	\N	2026-04-08 14:58:11.39973+05:30	2026-04-08 14:58:11.39973+05:30	tenant-default	\N	\N	\N	\N
97	slack	\N	purvi.​appsrow	Ignite	Update the footer section color to dark olive green., Update with the Figma link., Share the document., Confirm if the button mentioned earlier was added., Confirm if the hero section mentioned earlier was updated., Add the specified image.	[]	[]	pending	\N	\N	2026-04-08 15:01:14.633958+05:30	2026-04-08 15:01:14.633958+05:30	tenant-default	\N	\N	\N	\N
100	slack	\N	purvi.​appsrow	Buildbite	Change the current background colors with the new design.	[]	[]	pending	\N	\N	2026-04-08 15:34:37.663584+05:30	2026-04-08 15:34:37.663584+05:30	tenant-default	\N	\N	\N	\N
94	whatsapp	428	Purvi Bhatia	Test-grp	Looks good.\nBut can u remove the button on the right side?\n[Quoted: *From Appsrow*\nreview it.]	[]	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775640543847_whatsapp_quoted_1775640543847.jpg"]	pending	\N	\N	2026-04-08 14:59:04.944082+05:30	2026-04-08 14:59:04.944082+05:30	tenant-default	\N	\N	\N	\N
95	whatsapp	\N	Purvi Bhatia	Test-grp	Remove the button on the right side as per client's request.	[]	[]	pending	\N	\N	2026-04-08 14:59:19.290387+05:30	2026-04-08 14:59:19.290387+05:30	tenant-default	\N	\N	\N	\N
98	slack	\N	purvi.​appsrow	Ignite	Check the schema for potential issues.	[]	[]	pending	\N	\N	2026-04-08 15:04:29.120787+05:30	2026-04-08 15:04:29.120787+05:30	tenant-default	\N	\N	\N	\N
101	slack	\N	purvi.​appsrow	Buildbite	Change the current background colors to green instead of pink.	[]	[]	pending	\N	\N	2026-04-08 15:52:54.253116+05:30	2026-04-08 15:52:54.253116+05:30	tenant-default	\N	\N	\N	\N
2	whatsapp	\N	Purvi Bhatia	Test-grp	Update dashboard design and add new images	[]	[]	pending	\N	\N	2026-03-26 15:46:17.59632+05:30	2026-03-26 15:46:17.59632+05:30	tenant-default	\N	\N	\N	\N
3	whatsapp	305	Purvi Bhatia	Test-grp		[]	["http://localhost:5000/temp/1774520177438_whatsapp_media.jpeg"]	pending	\N	\N	2026-03-26 15:46:17.619353+05:30	2026-03-26 15:46:17.619353+05:30	tenant-default	\N	\N	\N	\N
4	whatsapp	\N	Purvi Bhatia	Test-grp	Update dashboard colors and theme	[]	[]	pending	\N	\N	2026-03-26 15:50:05.486501+05:30	2026-03-26 15:50:05.486501+05:30	tenant-default	\N	\N	\N	\N
5	whatsapp	\N	Purvi Bhatia	Test-grp	Review footer section and design elements	[]	[]	pending	\N	\N	2026-03-26 15:55:38.400794+05:30	2026-03-26 15:55:38.400794+05:30	tenant-default	\N	\N	\N	\N
6	whatsapp	309	Purvi Bhatia	Test-grp		[]	["http://localhost:5000/temp/1774520743374_whatsapp_media.jpeg"]	pending	\N	\N	2026-03-26 15:55:43.580225+05:30	2026-03-26 15:55:43.580225+05:30	tenant-default	\N	\N	\N	\N
7	whatsapp	\N	Purvi Bhatia	Test-grp	Review header and nav section	[]	[]	pending	\N	\N	2026-03-26 16:09:43.017101+05:30	2026-03-26 16:09:43.017101+05:30	tenant-default	\N	\N	\N	\N
8	whatsapp	\N	Purvi Bhatia	Test-grp	Update images and add dark/light theme in olive green colors	[]	[]	pending	\N	\N	2026-03-26 16:10:55.272885+05:30	2026-03-26 16:10:55.272885+05:30	tenant-default	\N	\N	\N	\N
9	whatsapp	\N	Purvi Bhatia	Test-grp	Increase font size in Hero H1 and adjust team grid layout	[]	[]	pending	\N	\N	2026-03-26 16:18:44.91046+05:30	2026-03-26 16:18:44.91046+05:30	tenant-default	\N	\N	\N	\N
10	whatsapp	\N	Purvi Bhatia	Test-grp	Increase font size in Hero section H1 and adjust team grid layout	[]	[]	pending	\N	\N	2026-03-26 16:21:57.05569+05:30	2026-03-26 16:21:57.05569+05:30	tenant-default	\N	\N	\N	\N
11	whatsapp	\N	Purvi Bhatia	Test-grp	Increase font size in Hero H1 and adjust team grid layout	[]	[]	pending	\N	\N	2026-03-26 16:29:47.516222+05:30	2026-03-26 16:29:47.516222+05:30	tenant-default	\N	\N	\N	\N
12	whatsapp	\N	Purvi Bhatia	Test-grp	Update font size and layout as per client's request	[]	[]	pending	\N	\N	2026-03-26 16:39:06.670342+05:30	2026-03-26 16:39:06.670342+05:30	tenant-default	\N	\N	\N	\N
13	whatsapp	\N	Purvi Bhatia	Test-grp	Update font sizes and modify team grid layout	[]	[]	pending	\N	\N	2026-03-26 16:41:43.437207+05:30	2026-03-26 16:41:43.437207+05:30	tenant-default	\N	\N	\N	\N
14	whatsapp	\N	Purvi Bhatia	Test-grp	Increase font size and adjust team grid layout	[]	[]	pending	\N	\N	2026-03-26 16:43:46.144447+05:30	2026-03-26 16:43:46.144447+05:30	tenant-default	\N	\N	\N	\N
15	whatsapp	\N	Purvi Bhatia	Test-grp	Increase font size and adjust team grid layout	[]	[]	pending	\N	\N	2026-03-26 16:47:51.727137+05:30	2026-03-26 16:47:51.727137+05:30	tenant-default	\N	\N	\N	\N
16	whatsapp	\N	Purvi Bhatia	Test-grp	Update font size and layout as per client request	[]	[]	pending	\N	\N	2026-03-26 17:15:18.975545+05:30	2026-03-26 17:15:18.975545+05:30	tenant-default	\N	\N	\N	\N
17	slack	\N	purvi.​appsrow	Buildbite	Update footer color to dark olive green and provide Figma link and document	[]	[]	pending	\N	\N	2026-03-26 17:35:08.789592+05:30	2026-03-26 17:35:08.789592+05:30	tenant-default	\N	\N	\N	\N
18	slack	\N	\N	Pelotech	Update the footer section	[]	[]	pending	\N	\N	2026-03-26 17:38:45.039278+05:30	2026-03-26 17:38:45.039278+05:30	tenant-default	\N	\N	\N	\N
19	slack	\N	\N	Pelotech	Update the footer section	[]	[]	pending	\N	\N	2026-03-26 17:39:10.988862+05:30	2026-03-26 17:39:10.988862+05:30	tenant-default	\N	\N	\N	\N
20	slack	\N	\N	Buildbite	Use client-provided images for website	[]	[]	pending	\N	\N	2026-03-26 17:44:27.262908+05:30	2026-03-26 17:44:27.262908+05:30	tenant-default	\N	\N	\N	\N
21	slack	30	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>)  before the blue button and the logos near the last paragraph.  Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 17:44:49.863802+05:30	2026-03-26 17:44:49.863802+05:30	tenant-default	\N	\N	\N	\N
22	slack	31	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 17:48:11.796516+05:30	2026-03-26 17:48:11.796516+05:30	tenant-default	\N	\N	\N	\N
23	slack	32	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 17:49:54.303199+05:30	2026-03-26 17:49:54.303199+05:30	tenant-default	\N	\N	\N	\N
24	slack	33	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 17:50:06.62855+05:30	2026-03-26 17:50:06.62855+05:30	tenant-default	\N	\N	\N	\N
25	slack	34	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 17:50:37.169645+05:30	2026-03-26 17:50:37.169645+05:30	tenant-default	\N	\N	\N	\N
26	slack	35	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 17:56:36.893094+05:30	2026-03-26 17:56:36.893094+05:30	tenant-default	\N	\N	\N	\N
27	slack	36	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 17:59:48.782828+05:30	2026-03-26 17:59:48.782828+05:30	tenant-default	\N	\N	\N	\N
28	slack	37	purvi.​appsrow	C0AHHG10HDG	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 18:03:41.312301+05:30	2026-03-26 18:03:41.312301+05:30	tenant-default	\N	\N	\N	\N
29	slack	39	purvi.​appsrow	C0AHE5C59NH	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 18:05:01.209417+05:30	2026-03-26 18:05:01.209417+05:30	tenant-default	\N	\N	\N	\N
30	slack	\N	purvi.​appsrow	Buildbite	Update website with new photos and layout adjustments	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 18:05:05.10111+05:30	2026-03-26 18:05:05.10111+05:30	tenant-default	\N	\N	\N	\N
31	slack	\N	purvi.​appsrow	Buildbite	Update footer color to dark olive green	[]	[]	pending	\N	\N	2026-03-26 18:10:24.294832+05:30	2026-03-26 18:10:24.294832+05:30	tenant-default	\N	\N	\N	\N
32	slack	\N	purvi.​appsrow	Buildbite	Check readiness of the Event page as discussed	[]	[]	pending	\N	\N	2026-03-26 18:18:17.976672+05:30	2026-03-26 18:18:17.976672+05:30	tenant-default	\N	\N	\N	\N
33	slack	\N	purvi.​appsrow	Ignite	Update footer color to dark olive green and provide Figma link and document	[]	[]	pending	\N	\N	2026-03-26 18:22:44.611551+05:30	2026-03-26 18:22:44.611551+05:30	tenant-default	\N	\N	\N	\N
34	slack	45	purvi.​appsrow	C0AHE5C59NH	(<https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing>) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 18:27:06.957607+05:30	2026-03-26 18:27:06.957607+05:30	tenant-default	\N	\N	\N	\N
35	slack	\N	purvi.​appsrow	Buildbite	Update website content as per Google Doc instructions	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 18:27:10.674315+05:30	2026-03-26 18:27:10.674315+05:30	tenant-default	\N	\N	\N	\N
36	whatsapp	322	Abhishek Soni	Test-grp	(https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing) before the blue button and the logos near the last paragraph. Add photos of TheMerode to the right of the first paragraph	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing)"]	[]	pending	\N	\N	2026-03-26 18:28:43.950327+05:30	2026-03-26 18:28:43.950327+05:30	tenant-default	\N	\N	\N	\N
37	whatsapp	\N	Abhishek Soni	Test-grp	Add photos of TheMerode and adjust content layout	["https://docs.google.com/document/d/1iHP1DU0gIUJBGEQGgEIVpGZLNn0L_uExFWKqZ4byRE0/edit?usp=sharing"]	[]	pending	\N	\N	2026-03-26 18:28:47.547652+05:30	2026-03-26 18:28:47.547652+05:30	tenant-default	\N	\N	\N	\N
38	whatsapp	\N	- Nirav	Sellers Umbrella - MXP Webflow Development	Update Icon 5 label to Logistics Services	[]	[]	pending	\N	\N	2026-03-30 16:30:19.921641+05:30	2026-03-30 16:30:19.921641+05:30	tenant-default	\N	\N	\N	\N
39	whatsapp	334	Purvi Bhatia	Test-grp	Can u fix the bottom nav section?	[]	["http://localhost:5000/temp/1774871319588_whatsapp_media.jpeg"]	pending	\N	\N	2026-03-30 17:18:39.852139+05:30	2026-03-30 17:18:39.852139+05:30	tenant-default	\N	\N	\N	\N
40	whatsapp	\N	Purvi Bhatia	Test-grp	Fix the bottom navigation section	[]	[]	pending	\N	\N	2026-03-30 17:18:43.031536+05:30	2026-03-30 17:18:43.031536+05:30	tenant-default	\N	\N	\N	\N
41	whatsapp	\N	Abhishek Soni	Test-grp	Update homepage image	[]	[]	pending	\N	\N	2026-03-30 17:24:43.970292+05:30	2026-03-30 17:24:43.970292+05:30	tenant-default	\N	\N	\N	\N
42	whatsapp	\N	Abhishek Soni	Test-grp	Update the H1 line on the website	[]	[]	pending	\N	\N	2026-03-30 17:24:45.054191+05:30	2026-03-30 17:24:45.054191+05:30	tenant-default	\N	\N	\N	\N
43	whatsapp	\N	Abhishek Soni	Test-grp	Add sub heading	[]	[]	pending	\N	\N	2026-03-30 17:25:38.996872+05:30	2026-03-30 17:25:38.996872+05:30	tenant-default	\N	\N	\N	\N
44	whatsapp	339	Abhishek Soni	Test-grp		[]	["http://localhost:5000/temp/1774871885588_whatsapp_media.jpeg"]	pending	\N	\N	2026-03-30 17:28:05.709807+05:30	2026-03-30 17:28:05.709807+05:30	tenant-default	\N	\N	\N	\N
45	whatsapp	\N	Abhishek Soni	Test-grp	Update Icon 5 label to 'Logistics Services' and proceed with 3D stone development	[]	[]	pending	\N	\N	2026-03-30 17:29:22.390211+05:30	2026-03-30 17:29:22.390211+05:30	tenant-default	\N	\N	\N	\N
46	slack	\N	purvi.​appsrow	Buildbite	Add dark/light theme toggle button	[]	[]	pending	\N	\N	2026-03-30 17:35:33.763312+05:30	2026-03-30 17:35:33.763312+05:30	tenant-default	\N	\N	\N	\N
47	whatsapp	343	Nupur Patel	Deep Website	Done: Contact-us : https://deep-group.webflow.io/contact-us\n\n- Update. Banner creative title from “Let’s connect to shape your new space”  to. “Let’s Connect to Find Your New Space” \n\nDone: Faq : https://deep-group.webflow.io/faq\n\n- Update. Banner creative title from “Frequently Asked Questions” to “We’re Here to Answer Every Question You Have”\n\nDone: Why deep group: https://deep-group.webflow.io/why-deep-group\n\nCsr: https://deep-group.webflow.io/csr\n\n- Change “Giving Back to Society” to “Corporate Social Responsibility”\n- Change “CSR” to “Giving Back to Society” to “Committed to Building Communities—Beyond Construction”\n- In red section below Change : “Corporate Social Responsibility” to “Turning Responsibility into Action for Sustainable Living and Stronger Communities”\nchannel partner: https://deep-group.webflow.io/channel-partner\n\n- Need to upload more pictures from repository - but can be done after all property pages are done.\n- \nCareer : https://deep-group.webflow.io/career\n\n - Need to update pictures from repository - \n\nDone:https://deep-group.webflow.io/career/project-manager\n\n- Need work on font sizing and capitalizations. For all job details pages.\n- Check if forms are working fine for all jobs posted. After submission email should go to info@deepgroup1980.com and nupur@ncubit.com.\n\nVendor Registration: https://deep-group.webflow.io/vendor-registration\n\n   - there were steps mentioned here in red section. I do not see. them. Also content requires lot of work. Titles are repetitive.\n   - check form submission should send all information via email to info@deepgroup1980.com and nupur@ncubit.com.\n\nInsights: https://deep-group.webflow.io/insights\n\n- Design is ok. \n- Content all blogs are. 1 min read need to keep more content for read time increases to 4- 5 min.\n- Images needs to be very relevant. \n- \nhttps://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad\n\n- Blog content is very less just bullet points and need to link relevant project/property. Pages which are in. This area.\n\nNews And Pr: https://deep-group.webflow.io/news-pr\n\n- Need to keep one more news. \n- Change title “Public Announcements” to “ News and Press Releases”\n- Change “News & PR” to “Our Recognitions, Media Coverage & Announcements”\n- Change “Built Transparency” to “Real Estate News & Project Updates” \n- Change “News & Updates” to “Shaping Headlines. Building Trust.”\n\nhttps://deep-group.webflow.io/news-and-pr/deep-group-earns-most-reliable-builder-title-at-cnbc-bajar-awards\n \n- done\n- \n\nIn General feedbacK:\n- Banners look very simple.  Can we add some relevant and abstract line drawing in little dark gray color on banners. Or. something else you suggest. \n- Make sure your have proper capitalization on pages. Some titles are in sentence case where some have each letter capitalized. Let’s follow a same pattern on all titles and banners and throughout the pages.	["https://deep-group.webflow.io/contact-us", "https://deep-group.webflow.io/faq", "https://deep-group.webflow.io/why-deep-group", "https://deep-group.webflow.io/csr", "https://deep-group.webflow.io/channel-partner", "https://deep-group.webflow.io/career", "https://deep-group.webflow.io/career/project-manager", "https://deep-group.webflow.io/vendor-registration", "https://deep-group.webflow.io/insights", "https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad", "https://deep-group.webflow.io/news-pr", "https://deep-group.webflow.io/news-and-pr/deep-group-earns-most-reliable-builder-title-at-cnbc-bajar-awards"]	[]	pending	\N	\N	2026-04-01 15:02:59.039476+05:30	2026-04-01 15:02:59.039476+05:30	tenant-default	\N	\N	\N	\N
49	whatsapp	341	Nupur Patel	Deep Website	All Project Details and Pictures will be kept at - https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link	["https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link"]	[]	pending	\N	\N	2026-04-01 15:02:59.057627+05:30	2026-04-01 15:02:59.057627+05:30	tenant-default	\N	\N	\N	\N
48	whatsapp	342	Nupur Patel	Deep Website	All Folders for Events,CSR, Awards, etc.- https://drive.google.com/drive/folders/0ADH3U8cgoX4JUk9PVA	["https://drive.google.com/drive/folders/0ADH3U8cgoX4JUk9PVA"]	[]	pending	\N	\N	2026-04-01 15:02:59.052602+05:30	2026-04-01 15:02:59.052602+05:30	tenant-default	\N	\N	\N	\N
50	whatsapp	\N	Nupur Patel	Deep Website	Access project folders for Events, CSR, Awards	["https://drive.google.com/drive/folders/0ADH3U8cgoX4JUk9PVA"]	[]	pending	\N	\N	2026-04-01 15:03:01.297878+05:30	2026-04-01 15:03:01.297878+05:30	tenant-default	\N	\N	\N	\N
51	whatsapp	\N	Nupur Patel	Deep Website	Access project details and pictures on Google Drive	["https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link"]	[]	pending	\N	\N	2026-04-01 15:03:01.556741+05:30	2026-04-01 15:03:01.556741+05:30	tenant-default	\N	\N	\N	\N
52	whatsapp	344	Purvi Bhatia	Test-grp	Done: Contact-us : https://deep-group.webflow.io/contact-us\n\n- Update. Banner creative title from “Let’s connect to shape your new space”  to. “Let’s Connect to Find Your New Space” \n\nDone: Faq : https://deep-group.webflow.io/faq\n\n- Update. Banner creative title from “Frequently Asked Questions” to “We’re Here to Answer Every Question You Have”\n\nDone: Why deep group: https://deep-group.webflow.io/why-deep-group\n\nCsr: https://deep-group.webflow.io/csr\n\n- Change “Giving Back to Society” to “Corporate Social Responsibility”\n- Change “CSR” to “Giving Back to Society” to “Committed to Building Communities—Beyond Construction”\n- In red section below Change : “Corporate Social Responsibility” to “Turning Responsibility into Action for Sustainable Living and Stronger Communities”\nchannel partner: https://deep-group.webflow.io/channel-partner\n\n- Need to upload more pictures from repository - but can be done after all property pages are done.\n- \nCareer : https://deep-group.webflow.io/career\n\n - Need to update pictures from repository - \n\nDone:https://deep-group.webflow.io/career/project-manager\n\n- Need work on font sizing and capitalizations. For all job details pages.\n- Check if forms are working fine for all jobs posted. After submission email should go to info@deepgroup1980.com and nupur@ncubit.com.\n\nVendor Registration: https://deep-group.webflow.io/vendor-registration\n\n   - there were steps mentioned here in red section. I do not see. them. Also content requires lot of work. Titles are repetitive.\n   - check form submission should send all information via email to info@deepgroup1980.com and nupur@ncubit.com.\n\nInsights: https://deep-group.webflow.io/insights\n\n- Design is ok. \n- Content all blogs are. 1 min read need to keep more content for read time increases to 4- 5 min.\n- Images needs to be very relevant. \n- \nhttps://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad\n\n- Blog content is very less just bullet points and need to link relevant project/property. Pages which are in. This area.\n\nNews And Pr: https://deep-group.webflow.io/news-pr\n\n- Need to keep one more news. \n- Change title “Public Announcements” to “ News and Press Releases”\n- Change “News & PR” to “Our Recognitions, Media Coverage & Announcements”\n- Change “Built Transparency” to “Real Estate News & Project Updates” \n- Change “News & Updates” to “Shaping Headlines. Building Trust.”\n\nhttps://deep-group.webflow.io/news-and-pr/deep-group-earns-most-reliable-builder-title-at-cnbc-bajar-awards\n \n- done\n- \n\nIn General feedbacK:\n- Banners look very simple.  Can we add some relevant and abstract line drawing in little dark gray color on banners. Or. something else you suggest. \n- Make sure your have proper capitalization on pages. Some titles are in sentence case where some have each letter capitalized. Let’s follow a same pattern on all titles and banners and throughout the pages.	["https://deep-group.webflow.io/contact-us", "https://deep-group.webflow.io/faq", "https://deep-group.webflow.io/why-deep-group", "https://deep-group.webflow.io/csr", "https://deep-group.webflow.io/channel-partner", "https://deep-group.webflow.io/career", "https://deep-group.webflow.io/career/project-manager", "https://deep-group.webflow.io/vendor-registration", "https://deep-group.webflow.io/insights", "https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad", "https://deep-group.webflow.io/news-pr", "https://deep-group.webflow.io/news-and-pr/deep-group-earns-most-reliable-builder-title-at-cnbc-bajar-awards"]	[]	pending	\N	\N	2026-04-01 17:10:05.382897+05:30	2026-04-01 17:10:05.382897+05:30	tenant-default	\N	\N	\N	\N
53	whatsapp	345	Purvi Bhatia	Test-grp	https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link	["https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link"]	[]	pending	\N	\N	2026-04-01 17:27:27.859227+05:30	2026-04-01 17:27:27.859227+05:30	tenant-default	\N	\N	\N	\N
54	whatsapp	\N	Purvi Bhatia	Test-grp	Review Google Drive document	["https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link"]	[]	pending	\N	\N	2026-04-01 17:27:29.564688+05:30	2026-04-01 17:27:29.564688+05:30	tenant-default	\N	\N	\N	\N
55	whatsapp	\N	Purvi Bhatia	Test-grp	Implement requested changes urgently	[]	[]	pending	\N	\N	2026-04-01 18:09:56.268887+05:30	2026-04-01 18:09:56.268887+05:30	tenant-default	\N	\N	\N	\N
56	whatsapp	\N	Purvi Bhatia	Test-grp	Remove 'buy again' button	[]	[]	pending	\N	\N	2026-04-01 18:16:46.303481+05:30	2026-04-01 18:16:46.303481+05:30	tenant-default	\N	\N	\N	\N
57	whatsapp	\N	Purvi Bhatia	Test-grp	Adjust design to be less dark	[]	[]	pending	\N	\N	2026-04-01 18:26:48.048388+05:30	2026-04-01 18:26:48.048388+05:30	tenant-default	\N	\N	\N	\N
58	whatsapp	354	Purvi Bhatia	Test-grp	Remove "buy again" button	[]	["http://localhost:5000/temp/1775048283767_whatsapp_media.jpeg"]	pending	\N	\N	2026-04-01 18:28:04.021076+05:30	2026-04-01 18:28:04.021076+05:30	tenant-default	\N	\N	\N	\N
59	whatsapp	\N	Purvi Bhatia	Test-grp	Remove 'buy again' button	[]	[]	pending	\N	\N	2026-04-01 18:28:07.414523+05:30	2026-04-01 18:28:07.414523+05:30	tenant-default	\N	\N	\N	\N
60	whatsapp	\N	Purvi Bhatia	Test-grp	Client approved action — team can proceed	[]	[]	pending	\N	\N	2026-04-02 14:19:17.979823+05:30	2026-04-02 14:19:17.979823+05:30	tenant-default	\N	\N	\N	\N
61	whatsapp	\N	Purvi Bhatia	Test-grp	Client approved — team can proceed	[]	[]	pending	\N	\N	2026-04-02 14:32:36.012295+05:30	2026-04-02 14:32:36.012295+05:30	tenant-default	\N	\N	\N	\N
62	whatsapp	\N	Purvi Bhatia	Test-grp	Client approved — team can proceed	[]	[]	pending	\N	\N	2026-04-02 14:47:16.928942+05:30	2026-04-02 14:47:16.928942+05:30	tenant-default	\N	\N	\N	\N
63	whatsapp	372	Purvi Bhatia	Test-grp	So this is the new template for all persona-pages. Can you help redesign the two landing pages we created previously?\n\nCleaning and janitorial\nGeneral contractors\n\nThey should follow the exact same template. Just swap out the copy + images.\nFeel free to push this one live in the meantime: https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view[…]PE4h-1&scalin…\nIt should be linked under 'who it's for' with the name "Home builders"	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view"]	[]	pending	\N	\N	2026-04-02 15:55:22.921692+05:30	2026-04-02 15:55:22.921692+05:30	tenant-default	\N	\N	\N	\N
64	whatsapp	\N	Purvi Bhatia	Test-grp	Redesign landing pages using new template	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view[…]PE4h-1&scalin…"]	[]	pending	\N	\N	2026-04-02 15:55:26.092656+05:30	2026-04-02 15:55:26.092656+05:30	tenant-default	\N	\N	\N	\N
65	whatsapp	377	Purvi Bhatia	Test-grp	Remove the images from background. I'll provide you our real workers images	[]	["http://localhost:5000/temp/1775134365345_whatsapp_media.jpeg"]	pending	\N	\N	2026-04-02 18:22:45.612493+05:30	2026-04-02 18:22:45.612493+05:30	tenant-default	\N	\N	\N	\N
66	whatsapp	\N	Purvi Bhatia	Test-grp	Remove background images and update with new images	[]	[]	pending	\N	\N	2026-04-02 18:22:50.652589+05:30	2026-04-02 18:22:50.652589+05:30	tenant-default	\N	\N	\N	\N
67	whatsapp	378	Nupur Patel	Deep Website	Hi! Can you use project images from google drive - Deep Central > Project Details folder as well as this additional folder:\nhttps://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa0lJQmVhQ2dBQUFBQUFZVDYwR1NUOWpKQ3pCR1N2WnJSOVhB&id=5EE4D8E878659E90%2110344&cid=5EE4D8E878659E90&sb=name&sd=1\n\nSecond folder has latest images on Saptak and Shivanta and many other projects.. kindly use those images	["https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa0lJQmVhQ2dBQUFBQUFZVDYwR1NUOWpKQ3pCR1N2WnJSOVhB&id=5EE4D8E878659E90%2110344&cid=5EE4D8E878659E90&sb=name&sd=1"]	[]	pending	\N	\N	2026-04-03 10:33:07.948617+05:30	2026-04-03 10:33:07.948617+05:30	tenant-default	\N	\N	\N	\N
68	whatsapp	\N	Nupur Patel	Deep Website	Use additional project images from provided folders	[]	[]	pending	\N	\N	2026-04-03 10:33:12.077951+05:30	2026-04-03 10:33:12.077951+05:30	tenant-default	\N	\N	\N	\N
69	whatsapp	381	Purvi Bhatia	Test-grp	Hi,\n\nI’m sharing the task optimization sheet with you:\n\nhttps://docs.google.com/spreadsheets/d/1xoUAQd-HSev178TkPmNPiPQFAAmDK77P/edit?usp=sharing&ouid=106624485558868125872&rtpof=true&sd=true\n\nPlease review it and make the necessary updates/changes to improve task optimization. Let me know if anything needs clarification or if you have suggestions.	["https://docs.google.com/spreadsheets/d/1xoUAQd-HSev178TkPmNPiPQFAAmDK77P/edit?usp=sharing&ouid=106624485558868125872&rtpof=true&sd=true"]	[]	pending	\N	\N	2026-04-03 11:21:06.115844+05:30	2026-04-03 11:21:06.115844+05:30	tenant-default	\N	\N	\N	\N
70	whatsapp	382	Purvi Bhatia	Test-grp	Please delete this page entirely https://trust-certificate-program.teachery.co/global-data-innovation-peach	["https://trust-certificate-program.teachery.co/global-data-innovation-peach"]	[]	pending	\N	\N	2026-04-03 11:21:06.557247+05:30	2026-04-03 11:21:06.557247+05:30	tenant-default	\N	\N	\N	\N
71	whatsapp	383	Purvi Bhatia	Test-grp	For the AI Trust Certificate Program.  Please make the following three pages visible without login and add stripe payment after Module2.  These are the ones that should be visible.  Do not create a new landing page :  1. Dashboard  https://trust-certificate-program.teachery.co/dashboard; and 2. Module 1 https://trust-certificate-program.teachery.co/lessons/module-1; and 3.  Module 2. https://trust-certificate-program.teachery.co/lessons/module-2	["https://trust-certificate-program.teachery.co/dashboard;", "https://trust-certificate-program.teachery.co/lessons/module-1;", "https://trust-certificate-program.teachery.co/lessons/module-2"]	[]	pending	\N	\N	2026-04-03 11:21:06.873902+05:30	2026-04-03 11:21:06.873902+05:30	tenant-default	\N	\N	\N	\N
72	whatsapp	\N	Purvi Bhatia	Test-grp	Delete page on Teachery site	["https://trust-certificate-program.teachery.co/global-data-innovation-peach"]	[]	pending	\N	\N	2026-04-03 11:21:09.3154+05:30	2026-04-03 11:21:09.3154+05:30	tenant-default	\N	\N	\N	\N
73	whatsapp	\N	Purvi Bhatia	Test-grp	Review and update task optimization sheet	["https://docs.google.com/spreadsheets/d/1xoUAQd-HSev178TkPmNPiPQFAAmDK77P/edit?usp=sharing&ouid=106624485558868125872&rtpof=true&sd=true"]	[]	pending	\N	\N	2026-04-03 11:21:09.862296+05:30	2026-04-03 11:21:09.862296+05:30	tenant-default	\N	\N	\N	\N
74	whatsapp	\N	Purvi Bhatia	Test-grp	Make pages visible without login and add Stripe payment after Module 2	["https://trust-certificate-program.teachery.co/dashboard", "https://trust-certificate-program.teachery.co/lessons/module-1", "https://trust-certificate-program.teachery.co/lessons/module-2"]	[]	pending	\N	\N	2026-04-03 11:21:10.231407+05:30	2026-04-03 11:21:10.231407+05:30	tenant-default	\N	\N	\N	\N
75	whatsapp	409	MAYUR SINGH	Deep Website	Hey @9543534796905 \nPlease join using this link\n\nhttps://meet.google.com/nfq-bcfx-gpz	["https://meet.google.com/nfq-bcfx-gpz"]	[]	pending	\N	\N	2026-04-06 14:56:07.090381+05:30	2026-04-06 14:56:07.090381+05:30	tenant-default	\N	\N	\N	\N
76	whatsapp	\N	Multiple Users	Sellers Umbrella - MXP Webflow Development	Review 3D elements and responsive design progress	[]	[]	pending	\N	\N	2026-04-06 14:56:18.9433+05:30	2026-04-06 14:56:18.9433+05:30	tenant-default	\N	\N	\N	\N
77	whatsapp	\N	Multiple Users	Deep Website	Upload and share sample house photos	[]	[]	pending	\N	\N	2026-04-06 14:56:30.215241+05:30	2026-04-06 14:56:30.215241+05:30	tenant-default	\N	\N	\N	\N
78	whatsapp	413	MAYUR SINGH	Sellers Umbrella - MXP Webflow Development	@274409873006660\nJoin using this link\n\nhttps://meet.google.com/igj-ogzj-gju	["https://meet.google.com/igj-ogzj-gju"]	[]	pending	\N	\N	2026-04-06 15:27:35.147353+05:30	2026-04-06 15:27:35.147353+05:30	tenant-default	\N	\N	\N	\N
79	whatsapp	\N	MAYUR SINGH	Sellers Umbrella - MXP Webflow Development	Schedule and attend walkthrough meeting	["https://meet.google.com/igj-ogzj-gju"]	[]	pending	\N	\N	2026-04-06 15:27:47.202679+05:30	2026-04-06 15:27:47.202679+05:30	tenant-default	\N	\N	\N	\N
80	whatsapp	414	Nupur Patel	Deep Website	What were the other design options you showcased? Can I see them again?	[]	["http://localhost:5000/temp/1775469569414_whatsapp_media.jpeg"]	pending	\N	\N	2026-04-06 15:29:29.539192+05:30	2026-04-06 15:29:29.539192+05:30	tenant-default	\N	\N	\N	\N
81	whatsapp	\N	Nupur Patel	Deep Website	Showcase other design options for residential project	[]	[]	pending	\N	\N	2026-04-06 15:33:40.886906+05:30	2026-04-06 15:33:40.886906+05:30	tenant-default	\N	\N	\N	\N
82	whatsapp	420	Purvi Bhatia	Test-grp	footer change in this image	[]	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775546350747_whatsapp_quoted_1775546350745.jpg"]	pending	\N	\N	2026-04-07 12:49:12.488552+05:30	2026-04-07 12:49:12.488552+05:30	tenant-default	\N	\N	\N	\N
83	whatsapp	421	Purvi Bhatia	Test-grp	Place "ME" after My Teams	[]	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775547925557_whatsapp_1775547925555.jpg"]	pending	\N	\N	2026-04-07 13:15:26.726553+05:30	2026-04-07 13:15:26.726553+05:30	tenant-default	\N	\N	\N	\N
84	whatsapp	\N	Purvi Bhatia	Test-grp	Update the footer to place 'ME' after 'MY TEAM'.	[]	[]	pending	\N	\N	2026-04-07 13:15:33.30434+05:30	2026-04-07 13:15:33.30434+05:30	tenant-default	\N	\N	\N	\N
85	whatsapp	\N	Purvi Bhatia	Test-grp	Update the footer to place 'ME' after 'My Teams'	[]	[]	pending	\N	\N	2026-04-07 13:16:10.029718+05:30	2026-04-07 13:16:10.029718+05:30	tenant-default	\N	\N	\N	\N
86	whatsapp	\N	Purvi Bhatia	Test-grp	Remove the specified page as per client's request.	[]	[]	pending	\N	\N	2026-04-07 13:25:03.325731+05:30	2026-04-07 13:25:03.325731+05:30	tenant-default	\N	\N	\N	\N
87	whatsapp	\N	Purvi Bhatia	Test-grp	Remove the images from the background., Review and update the task optimization sheet., Delete the specified page entirely., Make specified pages visible without login and add stripe payment after Module 2., Update the footer as per the image., Place 'ME' after 'My Teams'.	[]	[]	pending	\N	\N	2026-04-07 14:11:17.126666+05:30	2026-04-07 14:11:17.126666+05:30	tenant-default	\N	\N	\N	\N
88	slack	\N	purvi.​appsrow	Ignite	Update the footer section and change its color to dark olive green., Update with the Figma link., Share the document., Confirm if the button mentioned earlier has been added.	[]	[]	pending	\N	\N	2026-04-07 16:15:37.839492+05:30	2026-04-07 16:15:37.839492+05:30	tenant-default	\N	\N	\N	\N
89	slack	\N	purvi.​appsrow	Ignite	Update the footer section and change its color to dark olive green., Update with the Figma link., Share the document., Confirm if the Event page is ready with all discussed elements., Let Purvi know if the button mentioned earlier has been added.	[]	[]	pending	\N	\N	2026-04-07 16:27:15.782615+05:30	2026-04-07 16:27:15.782615+05:30	tenant-default	\N	\N	\N	\N
90	whatsapp	425	MAYUR SINGH	Deep Website	@9543534796905 please check	[]	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775559925750_whatsapp_1775559925749.jpg"]	pending	\N	\N	2026-04-07 16:35:28.039034+05:30	2026-04-07 16:35:28.039034+05:30	tenant-default	\N	\N	\N	\N
91	whatsapp	\N	MAYUR SINGH	Deep Website	Check the design image for Indraprasth Abode and provide feedback.	[]	["Design image of Indraprasth Abode"]	pending	\N	\N	2026-04-07 16:35:42.309621+05:30	2026-04-07 16:35:42.309621+05:30	tenant-default	\N	\N	\N	\N
\.


--
-- Data for Name: teams_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams_conversations (id, conversation_id, conversation_name, service_url, tenant_id, bot_id, bot_name, created_at, updated_at) FROM stdin;
2	19:242493be18a54cb58c65303932eeeb7f@thread.v2	Atomic Object	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 12:41:46.187165	2026-03-09 18:42:35.765997
5	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	Avishkar Developers	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-03-09 18:42:35.765997
1	19:c674dec86329409aac6054bdc2c986e4@thread.v2	Pelotech - Josef	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-06 18:06:38.951386	2026-03-09 18:42:35.765997
7	19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2	Ignite Deep Tech	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-03-09 18:42:35.765997
8	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	Deep Group	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-03-09 18:42:35.765997
15	19:da0a2b138a4445078f1d639a5dcb16ac@thread.v2	Test Group	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-04-03 11:28:13.489168	2026-04-03 11:28:13.489168
4	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	Group Chat	https://smba.trafficmanager.net/in/d3775544-3fba-465a-ae1a-977350295eb3/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-04-08 15:57:40.206684
\.


--
-- Data for Name: teams_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams_messages (id, sender, body, "timestamp", message_type, files, links, source_id, source_type, created_at, approval_status, suggested_platform, approved_draft, message_id, chat_name, priority, flag_admin, ai_reasoning, recipient_name, recipient_slack_id, recipient_whatsapp, should_forward, ai_category, ai_should_forward, ai_priority, ai_reason, forwarded_to_slack, forwarded_to_slack_at, forwarded_to_whatsapp, forwarded_to_whatsapp_at, dismissed, tenant_id) FROM stdin;
535	Design intern	<p><a href="https://www.figma.com/design/zx8RvisHG0pE7LWS58TVrX/Avishkar-Developers?node-id=9829-8780&amp;t=V4EMvGgVa8NdqSzK-1" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/design/zx8RvisHG0pE7LWS58TVrX/Avishkar-Developers?node-id=9829-8780&amp;t=V4EMvGgVa8NdqSzK-1" target="_blank" itemid="default">https://www.figma.com/design/zx8RvisHG0pE7LWS58TVrX/Avishkar-Developers?node-id=9829-8780&amp;t=V4EMvGg…</a></p>	2026-04-08 14:52:21.779+05:30	design_feedback	[]	["https://www.figma.com/design/zx8RvisHG0pE7LWS58TVrX/Avishkar-Developers?node-id=9829-8780&t=V4EMvGgVa8NdqSzK-1", "https://www.figma.com/design/zx8RvisHG0pE7LWS58TVrX/Avishkar-Developers?node-id=9829-8780&t=V4EMvGg…"]	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	groupChat	2026-04-08 14:52:23.941662+05:30	waiting	\N	\N	1775640141779	Avishkar Developers	medium	f	The design intern is requesting feedback on a Figma design.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
480	Aditya Panchal	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;any updates for this month Instagram posts?</p>	2026-04-02 12:19:36.486+05:30	irrelevant	[]	[]	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	groupChat	2026-04-02 12:19:39.542064+05:30	ignored	\N	\N	1775112576486	Avishkar Developers	low	f	The message is a casual check-in about Instagram posts, not a project work request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
521	Abhishek Soni	<p>check the brief.. &nbsp;meta and description is in that&nbsp;</p>	2026-04-07 14:42:25.354+05:30	design_feedback	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-07 14:42:54.702167+05:30	waiting	\N	\N	1775553145354	Pelotech - Josef	medium	f	Abhishek is asked to check the brief for meta and description, indicating a review or feedback task.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
534	Design intern	<p><at id="0">Aditya</at>&nbsp;<at id="1">Panchal</at>, &nbsp;please check</p><attachment id="bece6d1b-0c29-4967-b90c-9dfa3d57ef51"></attachment>	2026-04-08 11:39:34.674+05:30	system	[{"url": "https://appsrow-my.sharepoint.com/personal/design_intern_appsrow_com/Documents/Microsoft Teams Chat Files/Aprill_Post_2026.zip", "name": "Aprill_Post_2026.zip", "publicUrl": null, "contentType": "reference"}]	[]	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	groupChat	2026-04-08 11:39:38.53391+05:30	ignored	\N	\N	1775628574674	Avishkar Developers	low	f	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
536	Abhishek Soni	<p>please ignore&nbsp;</p>	2026-04-08 15:04:36.224+05:30	message	[]	[]	19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2	groupChat	2026-04-08 15:04:38.196296+05:30	ignored	\N	\N	1775640876224	Ignite Deep Tech	normal	f	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
504	Abhishek Soni	<p>\\</p><attachment id="ef37e11d-ca4b-4442-8d3c-188e7e9ef45e"></attachment>	2026-04-03 15:13:45.533+05:30	irrelevant	[{"url": "https://appsrow-my.sharepoint.com/personal/pm_appsrow_com/Documents/Microsoft%20Teams%20Chat%20Files/Screenshot%202026-04-03%20at%203.13.28%E2%80%AFPM.png", "name": "Screenshot 2026-04-03 at 3.13.28 PM.png", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775209434758_Screenshot_2026-04-03_at_3.13.28_PM.png", "contentType": "reference"}]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:13:50.483606+05:30	waiting	\N	\N	1775209425533	Pelotech - Josef	low	f	The message contains only a backslash, which is not actionable or relevant.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
529	Mayursingh Chundawat	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p>\n<p>I’ve completed the Media Index and have begun working on the Press Release page.</p>\n<p>I will address the remaining comments tomorrow.</p>	2026-04-07 18:32:42.781+05:30	system	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-07 18:32:46.307528+05:30	waiting	\N	\N	1775566962781	Atomic Object	low	f	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
481	parth parmar	<p>Meet e banai didhu che kale. need to take a call with client for approval.</p>\n<p>Or send to client for review.&nbsp;</p>	2026-04-02 12:21:57.233+05:30	meeting_request	[]	[]	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	groupChat	2026-04-02 12:22:00.094225+05:30	ignored	\N	\N	1775112717233	Avishkar Developers	low	f	The message is about scheduling a call for client approval.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
538	Abhishek Soni	<p>hi</p>	2026-04-08 15:51:54.161+05:30	greeting	[]	[]	19:da0a2b138a4445078f1d639a5dcb16ac@thread.v2	groupChat	2026-04-08 15:51:57.642844+05:30	waiting	\N	\N	1775643714161	appsrow test grp	low	f	Skipped: greeting/meeting: "hi"	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
537	Abhishek Soni	<p><at id="0">UnifiedHub-Bot</at></p>	2026-04-08 15:49:50.763+05:30	irrelevant	[]	[]	19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2	groupChat	2026-04-08 15:51:45.253441+05:30	waiting	\N	\N	1775643590763	Ignite Deep Tech	low	f	The message contains no actionable content or tasks.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
473	Abhishek Soni	<p>ignore.</p>	2026-04-01 17:40:40.206+05:30	irrelevant	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-01 17:40:43.383333+05:30	waiting	\N	\N	1775045440206	Atomic Object	low	f	The message is a single word 'ignore' with no actionable request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
514	Abhishek Soni	<p>Start the development of both pages.</p>\n<p>Cloud and devOps.</p>	2026-04-03 17:58:38.042+05:30	change_request	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 17:58:42.404874+05:30	waiting	\N	\N	1775219318042	Pelotech - Josef	high	f	Request to start development on specified pages.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
490	Kishan Ravaliya	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;change kar diya he client ko bol de&nbsp;</p>	2026-04-02 16:10:19.626+05:30	irrelevant	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 16:10:22.742369+05:30	ignored	\N	\N	1775126419626	Buildbite	low	f	Message is unclear and lacks context for action or approval	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
539	Abhishek Soni	<p><at id="0">UnifiedHub-Bot</at><at id="1">UnifiedHub-Bot</at></p>	2026-04-08 15:57:39.989+05:30	irrelevant	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-08 15:57:42.252375+05:30	waiting	\N	\N	1775644059989	Buildbite	low	f	The message contains no actionable content or tasks.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
474	Dev intern	<attachment id="1774973859497"></attachment>\n<p>.</p>	2026-04-01 18:13:12.83+05:30	greeting	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-01 18:13:15.427025+05:30	waiting	\N	\N	1775047392830	Atomic Object	low	f	Skipped: greeting/meeting: "."	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
499	Abhishek Soni	<p>please ignore.</p>	2026-04-03 11:21:36.293+05:30	irrelevant	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-03 11:21:40.01436+05:30	waiting	\N	\N	1775195496293	Atomic Object	low	f	Message instructs to ignore, no action required	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
483	Dev intern	<p>Hi <at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>,</p>\n<p>&nbsp;could you please confirm whether any page has been approved in Buildbite for Development ?</p>	2026-04-02 14:34:30.743+05:30	irrelevant	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 14:34:34.955479+05:30	ignored	\N	\N	1775120670743	Buildbite	low	f	The message is a request for confirmation, not a work task.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
540	Dev intern	<p><a href="https://deep-group.webflow.io/" rel="noreferrer noopener" title="https://deep-group.webflow.io/" target="_blank">https://deep-group.webflow.io/</a></p>	2026-04-08 16:11:55.094+05:30	link_share	[]	["https://deep-group.webflow.io/"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-08 16:11:58.947543+05:30	waiting	\N	\N	1775644915094	Deep Group	low	f	The message contains a shared link without any actionable task or context.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	\N
475	Abhishek Soni	<p>IGNORE.</p>	2026-04-01 19:00:20.814+05:30	irrelevant	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-01 19:00:25.082001+05:30	waiting	\N	\N	1775050220814	Buildbite	low	f	The message is a single word 'IGNORE' with no actionable request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
484	Khushal Tank	<attachment id="58087685-9526-40e0-a7ff-fd606fa7d912"></attachment>	2026-04-02 14:39:09.613+05:30	irrelevant	[{"url": "https://appsrow-my.sharepoint.com/personal/khushal_tank_appsrow_com/Documents/Microsoft Teams Chat Files/redirect-url.mp4", "name": "redirect-url.mp4", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775120957421_redirect-url.mp4", "contentType": "reference"}]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 14:39:12.375767+05:30	waiting	\N	\N	1775120949613	Buildbite	low	f	Message contains only an attachment ID with no context or actionable request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
541	Design intern	<p><img src="https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775649950253/hostedContents/aWQ9eF8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YS92aWV3cy9pbWdv/$value" width="260.37549407114625" height="250" alt="image" itemid="0-cin-d4-20c38e4cfa656ac4bdd19e20ccfe3a5a"></p>	2026-04-08 17:35:50.253+05:30	message	[{"url": "https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775649950253/hostedContents/aWQ9eF8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YS92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YS92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775649955006_image_aWQ9eF8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YS92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMGMzOGU0Y2ZhNjU2YWM0YmRkMTllMjBjY2ZlM2E1YS92aWV3cy9pbWdv"}]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-08 17:35:53.509924+05:30	waiting	\N	\N	1775649950253	Buildbite	normal	f	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	\N
542	Dev intern	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p>\n<p>&nbsp;</p>\n<p>&nbsp;</p>\n<p>Atomic Object</p>\n<p>&nbsp;</p>\n<p>&nbsp;</p>\n<p>I’ve completed the Press Release page, Diversity page, and Tools page. Please review it.</p>	2026-04-08 17:58:01.641+05:30	project_update	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-08 17:58:05.092218+05:30	waiting	\N	\N	1775651281641	Atomic Object	medium	f	The message contains a project update with completed tasks that require review.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	\N
487	Abhishek Soni	<p><img alt="image/jpeg" src="https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775122638728/hostedContents/aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWM1NGM3ZDJhNzM3OWEzNTRiMzY4NTU0NDIxMzRjNzAzL3ZpZXdzL2ltZ28=/$value" width="1080" height="2408"></p>	2026-04-02 15:07:18.728+05:30	file_share	[{"url": "https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775122638728/hostedContents/aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWM1NGM3ZDJhNzM3OWEzNTRiMzY4NTU0NDIxMzRjNzAzL3ZpZXdzL2ltZ28=/$value", "name": "image_aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWM1NGM3ZDJhNzM3OWEzNTRiMzY4NTU0NDIxMzRjNzAzL3ZpZXdzL2ltZ28=.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775122644556_image_aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWM1NGM3ZDJhNzM3OWEzNTRiMzY4NTU0NDIxMzRjNzAzL3ZpZXdzL2ltZ28_.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWM1NGM3ZDJhNzM3OWEzNTRiMzY4NTU0NDIxMzRjNzAzL3ZpZXdzL2ltZ28="}]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 15:07:22.312668+05:30	approved	whatsapp	review it.	1775122638728	Buildbite	medium	f	Message contains an image link indicating a file share.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
526	Design intern	<p>comments <span style="font-size:inherit">Resolve </span><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p>	2026-04-07 18:02:36.454+05:30	system	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-07 18:02:39.944505+05:30	waiting	\N	\N	1775565156454	Buildbite	low	f	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
478	Abhishek Soni	<p>this was yesterday's task, please ignore.</p>\n<p>Will keep you update, if anything comes.</p>	2026-04-02 11:34:36.499+05:30	irrelevant	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-02 11:34:39.989023+05:30	waiting	\N	\N	1775109876499	Deep Group	low	f	The message is a follow-up with no actionable request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
488	Abhishek Soni	<attachment id="1775109622809"></attachment>\n<p>&nbsp;</p>\n<p>You didn't update the copy...? It's the same as the home builder :slightly_smiling_face:</p>\n<p>&nbsp;</p>\n<p>@Parth</p>	2026-04-02 15:12:21.353+05:30	change_request	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 15:12:27.046888+05:30	waiting	\N	\N	1775122941353	Buildbite	medium	f	Client is requesting an update to the website copy.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
479	Dev intern	<attachment id="1775056201693"></attachment>\n<p>&nbsp;</p>\n<p>&nbsp;</p>\n<p>&nbsp;</p>\n<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p>\n<p>&nbsp;</p>\n<p>Giraffe</p>\n<p>&nbsp;</p>\n<p>I’ve completed duplicating the Process page and created a new version named ‘Process-v2.’ Please review it.</p>	2026-04-02 11:39:15.289+05:30	design_feedback	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-02 11:39:18.120571+05:30	waiting	\N	\N	1775110155289	Atomic Object	medium	f	Request for review of a newly created page version.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
520	Abhishek Soni	<attachment id="1775134373771"></attachment>\n<p>test</p>	2026-04-07 14:25:44.147+05:30	irrelevant	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-07 14:25:48.135055+05:30	waiting	\N	\N	1775552144147	Atomic Object	low	f	The message 'test' is not actionable or relevant.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
511	Kishan Ravaliya	<p><img src="https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775211812792/hostedContents/aWQ9eF8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZS92aWV3cy9pbWdv/$value" width="378.85985748218525" height="250" alt="image" itemid="0-cin-d4-22e5eaf0e7219791f69d540d7aad511e"></p>	2026-04-03 15:53:32.792+05:30	design_feedback	[{"url": "https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775211812792/hostedContents/aWQ9eF8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZS92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZS92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775211819300_image_aWQ9eF8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZS92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yMmU1ZWFmMGU3MjE5NzkxZjY5ZDU0MGQ3YWFkNTExZS92aWV3cy9pbWdv"}]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:53:36.98212+05:30	waiting	\N	\N	1775211812792	Pelotech - Josef	medium	f	The message contains an image which might be related to design feedback or review.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
505	Abhishek Soni	<p>same feedback as the other page (cloud modernization)</p>	2026-04-03 15:13:56.645+05:30	design_feedback	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:13:59.694814+05:30	waiting	\N	\N	1775209436645	Pelotech - Josef	medium	f	Client is providing feedback related to a specific page.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
506	Abhishek Soni	<p>I don't like the emojis and the way this section is structured</p>	2026-04-03 15:14:07.594+05:30	design_feedback	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:14:11.011217+05:30	waiting	\N	\N	1775209447594	Pelotech - Josef	medium	f	Client is providing feedback on the design structure and elements.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
522	Abhishek Soni	<attachment id="1775050198507"></attachment>\n<p>done</p>	2026-04-07 14:45:54.453+05:30	client_approval	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-07 14:45:59.066588+05:30	waiting	\N	\N	1775553354453	Buildbite	medium	f	The message 'done' indicates approval or completion of a task.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
508	Kishan Ravaliya	<p><img src="https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775211042715/hostedContents/aWQ9eF8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZi92aWV3cy9pbWdv/$value" width="222.88359788359787" height="250" alt="image" itemid="0-cin-d4-27c46005e0d77e8109b3b4dc6f9df23f"></p>	2026-04-03 15:40:42.715+05:30	design_feedback	[{"url": "https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775211042715/hostedContents/aWQ9eF8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZi92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZi92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775211047462_image_aWQ9eF8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZi92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC0yN2M0NjAwNWUwZDc3ZTgxMDliM2I0ZGM2ZjlkZjIzZi92aWV3cy9pbWdv"}]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:40:45.323769+05:30	waiting	\N	\N	1775211042715	Pelotech - Josef	medium	f	Feedback on design structure and use of emojis, with images provided for context.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
496	Abhishek Soni	<p>it's the same task.</p>	2026-04-03 11:03:30.675+05:30	irrelevant	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-03 11:03:34.624215+05:30	waiting	\N	\N	1775194410675	Deep Group	low	f	Message lacks context or actionable content	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
497	Abhishek Soni	<p>please go ahead.</p>	2026-04-03 11:03:35.703+05:30	client_approval	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-03 11:03:38.335635+05:30	waiting	\N	\N	1775194415703	Deep Group	medium	f	Client approval message received.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
498	Abhishek Soni	<p>with ur work</p>	2026-04-03 11:03:48.25+05:30	irrelevant	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-03 11:03:50.879222+05:30	waiting	\N	\N	1775194428250	Deep Group	low	f	Message is unclear and lacks context or actionable content	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
482	Abhishek Soni	<p>ignore please</p>	2026-04-02 14:19:35.789+05:30	irrelevant	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-02 14:19:38.750989+05:30	ignored	\N	\N	1775119775789	Atomic Object	low	f	The message is a request to ignore and not a work task.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
515	Abhishek Soni	<p><at id="0">Khushal</at>&nbsp;<at id="1">Tank</at></p>	2026-04-03 17:58:48.865+05:30	change_request	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 17:58:51.190167+05:30	waiting	\N	\N	1775219328865	Pelotech - Josef	high	f	Request to start development on specified pages.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
523	Abhishek Soni	<p>please ignore these messages.</p>	2026-04-07 16:16:07.858+05:30	message	[]	[]	19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2	groupChat	2026-04-07 16:16:11.224001+05:30	ignored	\N	\N	1775558767858	Ignite Deep Tech	normal	f	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
513	Kishan Ravaliya	<p>DevOps Automation Consulting</p>\n<p><a href="https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3345-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3345-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1" target="_blank" itemid="default">https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3345-118&amp;viewport=-1893%2C85%2C…</a></p>	2026-04-03 16:46:40.918+05:30	link_share	[]	["https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3345-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1", "https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3345-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1", "https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3345-118&amp;viewport=-1893%2C85%2C…"]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 16:46:44.096469+05:30	waiting	\N	\N	1775215000918	Pelotech - Josef	medium	f	Kishan shared a Figma link related to DevOps Automation Consulting.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
530	Khushal Tank	<p><a href="https://buildbite-25848238.hs-sites-eu1.com/cleaning-janitorial-services-new" rel="noreferrer noopener" title="https://buildbite-25848238.hs-sites-eu1.com/cleaning-janitorial-services-new" target="_blank">https://buildbite-25848238.hs-sites-eu1.com/cleaning-janitorial-services-new</a></p>\n<p><a href="https://buildbite-25848238.hs-sites-eu1.com/general-contractor-new" rel="noreferrer noopener" title="https://buildbite-25848238.hs-sites-eu1.com/general-contractor-new" target="_blank">https://buildbite-25848238.hs-sites-eu1.com/general-contractor-new</a></p>\n<p><a href="https://buildbite-25848238.hs-sites-eu1.com/renovation-remodelling" rel="noreferrer noopener" title="https://buildbite-25848238.hs-sites-eu1.com/renovation-remodelling" target="_blank">https://buildbite-25848238.hs-sites-eu1.com/renovation-remodelling</a></p>\n<p><a href="https://buildbite-25848238.hs-sites-eu1.com/specialty-trade-contractors" rel="noreferrer noopener" title="https://buildbite-25848238.hs-sites-eu1.com/specialty-trade-contractors" target="_blank">https://buildbite-25848238.hs-sites-eu1.com/specialty-trade-contractors</a></p>\n<p>&nbsp;</p>\n<p>4 page link just content update client ko mt bhejna <at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p>	2026-04-08 10:29:34.916+05:30	system	[]	["https://buildbite-25848238.hs-sites-eu1.com/cleaning-janitorial-services-new", "https://buildbite-25848238.hs-sites-eu1.com/general-contractor-new", "https://buildbite-25848238.hs-sites-eu1.com/renovation-remodelling", "https://buildbite-25848238.hs-sites-eu1.com/specialty-trade-contractors"]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-08 10:36:34.104552+05:30	waiting	\N	\N	1775624374916	Buildbite	low	f	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
516	Design intern	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>, please check&nbsp;</p>\n<p>&nbsp;</p>\n<p>Home builder Persona Page</p>\n<p><a href="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" target="_blank" itemid="default">https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&amp;viewport=906%2C665%2…</a></p>\n<p>&nbsp;</p>\n<p>General Contractor</p>\n<p><a href="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" target="_blank" itemid="default">https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=906%2C665%…</a></p>\n<p>&nbsp;</p>\n<p>cleaning &amp; janitorial services</p>\n<p><a href="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" target="_blank" itemid="default">https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=906%2C665%2…</a></p>\n<p>&nbsp;</p>\n<p>Specialty Trade Contractors</p>\n<p><a href="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-4805&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-4805&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" target="_blank" itemid="default">https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-4805&amp;viewport=906%2C665%2…</a></p>\n<p>&nbsp;</p>\n<p>Renovation &amp; Remodelling</p>\n<p><a href="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-5776&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-5776&amp;viewport=906%2C665%2C0.08&amp;t=6mme91TH5PE0UNUP-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" target="_blank" itemid="default">https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-5776&amp;viewport=906%2C665%2…</a></p>	2026-04-06 17:26:29.927+05:30	design_feedback	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&viewport=906%2C665%2C0.08&t=6mme91TH5PE0UNUP-1&scaling=min-zoom&content-scaling=fixed&page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&viewport=906%2C665%2…", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&viewport=906%2C665%2C0.08&t=6mme91TH5PE0UNUP-1&scaling=min-zoom&content-scaling=fixed&page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&viewport=906%2C665%…", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&viewport=906%2C665%2C0.08&t=6mme91TH5PE0UNUP-1&scaling=min-zoom&content-scaling=fixed&page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&viewport=906%2C665%2…", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-4805&viewport=906%2C665%2C0.08&t=6mme91TH5PE0UNUP-1&scaling=min-zoom&content-scaling=fixed&page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-4805&viewport=906%2C665%2…", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-5776&viewport=906%2C665%2C0.08&t=6mme91TH5PE0UNUP-1&scaling=min-zoom&content-scaling=fixed&page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4507-5776&viewport=906%2C665%2…"]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-06 17:26:35.330117+05:30	waiting	\N	\N	1775476589927	Buildbite	medium	f	The message requests a review of design pages.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
491	Abhishek Soni	<p><img src="https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775130092317/hostedContents/aWQ9eF8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MC92aWV3cy9pbWdv/$value" width="309.58132045088564" height="250" alt="image" itemid="0-sin-d1-30c122f0087bb815c023c554eba50560"></p>	2026-04-02 17:11:32.317+05:30	irrelevant	[{"url": "https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775130092317/hostedContents/aWQ9eF8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MC92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MC92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775130099781_image_aWQ9eF8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MC92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMS0zMGMxMjJmMDA4N2JiODE1YzAyM2M1NTRlYmE1MDU2MC92aWV3cy9pbWdv"}]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 17:11:37.496281+05:30	approved	whatsapp	please review this, and let me know what to chang here.	1775130092317	Buildbite	low	f	Message contains an image with no context or request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
509	Abhishek Soni	<p>"The difference between working with Pelotech and other consulting teams is like night and day. Their engineers show up to every meeting with a clear agenda and a defined set of priorities. They drive the initiative forward instead of waiting for direction, which has been incredibly refreshing."<br>\nKaine Robertson - Driving Innovation and Growth at VendNovation</p>	2026-04-03 15:46:28.902+05:30	irrelevant	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:46:32.349717+05:30	waiting	\N	\N	1775211388902	Pelotech - Josef	low	f	The message is a testimonial or feedback about another company, not related to project work.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
524	Abhishek Soni	<p>check comments <at id="0">Design</at>&nbsp;<at id="1">intern</at>. <at id="2">Kishan</at>&nbsp;<at id="3">Ravaliya</at></p>	2026-04-07 17:29:02.646+05:30	system	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-07 17:29:05.367566+05:30	waiting	\N	\N	1775563142646	Buildbite	low	f	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
500	Abhishek Soni	<p>ignore these task, now please go ahead with your work.</p>\n<p>there won't be any disturbance from now.</p>	2026-04-03 11:33:23.946+05:30	irrelevant	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	groupChat	2026-04-03 11:33:27.576103+05:30	waiting	\N	\N	1775196203946	Atomic Object	low	f	The message instructs to ignore tasks and continue work, no action required.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
517	Khushal Tank	<p><a href="https://pelotech-3af9bb.webflow.io/cloud-modernization-services" rel="noreferrer noopener" title="https://pelotech-3af9bb.webflow.io/cloud-modernization-services" target="_blank">https://pelotech-3af9bb.webflow.io/cloud-modernization-services</a></p>\n<p><a href="https://pelotech-3af9bb.webflow.io/devops-automation-consulting" rel="noreferrer noopener" title="https://pelotech-3af9bb.webflow.io/devops-automation-consulting" target="_blank">https://pelotech-3af9bb.webflow.io/devops-automation-consulting</a></p>\n<p>&nbsp;</p>\n<p>&nbsp;</p>\n<p>Done <at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at></p>	2026-04-07 10:56:12.615+05:30	project_update	[]	["https://pelotech-3af9bb.webflow.io/cloud-modernization-services", "https://pelotech-3af9bb.webflow.io/devops-automation-consulting"]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-07 10:56:15.721906+05:30	waiting	\N	\N	1775539572615	Pelotech - Josef	high	f	Khushal Tank confirmed the completion of tasks assigned by Abhishek Soni.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
510	Abhishek Soni	<p><img src="https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775211400466/hostedContents/aWQ9eF8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOC92aWV3cy9pbWdv/$value" width="375.6476683937824" height="250" alt="image" itemid="0-sin-d4-b4613c09a5a233bf448279f768a9bce8"></p>	2026-04-03 15:46:40.466+05:30	design_feedback	[{"url": "https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775211400466/hostedContents/aWQ9eF8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOC92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOC92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775211404670_image_aWQ9eF8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOC92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC1iNDYxM2MwOWE1YTIzM2JmNDQ4Mjc5Zjc2OGE5YmNlOC92aWV3cy9pbWdv"}]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:46:43.164386+05:30	waiting	\N	\N	1775211400466	Pelotech - Josef	medium	f	Feedback on design structure and use of emojis, with images provided for context.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
525	Mayursingh Chundawat	<p><a href="https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link" rel="noreferrer noopener" title="https://drive.google.com/drive/folders/1a2pdtuj22i99suycbjkf5akk2hxgjbtl?usp=drive_link" target="_blank">https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link</a></p>	2026-04-07 17:37:15.476+05:30	system	[]	["https://drive.google.com/drive/folders/1A2pdTUJ22i99sUyCbjkF5Akk2HXGjBTL?usp=drive_link", "https://drive.google.com/drive/folders/1a2pdtuj22i99suycbjkf5akk2hxgjbtl?usp=drive_link"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-07 17:37:18.055849+05:30	waiting	\N	\N	1775563635476	Deep Group	low	f	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
476	Kishan Ravaliya	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;General Contractor Page</p>\n<p><a href="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" target="_blank" itemid="default">https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=680%2C667%…</a></p>	2026-04-02 11:30:22.809+05:30	link_share	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4315-17924&amp;viewport=680%2C667%…"]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 11:30:26.581049+05:30	waiting	\N	\N	1775109622809	Buildbite	medium	f	Message contains a Figma link related to project work.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
485	Abhishek Soni	<p>Hey @Parth</p>\n<p>&nbsp;</p>\n<p>Noticed that we are mixing title and sentence case on the persona pages.</p>\n<p>&nbsp;</p>\n<p>Let's stick to sentence case across the board.</p>	2026-04-02 15:06:29.656+05:30	change_request	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 15:06:32.319825+05:30	waiting	\N	\N	1775122589656	Buildbite	medium	f	Client requests a change to use sentence case on persona pages.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
495	Kishan Ravaliya	<p><img src="https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775192990770/hostedContents/aWQ9eF8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNC92aWV3cy9pbWdv/$value" width="573.208722741433" height="250" alt="image" itemid="0-sin-d2-1cb02ddb5453b06d7557a5ae5cf52ca4"></p>	2026-04-03 10:39:50.77+05:30	irrelevant	[{"url": "https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775192990770/hostedContents/aWQ9eF8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNC92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNC92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775192996653_image_aWQ9eF8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNC92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0xY2IwMmRkYjU0NTNiMDZkNzU1N2E1YWU1Y2Y1MmNhNC92aWV3cy9pbWdv"}]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-03 10:39:55.000066+05:30	waiting	\N	\N	1775192990770	Buildbite	low	f	The message contains an image link but no context or request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
507	Abhishek Soni	<p><img src="https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775209463027/hostedContents/aWQ9eF8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYS92aWV3cy9pbWdv/$value" width="363.94557823129253" height="250" alt="image" itemid="0-sin-d4-859231ab1a8cb53efa1b68b9f4c9d82a"></p>	2026-04-03 15:14:23.027+05:30	design_feedback	[{"url": "https://graph.microsoft.com/v1.0/chats/19:c674dec86329409aac6054bdc2c986e4@thread.v2/messages/1775209463027/hostedContents/aWQ9eF8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYS92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYS92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775209468594_image_aWQ9eF8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYS92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYSx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kNC04NTkyMzFhYjFhOGNiNTNlZmExYjY4YjlmNGM5ZDgyYS92aWV3cy9pbWdv"}]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 15:14:26.210414+05:30	waiting	\N	\N	1775209463027	Pelotech - Josef	medium	f	Feedback on design structure and use of emojis, with images provided for context.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
493	Kishan Ravaliya	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;bhai client ko bhej de&nbsp;</p>\n<p>map ki jagh pe ye rakhna he on scroll pe peoject ke sath images change hogi</p>	2026-04-02 17:18:09.873+05:30	change_request	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-02 17:18:13.977283+05:30	ignored	\N	\N	1775130489873	Deep Group	high	f	Client is requesting a change on the website.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
486	Abhishek Soni	<p><img alt="Media" src="https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775122601984/hostedContents/aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWNlMjJjNGNjYTIyZmZhNjczNjJjNjA4MWIxNjc1MjExL3ZpZXdzL2ltZ28=/$value" width="1721" height="845"></p>	2026-04-02 15:06:41.984+05:30	irrelevant	[{"url": "https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775122601984/hostedContents/aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWNlMjJjNGNjYTIyZmZhNjczNjJjNjA4MWIxNjc1MjExL3ZpZXdzL2ltZ28=/$value", "name": "image_aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWNlMjJjNGNjYTIyZmZhNjczNjJjNjA4MWIxNjc1MjExL3ZpZXdzL2ltZ28=.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775122609431_image_aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWNlMjJjNGNjYTIyZmZhNjczNjJjNjA4MWIxNjc1MjExL3ZpZXdzL2ltZ28_.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9LHR5cGU9MSx1cmw9aHR0cHM6Ly9pbi1hcGkuYXNtLnNreXBlLmNvbS92MS9vYmplY3RzLzAtY2luLWQ0LWNlMjJjNGNjYTIyZmZhNjczNjJjNjA4MWIxNjc1MjExL3ZpZXdzL2ltZ28="}]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 15:06:44.673424+05:30	approved	whatsapp	check it.\n	1775122601984	Buildbite	low	f	Message contains an image link with no context or request	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
477	Kishan Ravaliya	<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;cleaning &amp; janitorial services</p>\n<p><a href="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6" target="_blank" itemid="default">https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=680%2C667%2…</a></p>	2026-04-02 11:31:14.625+05:30	link_share	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=680%2C667%2C0.08&amp;t=1JUbE1eP5NFTqBOn-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=3025%3A6", "https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4345-8406&amp;viewport=680%2C667%2…"]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 11:31:17.646887+05:30	waiting	\N	\N	1775109674625	Buildbite	medium	f	Message contains a Figma link related to project work.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
492	Kishan Ravaliya	<p><img src="https://graph.microsoft.com/v1.0/chats/19:f92996ccf45c4e3e92d539c0603a2953@thread.v2/messages/1775130386286/hostedContents/aWQ9eF8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMC92aWV3cy9pbWdv/$value" width="417.4391657010429" height="250" alt="image" itemid="0-cin-d1-bd1c79704dfb19e06b0bff9035afccb0"></p>	2026-04-02 17:16:26.286+05:30	message	[{"url": "https://graph.microsoft.com/v1.0/chats/19:f92996ccf45c4e3e92d539c0603a2953@thread.v2/messages/1775130386286/hostedContents/aWQ9eF8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMC92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMC92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775130394130_image_aWQ9eF8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMC92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMCx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kMS1iZDFjNzk3MDRkZmIxOWUwNmIwYmZmOTAzNWFmY2NiMC92aWV3cy9pbWdv"}]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-02 17:16:28.808015+05:30	approved	whatsapp	Replaced the map with images.\nAnd the images will change on scroll.	1775130386286	Deep Group	normal	f	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
501	Dev intern	<p>hi</p>	2026-04-03 11:58:45.017+05:30	greeting	[]	[]	19:56b13a6c70aa4384a083e7bbc4ee8f14@thread.v2	groupChat	2026-04-03 11:58:48.904712+05:30	waiting	\N	\N	1775197725017	Seller Umbrella	low	f	Skipped: greeting/meeting: "hi"	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
518	parth parmar	<p>Let me know final version to review. so we can live today.&nbsp;</p>	2026-04-07 11:37:03.95+05:30	client_approval	[]	[]	19:56b13a6c70aa4384a083e7bbc4ee8f14@thread.v2	groupChat	2026-04-07 11:37:07.460926+05:30	waiting	\N	\N	1775542023950	Seller Umbrella	high	f	Request for final version review to go live today.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
531	Design intern	<p><img src="https://graph.microsoft.com/v1.0/chats/19:b8106b41b4eb4b4289f0add58655fbca@thread.v2/messages/1775624915777/hostedContents/aWQ9eF8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZi92aWV3cy9pbWdv/$value" width="268.140589569161" height="250" alt="image" itemid="0-sin-d2-d09e955881c69a4876c91ad8446d3f0f"></p>\n<p><at id="0">Abhishek</at>&nbsp;<at id="1">Soni</at>&nbsp;please check</p>	2026-04-08 10:38:35.777+05:30	system	[{"url": "https://graph.microsoft.com/v1.0/chats/19:b8106b41b4eb4b4289f0add58655fbca@thread.v2/messages/1775624915777/hostedContents/aWQ9eF8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZi92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZi92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775624922082_image_aWQ9eF8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZi92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi1kMDllOTU1ODgxYzY5YTQ4NzZjOTFhZDg0NDZkM2YwZi92aWV3cy9pbWdv"}]	[]	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	groupChat	2026-04-08 10:38:40.918494+05:30	waiting	\N	\N	1775624915777	Avishkar Developers	low	f	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
489	Kishan Ravaliya	<p><img src="https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775123896238/hostedContents/aWQ9eF8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMyx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMy92aWV3cy9pbWdv/$value" width="423.6559139784946" height="250" alt="image" itemid="0-sin-d2-20dc7feb5ce3a323e9f319551c7e16e3"></p>	2026-04-02 15:28:16.238+05:30	irrelevant	[{"url": "https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775123896238/hostedContents/aWQ9eF8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMyx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMy92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMyx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMy92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775123900777_image_aWQ9eF8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMyx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMy92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMyx0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLXNpbi1kMi0yMGRjN2ZlYjVjZTNhMzIzZTlmMzE5NTUxYzdlMTZlMy92aWV3cy9pbWdv"}]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 15:28:19.748199+05:30	approved	whatsapp	review it.	1775123896238	Buildbite	low	f	Message contains only an image with no context or request.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
502	Abhishek Soni	<p>I'll review</p>\n<p>Had a comment about 1 section</p>\n<p>we need to improve it - doesn't look good, it's just walls of text</p>\n<p>also we'd like to replace those quotes &nbsp; &nbsp;- &nbsp; Josef</p>	2026-04-03 14:34:27.864+05:30	design_feedback	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 14:34:32.858692+05:30	waiting	\N	\N	1775207067864	Pelotech - Josef	medium	f	Client requests improvement on a section and replacement of quotes.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
512	Kishan Ravaliya	<p>cloud-modernization-services</p>\n<p><a href="https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3400-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1" itemtype="filesHyperlink" rel="noreferrer noopener" title="https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3400-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1" target="_blank" itemid="default">https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3400-118&amp;viewport=-1893%2C85%2C…</a></p>	2026-04-03 16:25:36.339+05:30	link_share	[]	["https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3400-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1", "https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3400-118&amp;viewport=-1893%2C85%2C0.09&amp;t=joZ7ZNqu0DoiYMsB-1&amp;scaling=min-zoom&amp;content-scaling=fixed&amp;page-id=0%3A1", "https://www.figma.com/proto/636i0QBJ3qldK5CC0Nb6Zs/Pelotech?node-id=3400-118&amp;viewport=-1893%2C85%2C…"]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 16:25:42.217094+05:30	waiting	\N	\N	1775213736339	Pelotech - Josef	medium	f	Kishan shared a Figma link related to cloud modernization services.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
519	Mayursingh Chundawat	<p><span style="font-size:inherit">For guide we can publish guide on following topic. - 1.  Step-by-step process to purchase a Residential Apartment in Ahmedabad ----this guide will be listed on home page hero banner white box with CTA button "Download Guide" with a brochure type guide image with title on it</span></p>	2026-04-07 13:16:30.054+05:30	change_request	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	groupChat	2026-04-07 13:16:32.547792+05:30	waiting	\N	\N	1775547990054	Deep Group	medium	f	The message contains a request to publish a guide on a specific topic.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
527	Abhishek Soni	<p>okk</p>	2026-04-07 18:04:17.005+05:30	system	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-07 18:04:19.656208+05:30	waiting	\N	\N	1775565257005	Buildbite	low	f	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
532	Abhishek Soni	<p>Not satisfying to me&nbsp;</p>	2026-04-08 10:53:33.99+05:30	system	[]	[]	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	groupChat	2026-04-08 10:53:36.170368+05:30	ignored	\N	\N	1775625813990	Avishkar Developers	low	f	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
494	Abhishek Soni	<p>Hey <a href="https://me-kp05381.slack.com/team/U05RU2TUAPQ" rel="noreferrer noopener" title="https://me-kp05381.slack.com/team/U05RU2TUAPQ" target="_blank">@Parth</a> - Let me share new, detailed templates for each persona page to make it super clear what we are looking for</p>\n<p>&nbsp;</p>\n<p>[5:35 PM]</p>\n<p>Here you go <a href="https://me-kp05381.slack.com/team/U05RU2TUAPQ" rel="noreferrer noopener" title="https://me-kp05381.slack.com/team/U05RU2TUAPQ" target="_blank">@Parth</a><br>\n<br>\nThese are 4 out of 6 persona-pages that are ready. I've adapted the copy to the newest template to make it super easy for you and the team to understand where each copy goes:<br>\n<br>\n<a href="https://docs.google.com/document/d/1bMseFGtXPPtcd5soGLwHp0rO69vb9UuC9H1iGQaJroI/edit?usp=sharing" rel="noreferrer noopener" title="https://docs.google.com/document/d/1bMseFGtXPPtcd5soGLwHp0rO69vb9UuC9H1iGQaJroI/edit?usp=sharing" target="_blank">https://docs.google.com/document/d/1bMseFGtXPPtcd5soGLwHp0rO69vb9UuC9H1iGQaJroI/edit?usp=sharing</a><br>\n<br>\n<strong>Only the meta title should be title case. Everything else should be sentence case.</strong><br>\n<br>\nIf you have any questions. Let me know.<br>\n<br>\nThere's two persona pages remaining, which I'll create copy for:<br>\n&nbsp;</p>\n<ul>\n<li>Specialty Trade Contractors</li><li>Property &amp; Tenant Management</li></ul>\n<p><br>\n<br>\nI'll let you know once these are ready, and they will follow the exact same template and structure.</p>\n<p>All of them should go here:</p>\n<p>&nbsp;</p>\n<p><img src="https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775134772039/hostedContents/aWQ9eF8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZi92aWV3cy9pbWdv/$value" width="720.2868852459017" height="250" alt="image" itemid="0-cin-d4-4f44537448e963151b5ab5735b9b29af"></p>\n<p>&nbsp;</p>\n<p>Here you can see which new pages that replace the old ones, for reference: <a href="https://docs.google.com/spreadsheets/d/16RrcO4ciWC3vYTx5CBZyipCh7Nqkmaymmt2nen-OJXM/edit?usp=sharing" rel="noreferrer noopener" title="https://docs.google.com/spreadsheets/d/16RrcO4ciWC3vYTx5CBZyipCh7Nqkmaymmt2nen-OJXM/edit?usp=sharing" target="_blank">https://docs.google.com/spreadsheets/d/16RrcO4ciWC3vYTx5CBZyipCh7Nqkmaymmt2nen-OJXM/edit?usp=sharing</a></p>	2026-04-02 18:29:32.039+05:30	link_share	[{"url": "https://graph.microsoft.com/v1.0/chats/19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2/messages/1775134772039/hostedContents/aWQ9eF8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZi92aWV3cy9pbWdv/$value", "name": "image_aWQ9eF8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZi92aWV3cy9pbWdv.jpg", "publicUrl": "https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/teams-media/1775134778265_image_aWQ9eF8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZi92aWV3cy9pbWdv.jpg", "contentType": "image/jpeg", "hostedContentId": "aWQ9eF8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZix0eXBlPTEsdXJsPWh0dHBzOi8vaW4tYXBpLmFzbS5za3lwZS5jb20vdjEvb2JqZWN0cy8wLWNpbi1kNC00ZjQ0NTM3NDQ4ZTk2MzE1MWI1YWI1NzM1YjliMjlhZi92aWV3cy9pbWdv"}]	["https://me-kp05381.slack.com/team/U05RU2TUAPQ", "https://me-kp05381.slack.com/team/U05RU2TUAPQ", "https://me-kp05381.slack.com/team/U05RU2TUAPQ", "https://me-kp05381.slack.com/team/U05RU2TUAPQ", "https://docs.google.com/document/d/1bMseFGtXPPtcd5soGLwHp0rO69vb9UuC9H1iGQaJroI/edit?usp=sharing", "https://docs.google.com/document/d/1bMseFGtXPPtcd5soGLwHp0rO69vb9UuC9H1iGQaJroI/edit?usp=sharing", "https://docs.google.com/document/d/1bMseFGtXPPtcd5soGLwHp0rO69vb9UuC9H1iGQaJroI/edit?usp=sharing", "https://docs.google.com/spreadsheets/d/16RrcO4ciWC3vYTx5CBZyipCh7Nqkmaymmt2nen-OJXM/edit?usp=sharing", "https://docs.google.com/spreadsheets/d/16RrcO4ciWC3vYTx5CBZyipCh7Nqkmaymmt2nen-OJXM/edit?usp=sharing", "https://docs.google.com/spreadsheets/d/16RrcO4ciWC3vYTx5CBZyipCh7Nqkmaymmt2nen-OJXM/edit?usp=sharing"]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-04-02 18:29:36.239133+05:30	waiting	\N	\N	1775134772039	Buildbite	medium	f	Client shared Google Docs and Sheets links for persona pages.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
503	Abhishek Soni	<p>Or replace 1 of the quotes with:<br>\n<br>\n"The difference between working with Pelotech and other consulting teams is like night and day. Their engineers show up to every meeting with a clear agenda and a defined set of priorities. They drive the initiative forward instead of waiting for direction, which has been incredibly refreshing."</p>\n<p>Kaine Robertson - Driving Innovation and Growth at VendNovation</p>	2026-04-03 14:35:00.839+05:30	change_request	[]	[]	19:c674dec86329409aac6054bdc2c986e4@thread.v2	groupChat	2026-04-03 14:35:03.482239+05:30	waiting	\N	\N	1775207100839	Pelotech - Josef	medium	f	Client is requesting a change to replace a quote.	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
528	Mayursingh Chundawat	<div>Amazon Ads Partner: <a href="https://advertising.amazon.com/partners/directory/details/amzn1.ads1.ma1.ck8lnsp2l2welghoag14ssq2y/Sellers-Umbrella?ref_=prtdrl_shr_cy">https://advertising.amazon.com/partners/directory/details/amzn1.ads1.ma1.ck8lnsp2l2welghoag14ssq2y/Sellers-Umbrella?ref_=prtdrl_shr_cy</a><br>\n<br>\nAmazon SPN Partners: <a href="https://sellercentral.amazon.com/gspn/provider-details/Advertising%20Optimization/c9b50585-3d39-472b-b66f-a2d47d1202a2?ref_=sc_gspn_alst_adt-c9b50585&amp;localeSelection=en_US&amp;sellFrom=US&amp;sellIn=US">https://sellercentral.amazon.com/gspn/provider-details/Advertising%20Optimization/c9b50585-3d39-472b-b66f-a2d47d1202a2?ref_=sc_gspn_alst_adt-c9b50585&amp;localeSelection=en_US&amp;sellFrom=US&amp;sellIn=US</a><br>\n<br>\nAmazon App Store: <a href="https://www.amazon.com/gp/product/B0GF1R2XPV">https://www.amazon.com/gp/product/B0GF1R2XPV</a></div>	2026-04-07 18:23:51.339+05:30	system	[]	["https://advertising.amazon.com/partners/directory/details/amzn1.ads1.ma1.ck8lnsp2l2welghoag14ssq2y/Sellers-Umbrella?ref_=prtdrl_shr_cy", "https://sellercentral.amazon.com/gspn/provider-details/Advertising%20Optimization/c9b50585-3d39-472b-b66f-a2d47d1202a2?ref_=sc_gspn_alst_adt-c9b50585&localeSelection=en_US&sellFrom=US&sellIn=US", "https://www.amazon.com/gp/product/B0GF1R2XPV"]	19:56b13a6c70aa4384a083e7bbc4ee8f14@thread.v2	groupChat	2026-04-07 18:25:12.141735+05:30	waiting	\N	\N	1775566431339	Seller Umbrella	low	f	Analysis failed: 401 Incorrect API key provided: sk-proj-****************************************	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
533	parth parmar	<p><at id="0">Mayursingh</at>&nbsp;<at id="1">Chundawat</at>&nbsp;please come&nbsp;</p>	2026-04-08 11:05:58.175+05:30	system	[]	[]	19:56b13a6c70aa4384a083e7bbc4ee8f14@thread.v2	groupChat	2026-04-08 11:06:01.389569+05:30	ignored	\N	\N	1775626558175	Seller Umbrella	low	f	Analysis failed: 403 Project `proj_MZLUVn4QJaJ0FJFO5ju1OlKp` does not have access to model `gpt-4	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f	tenant-default
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, name, slug, created_at) FROM stdin;
tenant-default	Default Tenant	default	2026-04-08 12:06:59.930066+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, role, department, teams_display_name, created_at, tenant_id) FROM stdin;
1	Admin	pm@appsrow.com	$2b$10$k.dPyQHAKMD0y27ILX0TKufRyonPm6G7UWsYvgPItBbjO3nk/hs76	admin	\N	\N	2026-02-27 14:03:02.06781+05:30	tenant-default
\.


--
-- Data for Name: whatsapp_batch_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whatsapp_batch_tasks (id, group_name, task_title, description, category, priority, files, links, teams_chat_id, forwarded, scanned_at, tenant_id) FROM stdin;
5	Test-grp	Update Career Page Pictures	Update pictures on the Career page from the repository.	change_request	medium	[]	["https://deep-group.webflow.io/career"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:54.063455+05:30	tenant-default
1	Test-grp	Update Contact Us Banner Title	Change the banner creative title on the Contact Us page from 'Let’s connect to shape your new space' to 'Let’s Connect to Find Your New Space'.	change_request	medium	[]	["https://deep-group.webflow.io/contact-us"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:53.037401+05:30	tenant-default
2	Test-grp	Update FAQ Banner Title	Change the banner creative title on the FAQ page from 'Frequently Asked Questions' to 'We’re Here to Answer Every Question You Have'.	change_request	medium	[]	["https://deep-group.webflow.io/faq"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:53.272718+05:30	tenant-default
3	Test-grp	Update CSR Page Titles and Content	On the CSR page, change 'Giving Back to Society' to 'Corporate Social Responsibility', 'CSR' to 'Committed to Building Communities—Beyond Construction', and in the red section, change 'Corporate Social Responsibility' to 'Turning Responsibility into Action for Sustainable Living and Stronger Communities'.	change_request	medium	[]	["https://deep-group.webflow.io/csr"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:53.55711+05:30	tenant-default
4	Test-grp	Upload Pictures to Channel Partner Page	Upload more pictures from the repository to the Channel Partner page after all property pages are completed.	follow_up	low	[]	["https://deep-group.webflow.io/channel-partner"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:53.790965+05:30	tenant-default
6	Test-grp	Adjust Font Sizing and Check Forms on Career Pages	Adjust font sizing and capitalization on all job details pages under the Career section. Ensure form submissions send emails to info@deepgroup1980.com and nupur@ncubit.com.	change_request	high	[]	["https://deep-group.webflow.io/career/project-manager"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:54.325068+05:30	tenant-default
7	Test-grp	Revise Vendor Registration Page Content	Revise the content on the Vendor Registration page, ensuring steps are visible in the red section and titles are not repetitive. Verify form submissions send emails to info@deepgroup1980.com and nupur@ncubit.com.	change_request	high	[]	["https://deep-group.webflow.io/vendor-registration"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:54.558756+05:30	tenant-default
8	Test-grp	Enhance Insights Page Content	Increase the content of all blogs on the Insights page to ensure a read time of 4-5 minutes. Ensure images are relevant.	change_request	medium	[]	["https://deep-group.webflow.io/insights"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:54.811278+05:30	tenant-default
9	Test-grp	Revise Blog Content and Add Links	Expand the content of the blog 'Best Residential Areas for 2-3 BHK Apartments in Ahmedabad' beyond bullet points and link to relevant project/property pages.	change_request	medium	[]	["https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:55.043489+05:30	tenant-default
10	Test-grp	Update News and PR Page Titles	On the News and PR page, add one more news item. Change 'Public Announcements' to 'News and Press Releases', 'News & PR' to 'Our Recognitions, Media Coverage & Announcements', 'Built Transparency' to 'Real Estate News & Project Updates', and 'News & Updates' to 'Shaping Headlines. Building Trust.'	change_request	medium	[]	["https://deep-group.webflow.io/news-pr"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:55.33771+05:30	tenant-default
11	Test-grp	General Feedback Implementation	Add relevant and abstract line drawings in dark gray color to banners. Ensure consistent capitalization across all pages, titles, and banners.	feedback	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:11:55.592485+05:30	tenant-default
12	Test-grp	Update Banner Titles on Contact Us and FAQ Pages	Update the banner creative title on the Contact Us page from 'Let’s connect to shape your new space' to 'Let’s Connect to Find Your New Space'. Update the banner creative title on the FAQ page from 'Frequently Asked Questions' to 'We’re Here to Answer Every Question You Have'.	change_request	medium	[]	["https://deep-group.webflow.io/contact-us", "https://deep-group.webflow.io/faq"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:44.750068+05:30	tenant-default
13	Test-grp	Update CSR Page Content	On the CSR page, change 'Giving Back to Society' to 'Corporate Social Responsibility'. Change 'CSR' to 'Giving Back to Society' to 'Committed to Building Communities—Beyond Construction'. In the red section below, change 'Corporate Social Responsibility' to 'Turning Responsibility into Action for Sustainable Living and Stronger Communities'.	change_request	medium	[]	["https://deep-group.webflow.io/csr"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:45.066524+05:30	tenant-default
14	Test-grp	Upload Pictures to Channel Partner and Career Pages	Upload more pictures from the repository to the Channel Partner page after all property pages are done. Update pictures from the repository on the Career page.	follow_up	low	[]	["https://deep-group.webflow.io/channel-partner", "https://deep-group.webflow.io/career"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:45.313356+05:30	tenant-default
15	Test-grp	Update Font Sizing and Form Functionality on Career Pages	Work on font sizing and capitalizations for all job details pages on the Career site. Check if forms are working fine for all jobs posted. After submission, emails should be sent to info@deepgroup1980.com and nupur@ncubit.com.	change_request	high	[]	["https://deep-group.webflow.io/career/project-manager"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:45.559746+05:30	tenant-default
16	Test-grp	Revise Vendor Registration Page Content and Form	On the Vendor Registration page, ensure the steps mentioned in the red section are visible. Revise the content as titles are repetitive. Check that form submission sends all information via email to info@deepgroup1980.com and nupur@ncubit.com.	change_request	high	[]	["https://deep-group.webflow.io/vendor-registration"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:45.817712+05:30	tenant-default
17	Test-grp	Enhance Blog Content and Relevance on Insights Page	Increase the content of all blogs on the Insights page to ensure read time increases to 4-5 minutes. Ensure images are very relevant. For the blog 'Best Residential Areas for 2-3 BHK Apartments in Ahmedabad', expand content beyond bullet points and link to relevant project/property pages.	change_request	medium	[]	["https://deep-group.webflow.io/insights", "https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:46.137402+05:30	tenant-default
18	Test-grp	Update News and PR Page Titles and Content	On the News and PR page, add one more news item. Change the title 'Public Announcements' to 'News and Press Releases'. Change 'News & PR' to 'Our Recognitions, Media Coverage & Announcements'. Change 'Built Transparency' to 'Real Estate News & Project Updates'. Change 'News & Updates' to 'Shaping Headlines. Building Trust.'	change_request	medium	[]	["https://deep-group.webflow.io/news-pr"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:46.420226+05:30	tenant-default
19	Test-grp	General Feedback Implementation	Enhance banners by adding relevant and abstract line drawings in a little dark gray color or suggest alternatives. Ensure consistent capitalization across all pages, with titles and banners following the same pattern.	feedback	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:22:46.67908+05:30	tenant-default
20	Test-grp	Update Contact Us and FAQ Page Titles	Update the banner title on the Contact Us page from 'Let’s connect to shape your new space' to 'Let’s Connect to Find Your New Space'. Similarly, update the FAQ page banner title from 'Frequently Asked Questions' to 'We’re Here to Answer Every Question You Have'.	change_request	medium	[]	["https://deep-group.webflow.io/contact-us", "https://deep-group.webflow.io/faq"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:43.196164+05:30	tenant-default
21	Test-grp	Update Contact Us Page Banner Title	Change the banner creative title on the Contact Us page from 'Let’s connect to shape your new space' to 'Let’s Connect to Find Your New Space'.	change_request	medium	[]	["https://deep-group.webflow.io/contact-us"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:43.393251+05:30	tenant-default
22	Test-grp	Revise CSR Page Content	On the CSR page, change 'Giving Back to Society' to 'Corporate Social Responsibility'. Update 'CSR' to 'Committed to Building Communities—Beyond Construction'. In the red section, change 'Corporate Social Responsibility' to 'Turning Responsibility into Action for Sustainable Living and Stronger Communities'.	change_request	medium	[]	["https://deep-group.webflow.io/csr"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:43.533062+05:30	tenant-default
23	Test-grp	Update FAQ Page Banner Title	Change the banner creative title on the FAQ page from 'Frequently Asked Questions' to 'We’re Here to Answer Every Question You Have'.	change_request	medium	[]	["https://deep-group.webflow.io/faq"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:43.72657+05:30	tenant-default
24	Test-grp	Update Channel Partner and Career Page Images	Upload more pictures from the repository to the Channel Partner page after all property pages are completed. Update pictures on the Career page from the repository.	follow_up	low	[]	["https://deep-group.webflow.io/channel-partner", "https://deep-group.webflow.io/career"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:43.814713+05:30	tenant-default
25	Test-grp	Adjust Font and Check Forms on Career Job Details Pages	Work on font sizing and capitalizations for all job details pages on the Career site. Ensure that form submissions send emails to info@deepgroup1980.com and nupur@ncubit.com.	change_request	high	[]	["https://deep-group.webflow.io/career/project-manager"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:44.024736+05:30	tenant-default
26	Test-grp	Revise Career Page Job Details	Adjust font sizing and capitalization on all job details pages under the Career section. Ensure that form submissions send emails to info@deepgroup1980.com and nupur@ncubit.com.	change_request	high	[]	["https://deep-group.webflow.io/career/project-manager"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:44.055288+05:30	tenant-default
27	Test-grp	Vendor Registration Page Content and Form	Review the Vendor Registration page to ensure the steps in the red section are visible and improve the content as titles are repetitive. Verify that form submissions send all information via email to info@deepgroup1980.com and nupur@ncubit.com.	urgent	high	[]	["https://deep-group.webflow.io/vendor-registration"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:44.341489+05:30	tenant-default
28	Test-grp	Improve Blog Content and Links	Enhance the content of the blog 'Best Residential Areas for 2-3 BHK Apartments in Ahmedabad' by adding more detailed information and linking relevant project/property pages.	change_request	medium	[]	["https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:44.343581+05:30	tenant-default
29	Test-grp	Revise News and PR Page Titles	Add one more news item to the News and PR page. Change 'Public Announcements' to 'News and Press Releases', 'News & PR' to 'Our Recognitions, Media Coverage & Announcements', 'Built Transparency' to 'Real Estate News & Project Updates', and 'News & Updates' to 'Shaping Headlines. Building Trust.'	change_request	medium	[]	["https://deep-group.webflow.io/news-pr"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:44.651267+05:30	tenant-default
30	Test-grp	Add Content for News Posts	Use the provided Google Doc to add content for two news posts, which include two awards as news. Await images for the third post to be added later.	new_project	medium	[]	["https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:35:44.653677+05:30	tenant-default
31	Test-grp	Improve Blog Content and Linking	Enhance the blog content on the specified post by adding more detailed information instead of bullet points. Link relevant project/property pages within the content.	change_request	medium	[]	["https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:40:04.52273+05:30	tenant-default
32	Test-grp	Add Two News Posts with Awards	The client has provided a Google Doc containing content for two news posts, which include information about two awards. The team should review the document and update the website with these news posts. The client will provide additional content for a third award once they receive the relevant images.	change_request	medium	[]	["https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 17:45:19.459016+05:30	tenant-default
33	Test-grp	Follow-up on News Posts Content Update	Purvi Bhatia is requesting an update on the content for the 2 news posts. The content was shared via a Google document link. Ensure that the content for the two awards is updated as news posts, and be prepared to add a third once images are received.	follow_up	high	[]	["https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 18:08:35.135497+05:30	tenant-default
34	Test-grp	Urgent Update on News Posts	Purvi Bhatia has requested urgent changes to be made to the content for 2 News posts. The posts include 2 awards as news, and a third will be added once images are received. The request emphasizes the need for immediate action.	urgent	high	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 18:13:20.631463+05:30	tenant-default
35	Test-grp	Remove 'Buy Again' Button	Remove the 'Buy Again' button from the specified section or page as requested by the client. Ensure that the removal does not affect other functionalities on the page.	change_request	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 18:21:07.845062+05:30	tenant-default
36	Test-grp	Adjust Banner Darkness	The current banner design is too dark. It looks good but needs to be lightened. Please adjust the darkness to make it more visually appealing while maintaining the overall design integrity.	change_request	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-01 18:27:11.763655+05:30	tenant-default
55	Test-grp	Remove background images and await new images	Remove the current images from the background as instructed. Await the provision of real workers' images from Purvi Bhatia for replacement.	\N	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 18:50:28.164614+05:30	tenant-default
37	Deep Website	Update CSR Page Content	Change the text on the CSR page as follows: Replace 'Giving Back to Society' with 'Corporate Social Responsibility'. Change 'CSR' to 'Committed to Building Communities—Beyond Construction'. In the red section below, change 'Corporate Social Responsibility' to 'Turning Responsibility into Action for Sustainable Living and Stronger Communities'.	change_request	medium	[]	["https://deep-group.webflow.io/csr"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-02 11:29:09.974506+05:30	tenant-default
38	Deep Website	Upload Pictures to Channel Partner and Career Pages	Upload additional pictures from the repository to the Channel Partner page after all property pages are completed. Also, update pictures on the Career page from the repository.	change_request	low	[]	["https://deep-group.webflow.io/channel-partner", "https://deep-group.webflow.io/career"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-02 11:29:10.302619+05:30	tenant-default
39	Deep Website	Adjust Font Sizing and Capitalization on Career Pages	Review and adjust font sizing and capitalization for all job details pages on the Career section. Ensure consistency across all job postings.	change_request	medium	[]	["https://deep-group.webflow.io/career/project-manager"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-02 11:29:10.580661+05:30	tenant-default
40	Deep Website	Check Form Submissions for Career and Vendor Registration Pages	Verify that form submissions on the Career and Vendor Registration pages send emails to info@deepgroup1980.com and nupur@ncubit.com. Ensure all information is correctly captured and sent.	urgent	high	[]	["https://deep-group.webflow.io/career", "https://deep-group.webflow.io/vendor-registration"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-02 11:29:10.890277+05:30	tenant-default
41	Deep Website	Revise Content on Insights and Blog Pages	Increase content length on all blog posts in the Insights section to ensure a read time of 4-5 minutes. Ensure images are relevant. Specifically, for the blog 'Best Residential Areas for 2-3 BHK Apartments in Ahmedabad', expand content beyond bullet points and link to relevant project/property pages.	change_request	medium	[]	["https://deep-group.webflow.io/insights", "https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-02 11:29:11.177013+05:30	tenant-default
42	Deep Website	Update News and PR Page Content	Add one more news item to the News and PR page. Change the title 'Public Announcements' to 'News and Press Releases'. Update 'News & PR' to 'Our Recognitions, Media Coverage & Announcements', 'Built Transparency' to 'Real Estate News & Project Updates', and 'News & Updates' to 'Shaping Headlines. Building Trust.'	change_request	medium	[]	["https://deep-group.webflow.io/news-pr"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-02 11:29:11.422337+05:30	tenant-default
43	Deep Website	General Feedback Implementation	Enhance the banners across the website by adding relevant and abstract line drawings in a dark gray color or suggest alternative improvements. Ensure consistent capitalization on all pages, with titles and banners following the same pattern.	feedback	medium	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-02 11:29:11.700991+05:30	tenant-default
44	Test-grp	Client approved design changes	The client has approved the design changes related to the darkness of the theme. The previous feedback mentioned that the design looked good but was too dark, and changes were requested. The client has now given approval to proceed with the updated design.	client_approval	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 14:38:45.200805+05:30	tenant-default
45	Test-grp	Follow-up on update request	Purvi Bhatia is asking for an update on a previous request. Please review the context to determine what specific update is being referred to and provide the necessary information or status.	follow_up	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 15:18:51.009529+05:30	tenant-default
46	Test-grp	Check image updates	Purvi Bhatia asked if the images have been checked. Ensure that all the images mentioned in previous discussions are reviewed and confirm their status. This may involve verifying if the images have been updated or uploaded as per the client's requirements.	follow_up	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 15:34:35.071783+05:30	tenant-default
47	Test-grp	Follow-up on project update	Purvi Bhatia is asking for an update on the project. Please provide the latest status and any relevant details regarding the progress.	follow_up	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 15:42:24.274222+05:30	tenant-default
48	Test-grp	Redesign two landing pages using new template	Redesign the 'Cleaning and janitorial' and 'General contractors' landing pages using the new template for persona-pages. Swap out the copy and images as per the new template. The template can be viewed at: https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view=PE4h-1&scalin…	\N	high	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view=PE4h-1&scalin…"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 16:05:34.117557+05:30	tenant-default
49	Test-grp	Link new template under 'who it's for'	Link the new template under 'who it's for' with the name 'Home builders'. The template can be accessed here: https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view=PE4h-1&scalin…	\N	medium	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view=PE4h-1&scalin…"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 16:05:34.445663+05:30	tenant-default
50	Test-grp	Redesign two landing pages using new template	Redesign the two landing pages for 'Cleaning and janitorial' and 'General contractors' using the new template provided for persona-pages. Swap out the copy and images as instructed.	\N	high	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 18:50:26.62613+05:30	tenant-default
51	Test-grp	Push new template live	Push the new template live as per the provided Figma link. It should be linked under 'who it's for' with the name 'Home builders'.	\N	medium	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 18:50:26.915479+05:30	tenant-default
52	Test-grp	Remove background images and update with real worker images	Remove the current background images and update them with the real worker images that will be provided.	\N	medium	[]	[]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 18:50:27.140955+05:30	tenant-default
53	Test-grp	Redesign two landing pages using new persona-page template	Redesign the 'Cleaning and janitorial' and 'General contractors' landing pages using the new persona-page template. Swap out the copy and images as per the new template. The new template can be found in the Figma link provided. Ensure the redesigned pages follow the exact same template.	\N	high	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 18:50:27.645759+05:30	tenant-default
54	Test-grp	Push 'Home builders' page live	Push the 'Home builders' page live. It should be linked under 'who it's for' with the name 'Home builders'.	\N	medium	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-02 18:50:27.90737+05:30	tenant-default
56	Deep Website	Use project images from specified folders	Use images from Google Drive - Deep Central > Project Details folder and the additional OneDrive folder for the latest images on Saptak, Shivanta, and other projects. Ensure webflowdev33@gmail.com has access to the Microsoft drive.	\N	high	[]	["https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa0lJQmVhQ2dBQUFBQUFZVDYwR1NUOWpKQ3pCR1N2WnJSOVhB&id=5EE4D8E878659E90%2110344&cid=5EE4D8E878659E90&sb=name&sd=1"]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-03 11:02:55.388773+05:30	tenant-default
57	Test-grp	Review and update task optimization sheet	Review the task optimization sheet shared by Purvi Bhatia and make necessary updates/changes to improve task optimization. The sheet is available at: https://docs.google.com/spreadsheets/d/1xoUAQd-HSev178TkPmNPiPQFAAmDK77P/edit?usp=sharing&ouid=106624485558868125872&rtpof=true&sd=true. Let Purvi know if anything needs clarification or if you have suggestions.	\N	medium	[]	["https://docs.google.com/spreadsheets/d/1xoUAQd-HSev178TkPmNPiPQFAAmDK77P/edit?usp=sharing&ouid=106624485558868125872&rtpof=true&sd=true"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-03 11:21:56.295682+05:30	tenant-default
58	Test-grp	Delete Global Data Innovation Peach page	Delete the page at the following URL: https://trust-certificate-program.teachery.co/global-data-innovation-peach as requested by Purvi Bhatia.	\N	high	[]	["https://trust-certificate-program.teachery.co/global-data-innovation-peach"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-03 11:21:56.52743+05:30	tenant-default
59	Test-grp	Make AI Trust Certificate Program pages visible and add Stripe payment	Make the following pages visible without login for the AI Trust Certificate Program: 1. Dashboard (https://trust-certificate-program.teachery.co/dashboard), 2. Module 1 (https://trust-certificate-program.teachery.co/lessons/module-1), and 3. Module 2 (https://trust-certificate-program.teachery.co/lessons/module-2). Additionally, add Stripe payment after Module 2. Do not create a new landing page.	\N	high	[]	["https://trust-certificate-program.teachery.co/dashboard", "https://trust-certificate-program.teachery.co/lessons/module-1", "https://trust-certificate-program.teachery.co/lessons/module-2"]	19:242493be18a54cb58c65303932eeeb7f@thread.v2	t	2026-04-03 11:21:56.757782+05:30	tenant-default
60	Test-grp	Redesign two landing pages using new template	Redesign the two previously created landing pages using the new template provided for persona-pages. Ensure that the design follows the exact same template, swapping out the copy and images as needed. The new template is for 'Cleaning and janitorial' and 'General contractors'. Additionally, push the current design live and link it under 'who it's for' with the name 'Home builders'. The design can be accessed at the provided Figma link.	change_request	medium	[]	["https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view[…]PE4h-1&scalin…"]	19:da0a2b138a4445078f1d639a5dcb16ac@thread.v2	t	2026-04-03 15:04:21.130858+05:30	tenant-default
61	Test-grp	Update Webflow Pages with New Content and Design Changes	Implement the following updates across various pages on the Deep Group website: 1) Update banner titles on the Contact Us, FAQ, and CSR pages with the specified new titles. 2) Upload additional pictures to the Channel Partner and Career pages from the repository after all property pages are completed. 3) Adjust font sizing and capitalization on all job details pages and ensure form submissions send emails to specified addresses. 4) Revise the Vendor Registration page to include missing steps and improve content quality. 5) Increase blog content on the Insights page to extend read time to 4-5 minutes and ensure images are relevant. 6) Add one more news item to the News and PR page and update various titles as specified. 7) Enhance banners with abstract line drawings in dark gray and ensure consistent capitalization across all pages.	change_request	high	[]	["https://deep-group.webflow.io/contact-us", "https://deep-group.webflow.io/faq", "https://deep-group.webflow.io/why-deep-group", "https://deep-group.webflow.io/csr", "https://deep-group.webflow.io/channel-partner", "https://deep-group.webflow.io/career", "https://deep-group.webflow.io/vendor-registration", "https://deep-group.webflow.io/insights", "https://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad", "https://deep-group.webflow.io/news-pr", "https://deep-group.webflow.io/news-and-pr/deep-group-earns-most-reliable-builder-title-at-cnbc-bajar-awards"]	19:da0a2b138a4445078f1d639a5dcb16ac@thread.v2	t	2026-04-03 17:28:20.514019+05:30	tenant-default
62	Deep Website	Provide HD photos of Ixora sample house and available photos of Marigold	Nupur Patel requested HD photos of the Ixora sample house and available photos of Marigold. Additionally, for the Abode project, 3D images will be used as it is under construction. Access to 3Ds used for brochures is available, but sample house photos or any other photo shoot done are needed at the earliest possible time.	change_request	high	[]	[]	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	t	2026-04-06 15:00:48.03583+05:30	tenant-default
63	Test-grp	Update Footer	Update the footer as requested by Purvi Bhatia. Ensure that any necessary changes or additions are made to align with the current project requirements.	change_request	medium	[]	[]	19:da0a2b138a4445078f1d639a5dcb16ac@thread.v2	t	2026-04-07 12:48:25.854218+05:30	tenant-default
64	Test-grp	Update Footer with New Image	Update the footer of the website using the image provided by Purvi Bhatia. Ensure the changes align with the current project requirements and the new design specifications.	change_request	medium	[]	[]	19:da0a2b138a4445078f1d639a5dcb16ac@thread.v2	t	2026-04-07 12:59:38.236748+05:30	tenant-default
\.


--
-- Data for Name: whatsapp_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whatsapp_messages (id, sender, sender_phone, body, message_sid, "timestamp", media_urls, direction, forwarded_to_teams, forwarded_to_slack, forwarded_at, ai_category, ai_should_forward, ai_priority, ai_reason, created_at, dismissed, content_summary, action_required, urgency_indicators, group_name, edited_body, batch_scanned, tenant_id) FROM stdin;
428	Purvi Bhatia	120363407373609683@g.us	Looks good.\nBut can u remove the button on the right side?\n[Quoted: *From Appsrow*\nreview it.]	\N	2026-04-08 14:59:04.929+05:30	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775640543847_whatsapp_quoted_1775640543847.jpg"]	inbound	t	f	2026-04-08 14:59:22.573895+05:30	design_feedback	t	high	Client requested a design change to remove a button.	2026-04-08 14:59:04.930421+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
365	Purvi Bhatia	120363407373609683@g.us	Done.	\N	2026-04-02 14:51:59.749+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message 'Done.' lacks context for actionable task	2026-04-02 14:51:59.786986+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
379	Nupur Patel	120363422323456186@g.us	@79285230551278 has given rights to  webflowdev33@gmail.com to access Microsoft drive	\N	2026-04-03 10:33:07.763+05:30	[]	inbound	f	f	\N	irrelevant	f	low	The message is an informational update about access rights.	2026-04-03 10:33:07.89954+05:30	t	\N	\N	\N	Deep Website	\N	t	tenant-default
366	Purvi Bhatia	120363407373609683@g.us	Okay. Done.	\N	2026-04-02 14:55:45.139+05:30	[]	inbound	f	f	\N	client_approval	t	low	Client sent an approval message.	2026-04-02 14:55:45.203371+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
373	System (Teams Forward)	teams-forward	*From Appsrow*\nReplaced the map with images.\nAnd the images will change on scroll.	\N	2026-04-02 17:21:23.491+05:30	[]	outbound	f	f	\N	\N	\N	\N	\N	2026-04-02 17:21:23.492298+05:30	f	\N	\N	\N	Deep Website	\N	f	tenant-default
347	Purvi Bhatia	120363407373609683@g.us	Any update on this?	\N	2026-04-01 17:53:04.258+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message lacks context and does not specify a work-related task.	2026-04-01 17:53:04.330982+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
353	Purvi Bhatia	120363407373609683@g.us	As i mentioned, this is too dark. It looks good but too dark. Please make changes	\N	2026-04-01 18:26:44.958+05:30	[]	inbound	t	f	2026-04-01 18:26:48.632009+05:30	design_feedback	t	medium	Client is requesting a design change due to it being too dark.	2026-04-01 18:26:45.022163+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
359	Purvi Bhatia	120363407373609683@g.us	Approved	\N	2026-04-02 14:32:33.6+05:30	[]	inbound	t	f	2026-04-02 14:32:40.101929+05:30	client_approval	t	medium	Client sent an approval message.	2026-04-02 14:32:33.66327+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
393	Purvi Bhatia	120363407373609683@g.us	We do have them, and it should be the same in the new one.	\N	2026-04-03 12:45:34.484+05:30	[]	inbound	t	f	2026-04-03 12:45:38.094859+05:30	client_approval	t	medium	Client's message indicates approval or confirmation.	2026-04-03 12:45:34.58299+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
399	- Nirav	120363419263953302@g.us	Not available	\N	2026-04-03 19:00:51.209+05:30	[]	inbound	f	f	\N	irrelevant	f	low	The message 'Not available' does not provide actionable information or context.	2026-04-03 19:00:51.254243+05:30	f	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	t	tenant-default
392	Purvi Bhatia	120363407373609683@g.us	It was same	\N	2026-04-03 12:33:19.139+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-03 12:33:19.140248+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
380	Nupur Patel	120363422323456186@g.us	Ok. Let’s connect 12:30 everyday to finish this asap.	\N	2026-04-03 10:33:08.723+05:30	[]	inbound	f	f	\N	meeting_request	f	low	The message is a meeting scheduling request.	2026-04-03 10:33:08.725188+05:30	t	\N	\N	\N	Deep Website	\N	t	tenant-default
394	Purvi Bhatia	120363407373609683@g.us	Sure	\N	2026-04-03 12:46:19.79+05:30	[]	inbound	t	f	2026-04-03 12:46:22.663079+05:30	client_approval	t	medium	Client's 'Sure' is considered an approval message.	2026-04-03 12:46:19.792514+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
348	Purvi Bhatia	120363407373609683@g.us	Any update on this?	\N	2026-04-01 17:59:19.385+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message lacks context and does not specify a work-related task.	2026-04-01 17:59:19.387014+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
368	- Nirav	120363419263953302@g.us	awaiting links for review	\N	2026-04-02 15:06:19.979+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message is a status update without actionable content	2026-04-02 15:06:19.981506+05:30	f	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	t	tenant-default
367	Purvi Bhatia	120363407373609683@g.us	Approved	\N	2026-04-02 15:06:14.871+05:30	[]	inbound	t	f	2026-04-02 15:06:18.492179+05:30	client_approval	t	medium	The message is an approval from the client.	2026-04-02 15:06:14.872636+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
354	Purvi Bhatia	120363407373609683@g.us	Remove "buy again" button	\N	2026-04-01 18:28:03.774+05:30	["http://localhost:5000/temp/1775048283767_whatsapp_media.jpeg"]	inbound	t	f	2026-04-01 18:28:09.865132+05:30	change_request	t	medium	Client requested a change on the website.	2026-04-01 18:28:03.838827+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
374	System (Teams Forward)	teams-forward	*From Appsrow*\nreview it.	\N	2026-04-02 17:52:07.48+05:30	[]	outbound	f	f	\N	\N	\N	\N	\N	2026-04-02 17:52:07.480845+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
360	- Nirav	120363419263953302@g.us	9999	\N	2026-04-02 14:34:31.581+05:30	[]	inbound	f	f	\N	irrelevant	f	low	The message '9999' is not a work-related task or request.	2026-04-02 14:34:31.631546+05:30	f	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	t	tenant-default
401	Nupur Patel	120363422323456186@g.us	For @abode we will use 3D as it is under construction	\N	2026-04-06 14:56:02.895+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:02.909817+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
416	- Nirav	120363419263953302@g.us	Okay let me check	\N	2026-04-06 16:03:12.814+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 16:03:12.816087+05:30	f	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	t	tenant-default
387	Purvi Bhatia	120363407373609683@g.us	Ok	\N	2026-04-03 12:13:39.315+05:30	[]	inbound	t	f	2026-04-03 12:13:43.256059+05:30	client_approval	t	low	Short positive response from client is considered an approval.	2026-04-03 12:13:39.32201+05:30	t	\N	\N	\N	Test-grp	\N	f	tenant-default
422	Purvi Bhatia	120363407373609683@g.us	Do it asap	\N	2026-04-07 13:16:04.924+05:30	[]	inbound	t	f	2026-04-07 13:16:10.485809+05:30	change_request	t	high	Client requests an urgent update to the footer.	2026-04-07 13:16:04.925156+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
417	MAYUR SINGH	120363422323456186@g.us	Yes i will show them in tomorrow meeting.	\N	2026-04-06 18:16:27.576+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 18:16:27.577463+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
423	Purvi Bhatia	120363407373609683@g.us	Remove this page	\N	2026-04-07 13:24:50.907+05:30	[]	inbound	t	f	2026-04-07 13:25:04.374522+05:30	change_request	t	high	The message contains a direct request to remove a page.	2026-04-07 13:24:51.177452+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
362	Purvi Bhatia	120363407373609683@g.us	Done.	\N	2026-04-02 14:43:55.561+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message lacks context to determine if it's an approval or task.	2026-04-02 14:43:55.600145+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
396	Purvi Bhatia	120363407373609683@g.us	Sure	\N	2026-04-03 15:00:51.938+05:30	[]	inbound	f	f	\N	irrelevant	f	low	The message is a casual acknowledgment without context of approving work.	2026-04-03 15:00:51.939168+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
344	Purvi Bhatia	120363407373609683@g.us	Done: Contact-us : https://deep-group.webflow.io/contact-us\n\n- Update. Banner creative title from “Let’s connect to shape your new space”  to. “Let’s Connect to Find Your New Space” \n\nDone: Faq : https://deep-group.webflow.io/faq\n\n- Update. Banner creative title from “Frequently Asked Questions” to “We’re Here to Answer Every Question You Have”\n\nDone: Why deep group: https://deep-group.webflow.io/why-deep-group\n\nCsr: https://deep-group.webflow.io/csr\n\n- Change “Giving Back to Society” to “Corporate Social Responsibility”\n- Change “CSR” to “Giving Back to Society” to “Committed to Building Communities—Beyond Construction”\n- In red section below Change : “Corporate Social Responsibility” to “Turning Responsibility into Action for Sustainable Living and Stronger Communities”\nchannel partner: https://deep-group.webflow.io/channel-partner\n\n- Need to upload more pictures from repository - but can be done after all property pages are done.\n- \nCareer : https://deep-group.webflow.io/career\n\n - Need to update pictures from repository - \n\nDone:https://deep-group.webflow.io/career/project-manager\n\n- Need work on font sizing and capitalizations. For all job details pages.\n- Check if forms are working fine for all jobs posted. After submission email should go to info@deepgroup1980.com and nupur@ncubit.com.\n\nVendor Registration: https://deep-group.webflow.io/vendor-registration\n\n   - there were steps mentioned here in red section. I do not see. them. Also content requires lot of work. Titles are repetitive.\n   - check form submission should send all information via email to info@deepgroup1980.com and nupur@ncubit.com.\n\nInsights: https://deep-group.webflow.io/insights\n\n- Design is ok. \n- Content all blogs are. 1 min read need to keep more content for read time increases to 4- 5 min.\n- Images needs to be very relevant. \n- \nhttps://deep-group.webflow.io/post/best-residential-areas-for-2-3-bhk-apartments-in-ahmedabad\n\n- Blog content is very less just bullet points and need to link relevant project/property. Pages which are in. This area.\n\nNews And Pr: https://deep-group.webflow.io/news-pr\n\n- Need to keep one more news. \n- Change title “Public Announcements” to “ News and Press Releases”\n- Change “News & PR” to “Our Recognitions, Media Coverage & Announcements”\n- Change “Built Transparency” to “Real Estate News & Project Updates” \n- Change “News & Updates” to “Shaping Headlines. Building Trust.”\n\nhttps://deep-group.webflow.io/news-and-pr/deep-group-earns-most-reliable-builder-title-at-cnbc-bajar-awards\n \n- done\n- \n\nIn General feedbacK:\n- Banners look very simple.  Can we add some relevant and abstract line drawing in little dark gray color on banners. Or. something else you suggest. \n- Make sure your have proper capitalization on pages. Some titles are in sentence case where some have each letter capitalized. Let’s follow a same pattern on all titles and banners and throughout the pages.	\N	2026-04-01 17:10:05.058+05:30	[]	inbound	f	f	\N	system	f	low	Analysis failed: Unterminated string in JSON at position 779 (line 18 column 73)	2026-04-01 17:10:05.137176+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
381	Purvi Bhatia	120363407373609683@g.us	Hi,\n\nI’m sharing the task optimization sheet with you:\n\nhttps://docs.google.com/spreadsheets/d/1xoUAQd-HSev178TkPmNPiPQFAAmDK77P/edit?usp=sharing&ouid=106624485558868125872&rtpof=true&sd=true\n\nPlease review it and make the necessary updates/changes to improve task optimization. Let me know if anything needs clarification or if you have suggestions.	\N	2026-04-03 11:21:05.841+05:30	[]	inbound	t	f	2026-04-03 11:21:10.2682+05:30	link_share	t	medium	Client shared a Google Sheets link for task optimization review.	2026-04-03 11:21:05.951623+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
395	Prachi!	120363419872282324@g.us	Okay	\N	2026-04-03 13:02:33.915+05:30	[]	inbound	t	f	2026-04-03 13:02:38.5746+05:30	client_approval	t	low	Short positive response from client is considered an approval.	2026-04-03 13:02:33.916635+05:30	f	\N	\N	\N	Avishkar Branding	\N	f	tenant-default
369	Purvi Bhatia	120363407373609683@g.us	Updated?	\N	2026-04-02 15:18:20.702+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message is too vague to determine action or context.	2026-04-02 15:18:20.702941+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
349	Purvi Bhatia	120363407373609683@g.us	Have u worked on this?	\N	2026-04-01 18:02:47.944+05:30	[]	inbound	f	f	\N	irrelevant	f	low	The message is vague and does not specify any actionable work task.	2026-04-01 18:02:48.012429+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
375	System (Teams Forward)	teams-forward	*From Appsrow*\nreview it.	\N	2026-04-02 18:11:34.201+05:30	[]	outbound	f	f	\N	\N	\N	\N	\N	2026-04-02 18:11:34.202161+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
355	Nupur Patel	120363422323456186@g.us	can we connect today?	\N	2026-04-02 11:24:12.408+05:30	[]	inbound	f	f	\N	greeting	f	low	Skipped: greeting/meeting: "can we connect today?"	2026-04-02 11:24:12.409244+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
361	Purvi Bhatia	120363407373609683@g.us	Let's do with it.	\N	2026-04-02 14:37:26.05+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message lacks context and does not indicate a work task	2026-04-02 14:37:26.051313+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
388	Purvi Bhatia	120363407373609683@g.us	Sure	\N	2026-04-03 12:15:01.648+05:30	[]	inbound	t	f	2026-04-03 12:15:04.575608+05:30	client_approval	t	medium	The message 'Sure' is considered an approval.	2026-04-03 12:15:01.707865+05:30	t	\N	\N	\N	Test-grp	\N	f	tenant-default
406	- Nirav	120363419263953302@g.us	Yes we can do 3:30PM	\N	2026-04-06 14:56:06.283+05:30	[]	inbound	t	f	2026-04-06 14:56:22.604397+05:30	meeting_request	t	medium	The message confirms a meeting time to review completed work and ongoing tasks.	2026-04-06 14:56:06.296676+05:30	f	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	f	tenant-default
412	Vandit Joshi 💫	120363422323456186@g.us	@9543534796905 have upload 4BHK Sample House for Marigold in Onedrive Link	\N	2026-04-06 14:56:07.517+05:30	[]	inbound	t	f	2026-04-06 14:56:30.568149+05:30	file_share	t	medium	Photos for Ixora and Marigold sample houses have been uploaded to OneDrive.	2026-04-06 14:56:07.530999+05:30	f	\N	\N	\N	Deep Website	\N	f	tenant-default
400	Nupur Patel	120363422323456186@g.us	@218386235654275 , pls provide HD photos of Ixora sample house\n@79285230551278 , pls provide available photos of Marigold	\N	2026-04-06 14:56:02.894+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:02.908851+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
383	Purvi Bhatia	120363407373609683@g.us	For the AI Trust Certificate Program.  Please make the following three pages visible without login and add stripe payment after Module2.  These are the ones that should be visible.  Do not create a new landing page :  1. Dashboard  https://trust-certificate-program.teachery.co/dashboard; and 2. Module 1 https://trust-certificate-program.teachery.co/lessons/module-1; and 3.  Module 2. https://trust-certificate-program.teachery.co/lessons/module-2	\N	2026-04-03 11:21:06.865+05:30	[]	inbound	t	f	2026-04-03 11:21:10.476301+05:30	change_request	t	high	Client is requesting changes to website visibility and payment integration.	2026-04-03 11:21:06.866898+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
370	Purvi Bhatia	120363407373609683@g.us	Did u check this?\nAll the images are here.	\N	2026-04-02 15:34:05.823+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message lacks context and does not meet forwarding criteria.	2026-04-02 15:34:05.834018+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
350	Purvi Bhatia	120363407373609683@g.us	Worl on this asap	\N	2026-04-01 18:04:11.529+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message is unclear and lacks specific actionable request.	2026-04-01 18:04:11.592551+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
376	System (Teams Forward)	teams-forward	*From Appsrow*\ncheck it.	\N	2026-04-02 18:21:09.217+05:30	[]	outbound	f	f	\N	\N	\N	\N	\N	2026-04-02 18:21:09.218279+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
356	Nupur Patel	120363422323456186@g.us	I am available now till 1:30	\N	2026-04-02 11:24:12.409+05:30	[]	inbound	f	f	\N	meeting_request	f	low	The message is about scheduling availability, not a work task.	2026-04-02 11:24:12.469465+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
382	Purvi Bhatia	120363407373609683@g.us	Please delete this page entirely https://trust-certificate-program.teachery.co/global-data-innovation-peach	\N	2026-04-03 11:21:06.537+05:30	[]	inbound	t	f	2026-04-03 11:21:09.919094+05:30	change_request	t	high	Client is requesting a page deletion on the website.	2026-04-03 11:21:06.538643+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
407	Vandit Joshi 💫	120363422323456186@g.us	@9543534796905 HAVE UPLOADED PHOTOS FOR IXORA SAMPLE IN ONEDRIVE LINK.	\N	2026-04-06 14:56:06.946+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:06.959589+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
389	Purvi Bhatia	120363407373609683@g.us	Sure	\N	2026-04-03 12:20:44.087+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-03 12:20:44.162694+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
408	Nupur Patel	120363422323456186@g.us	Ok thanks	\N	2026-04-06 14:56:06.981+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:06.995177+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
409	MAYUR SINGH	120363422323456186@g.us	Hey @9543534796905 \nPlease join using this link\n\nhttps://meet.google.com/nfq-bcfx-gpz	\N	2026-04-06 14:56:07.032+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:07.045889+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
410	MAYUR SINGH	120363422323456186@g.us	Hello @9543534796905 \nAre you joining ?	\N	2026-04-06 14:56:07.365+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:07.378892+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
411	Nupur Patel	120363422323456186@g.us	Joining in 5 min	\N	2026-04-06 14:56:07.441+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:07.455119+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
418	MAYUR SINGH	120363422323456186@g.us	Okay	\N	2026-04-06 18:17:44.588+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 18:17:44.588993+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
424	Purvi Bhatia	120363407373609683@g.us	Do these asap	\N	2026-04-07 14:11:04.106+05:30	[]	inbound	t	f	2026-04-07 14:11:18.166317+05:30	change_request	t	high	The message contains urgent actionable tasks that need immediate attention.	2026-04-07 14:11:04.108038+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
377	Purvi Bhatia	120363407373609683@g.us	Remove the images from background. I'll provide you our real workers images	\N	2026-04-02 18:22:45.359+05:30	["http://localhost:5000/temp/1775134365345_whatsapp_media.jpeg"]	inbound	t	f	2026-04-02 18:22:54.531522+05:30	change_request	t	medium	Client requests to remove background images and will provide new images.	2026-04-02 18:22:45.447276+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
363	Purvi Bhatia	120363407373609683@g.us	Looks cool	\N	2026-04-02 14:47:14.041+05:30	[]	inbound	t	f	2026-04-02 14:47:18.124817+05:30	client_approval	t	low	Client sent an approval message 'Looks cool'.	2026-04-02 14:47:14.042126+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
351	Purvi Bhatia	120363407373609683@g.us	Make the changes asap	\N	2026-04-01 18:09:54.616+05:30	[]	inbound	t	f	2026-04-01 18:09:56.560803+05:30	change_request	t	high	Client is requesting changes to be made urgently.	2026-04-01 18:09:54.711742+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
371	Purvi Bhatia	120363407373609683@g.us	Also, what's the update here?	\N	2026-04-02 15:42:05.523+05:30	[]	inbound	f	f	\N	project_update	t	medium	Client is asking for an update on the project.	2026-04-02 15:42:05.599731+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
364	Purvi Bhatia	120363407373609683@g.us	Let's do with it.	\N	2026-04-02 14:51:11.886+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message lacks context and does not indicate a work task	2026-04-02 14:51:11.944529+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
378	Nupur Patel	120363422323456186@g.us	Hi! Can you use project images from google drive - Deep Central > Project Details folder as well as this additional folder:\nhttps://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy81ZWU0ZDhlODc4NjU5ZTkwL0lnQ1FubVY0Nk5qa0lJQmVhQ2dBQUFBQUFZVDYwR1NUOWpKQ3pCR1N2WnJSOVhB&id=5EE4D8E878659E90%2110344&cid=5EE4D8E878659E90&sb=name&sd=1\n\nSecond folder has latest images on Saptak and Shivanta and many other projects.. kindly use those images	\N	2026-04-03 10:33:07.762+05:30	[]	inbound	t	f	2026-04-03 10:33:15.114265+05:30	link_share	t	medium	Client provided a link to additional project images for use.	2026-04-03 10:33:07.763628+05:30	t	\N	\N	\N	Deep Website	\N	t	tenant-default
386	Nupur Patel	120363422323456186@g.us	Ok	\N	2026-04-03 11:48:49.686+05:30	[]	inbound	t	f	2026-04-03 11:48:51.812001+05:30	client_approval	t	low	Short positive response from client is considered an approval.	2026-04-03 11:48:49.842183+05:30	t	\N	\N	\N	Deep Website	\N	f	tenant-default
415	Nupur Patel	120363422323456186@g.us	For residential project- related projects has to be residential..	\N	2026-04-06 15:33:28.822+05:30	[]	inbound	t	f	2026-04-06 15:33:41.510163+05:30	design_feedback	t	medium	Nupur Patel is requesting to see other design options for a residential project.	2026-04-06 15:33:28.883699+05:30	f	\N	\N	\N	Deep Website	\N	f	tenant-default
421	Purvi Bhatia	120363407373609683@g.us	Place "ME" after My Teams	\N	2026-04-07 13:15:26.457+05:30	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775547925557_whatsapp_1775547925555.jpg"]	inbound	t	f	2026-04-07 13:15:38.174969+05:30	change_request	t	medium	Request to update the footer order in the app interface.	2026-04-07 13:15:26.539707+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
405	MAYUR SINGH	120363419263953302@g.us	Hello @274409873006660\n\nApologies for the delayed response. \nWe’ve completed all the 3D elements and made them responsive across all pages. Currently, we’re working on the responsive version of the problem–solution section.\nIf you’re available, let’s connect at 3:30 PM today so I can walk you through everything we’ve done.\n\nThank you!	\N	2026-04-06 14:56:06.142+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:06.155754+05:30	f	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	t	tenant-default
402	Nupur Patel	120363422323456186@g.us	.we have access to 3Ds used for brochures but we need sample house photos or any other photo shoot done. Kindly provide at earliest possible time.	\N	2026-04-06 14:56:02.936+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:02.950702+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
403	Vandit Joshi 💫	120363422323456186@g.us	Ok	\N	2026-04-06 14:56:03.493+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:03.507115+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
404	Unknown	120363422323456186@g.us	Ok	\N	2026-04-06 14:56:03.832+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-06 14:56:03.846021+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
352	Purvi Bhatia	120363407373609683@g.us	Remove "buy again" button	\N	2026-04-01 18:16:42.455+05:30	[]	inbound	t	f	2026-04-01 18:16:47.320519+05:30	change_request	t	medium	Client requested a change on the website.	2026-04-01 18:16:42.558855+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
372	Purvi Bhatia	120363407373609683@g.us	So this is the new template for all persona-pages. Can you help redesign the two landing pages we created previously?\n\nCleaning and janitorial\nGeneral contractors\n\nThey should follow the exact same template. Just swap out the copy + images.\nFeel free to push this one live in the meantime: https://www.figma.com/proto/HpBZRdBAU5mAGCwVzdtetl/Buildbite?node-id=4038-2264&view[…]PE4h-1&scalin…\nIt should be linked under 'who it's for' with the name "Home builders"	\N	2026-04-02 15:55:22.656+05:30	[]	inbound	t	f	2026-04-02 15:55:26.850294+05:30	change_request	t	high	Client requests redesign of landing pages using a new template.	2026-04-02 15:55:22.735473+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
358	Purvi Bhatia	120363407373609683@g.us	Cool, please go ahead.	\N	2026-04-02 14:19:15.487+05:30	[]	inbound	t	f	2026-04-02 14:19:21.963111+05:30	client_approval	t	medium	Client approval message received.	2026-04-02 14:19:15.488285+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
391	Purvi Bhatia	120363407373609683@g.us	Sure	\N	2026-04-03 12:32:21.918+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-03 12:32:21.96378+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
397	Purvi Bhatia	120363407373609683@g.us	Will send you after 5.	\N	2026-04-03 15:01:25.32+05:30	[]	inbound	f	f	\N	irrelevant	f	low	The message is a casual response indicating a future action, not a request or approval.	2026-04-03 15:01:25.321776+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
357	Nupur Patel	120363422323456186@g.us	Ok	\N	2026-04-02 12:06:39.6+05:30	[]	inbound	f	f	\N	greeting	f	low	Skipped: greeting/meeting: "Ok"	2026-04-02 12:06:39.602753+05:30	f	\N	\N	\N	Deep Website	\N	t	tenant-default
345	Purvi Bhatia	120363407373609683@g.us	https://docs.google.com/document/d/1R9kTZKX4tduPm5ZN1Se2g9HSLqsox8ULHBIGOvzQ2vs/edit?usp=drive_link	\N	2026-04-01 17:27:27.639+05:30	[]	inbound	t	f	2026-04-01 17:27:30.219135+05:30	link_share	t	medium	The message contains a Google Drive link which may be project-related.	2026-04-01 17:27:27.713532+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
413	MAYUR SINGH	120363419263953302@g.us	@274409873006660\nJoin using this link\n\nhttps://meet.google.com/igj-ogzj-gju	\N	2026-04-06 15:27:34.843+05:30	[]	inbound	t	f	2026-04-06 15:27:50.038059+05:30	meeting_request	t	medium	Meeting link provided for a scheduled walkthrough of completed work.	2026-04-06 15:27:34.88671+05:30	f	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	f	tenant-default
419	Purvi Bhatia	120363407373609683@g.us	also update the footer.	\N	2026-04-07 12:44:03.828+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-07 12:44:03.891862+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
390	Purvi Bhatia	120363407373609683@g.us	Sure	\N	2026-04-03 12:20:58.76+05:30	[]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-03 12:20:58.833958+05:30	t	\N	\N	\N	Test-grp	\N	t	tenant-default
384	MAYUR SINGH	120363422323456186@g.us	@9543534796905 \nAs per our discussion we will connect on monday for further update.	\N	2026-04-03 11:37:46.268+05:30	[]	inbound	f	f	\N	meeting_request	f	low	Message is about scheduling a meeting, not a task or approval.	2026-04-03 11:37:46.328804+05:30	t	\N	\N	\N	Deep Website	\N	t	tenant-default
425	MAYUR SINGH	120363422323456186@g.us	@9543534796905 please check	\N	2026-04-07 16:35:27.816+05:30	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775559925750_whatsapp_1775559925749.jpg"]	inbound	t	f	2026-04-07 16:35:48.245202+05:30	design_feedback	t	medium	Request to check the design image for feedback.	2026-04-07 16:35:27.889362+05:30	f	\N	\N	\N	Deep Website	\N	f	tenant-default
398	Purvi Bhatia	120363407373609683@g.us	Okay	\N	2026-04-03 15:15:35.677+05:30	[]	inbound	f	f	\N	irrelevant	f	low	The message is a casual acknowledgment without context of approving work or designs.	2026-04-03 15:15:35.799614+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
346	Purvi Bhatia	120363407373609683@g.us	Above is content for 2 News posts - I have included 2 awards as news and I. will add third as soon as I get images for relevant one...	\N	2026-04-01 17:27:28.799+05:30	[]	inbound	f	f	\N	irrelevant	f	low	Message does not contain a specific work task or actionable request.	2026-04-01 17:27:28.800863+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
385	- Nirav	120363419263953302@g.us	ok	\N	2026-04-03 11:40:28.682+05:30	[]	inbound	t	f	2026-04-03 11:40:35.550228+05:30	client_approval	t	low	Short positive response from client is considered approval.	2026-04-03 11:40:28.724075+05:30	t	\N	\N	\N	Sellers Umbrella - MXP Webflow Development	\N	f	tenant-default
414	Nupur Patel	120363422323456186@g.us	What were the other design options you showcased? Can I see them again?	\N	2026-04-06 15:29:29.424+05:30	["http://localhost:5000/temp/1775469569414_whatsapp_media.jpeg"]	inbound	t	f	2026-04-06 15:29:42.803079+05:30	system	t	low	Analysis failed: 400 Error while downloading http://localhost:5000/temp/1775469569414_whatsapp_me	2026-04-06 15:29:29.46823+05:30	f	\N	\N	\N	Deep Website	\N	f	tenant-default
420	Purvi Bhatia	120363407373609683@g.us	footer change in this image	\N	2026-04-07 12:49:12.093+05:30	["https://jukmaikkuypbefzxljdw.supabase.co/storage/v1/object/public/openclaw-media/message-images/1775546350747_whatsapp_quoted_1775546350745.jpg"]	inbound	f	f	\N	\N	\N	\N	\N	2026-04-07 12:49:12.095173+05:30	f	\N	\N	\N	Test-grp	\N	t	tenant-default
426	Purvi Bhatia	120363407373609683@g.us	And do the same in module 7.	\N	2026-04-08 14:51:51.221+05:30	[]	inbound	t	f	2026-04-08 14:52:06.518604+05:30	change_request	t	high	The message contains a specific task to update module 7, which is actionable.	2026-04-08 14:51:51.357706+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
427	Purvi Bhatia	120363407373609683@g.us	Do same in module 1	\N	2026-04-08 14:57:59.314+05:30	[]	inbound	t	f	2026-04-08 14:58:12.333178+05:30	change_request	t	high	The message contains a specific task to replicate changes in module 1.	2026-04-08 14:57:59.315231+05:30	f	\N	\N	\N	Test-grp	\N	f	tenant-default
\.


--
-- Name: action_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.action_logs_id_seq', 1, false);


--
-- Name: ai_drafts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_drafts_id_seq', 21, true);


--
-- Name: channel_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.channel_mappings_id_seq', 26, true);


--
-- Name: channel_summaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.channel_summaries_id_seq', 436, true);


--
-- Name: client_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.client_history_id_seq', 15, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, false);


--
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);


--
-- Name: drafts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.drafts_id_seq', 1, false);


--
-- Name: forward_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.forward_logs_id_seq', 105, true);


--
-- Name: incoming_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.incoming_messages_id_seq', 83, true);


--
-- Name: message_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_logs_id_seq', 1, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: slack_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.slack_messages_id_seq', 63, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 102, true);


--
-- Name: teams_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teams_conversations_id_seq', 16, true);


--
-- Name: teams_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teams_messages_id_seq', 542, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: whatsapp_batch_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_batch_tasks_id_seq', 64, true);


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_messages_id_seq', 428, true);


--
-- Name: action_logs action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_drafts ai_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_pkey PRIMARY KEY (id);


--
-- Name: channel_mappings channel_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_mappings
    ADD CONSTRAINT channel_mappings_pkey PRIMARY KEY (id);


--
-- Name: channel_mappings channel_mappings_teams_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_mappings
    ADD CONSTRAINT channel_mappings_teams_chat_id_key UNIQUE (teams_chat_id);


--
-- Name: channel_summaries channel_summaries_channel_id_source_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_summaries
    ADD CONSTRAINT channel_summaries_channel_id_source_key UNIQUE (channel_id, source);


--
-- Name: channel_summaries channel_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_summaries
    ADD CONSTRAINT channel_summaries_pkey PRIMARY KEY (id);


--
-- Name: client_history client_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_history
    ADD CONSTRAINT client_history_pkey PRIMARY KEY (id);


--
-- Name: client_history client_history_source_group_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_history
    ADD CONSTRAINT client_history_source_group_id_key UNIQUE (source, group_id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: drafts drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_pkey PRIMARY KEY (id);


--
-- Name: forward_logs forward_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forward_logs
    ADD CONSTRAINT forward_logs_pkey PRIMARY KEY (id);


--
-- Name: incoming_messages incoming_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incoming_messages
    ADD CONSTRAINT incoming_messages_pkey PRIMARY KEY (id);


--
-- Name: message_logs message_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: slack_messages slack_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slack_messages
    ADD CONSTRAINT slack_messages_pkey PRIMARY KEY (id);


--
-- Name: slack_messages slack_messages_ts_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slack_messages
    ADD CONSTRAINT slack_messages_ts_key UNIQUE (ts);


--
-- Name: slack_threads slack_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slack_threads
    ADD CONSTRAINT slack_threads_pkey PRIMARY KEY (thread_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: teams_conversations teams_conversations_conversation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_conversations
    ADD CONSTRAINT teams_conversations_conversation_id_key UNIQUE (conversation_id);


--
-- Name: teams_conversations teams_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_conversations
    ADD CONSTRAINT teams_conversations_pkey PRIMARY KEY (id);


--
-- Name: teams_messages teams_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams_messages
    ADD CONSTRAINT teams_messages_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_batch_tasks whatsapp_batch_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_batch_tasks
    ADD CONSTRAINT whatsapp_batch_tasks_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_messages whatsapp_messages_message_sid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_message_sid_key UNIQUE (message_sid);


--
-- Name: whatsapp_messages whatsapp_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages
    ADD CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id);


--
-- Name: idx_channel_mappings_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_mappings_tenant_id ON public.channel_mappings USING btree (tenant_id);


--
-- Name: idx_channel_mappings_whatsapp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_mappings_whatsapp ON public.channel_mappings USING btree (whatsapp_number);


--
-- Name: idx_client_history_tenant_source_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_history_tenant_source_group ON public.client_history USING btree (tenant_id, source, group_id);


--
-- Name: idx_drafts_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drafts_message_id ON public.drafts USING btree (message_id);


--
-- Name: idx_drafts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drafts_status ON public.drafts USING btree (status);


--
-- Name: idx_forward_logs_tenant_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forward_logs_tenant_id_status ON public.forward_logs USING btree (tenant_id, status);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_dismissed ON public.messages USING btree (dismissed);


--
-- Name: idx_messages_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_source ON public.messages USING btree (source);


--
-- Name: idx_slack_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slack_dismissed ON public.slack_messages USING btree (dismissed);


--
-- Name: idx_slack_messages_tenant_id_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slack_messages_tenant_id_ts ON public.slack_messages USING btree (tenant_id, "timestamp" DESC);


--
-- Name: idx_slack_threads_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slack_threads_tenant_id ON public.slack_threads USING btree (tenant_id);


--
-- Name: idx_tasks_tenant_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_tenant_activity ON public.tasks USING btree (tenant_id, teams_activity_id);


--
-- Name: idx_tasks_tenant_id_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_tenant_id_created ON public.tasks USING btree (tenant_id, created_at DESC);


--
-- Name: idx_tasks_tenant_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_tenant_status_created ON public.tasks USING btree (tenant_id, status, created_at);


--
-- Name: idx_teams_conversations_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_conversations_tenant_id ON public.teams_conversations USING btree (tenant_id);


--
-- Name: idx_teams_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_dismissed ON public.teams_messages USING btree (dismissed);


--
-- Name: idx_teams_messages_tenant_id_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_messages_tenant_id_ts ON public.teams_messages USING btree (tenant_id, "timestamp" DESC);


--
-- Name: idx_teams_messages_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_teams_messages_unique ON public.teams_messages USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_teams_msg_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_teams_msg_unique ON public.teams_messages USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: idx_whatsapp_ai_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_ai_priority ON public.whatsapp_messages USING btree (ai_priority);


--
-- Name: idx_whatsapp_ai_should_forward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_ai_should_forward ON public.whatsapp_messages USING btree (ai_should_forward);


--
-- Name: idx_whatsapp_batch_tasks_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_batch_tasks_tenant_id ON public.whatsapp_batch_tasks USING btree (tenant_id);


--
-- Name: idx_whatsapp_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_direction ON public.whatsapp_messages USING btree (direction);


--
-- Name: idx_whatsapp_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_dismissed ON public.whatsapp_messages USING btree (dismissed);


--
-- Name: idx_whatsapp_group_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_group_name ON public.whatsapp_messages USING btree (group_name);


--
-- Name: idx_whatsapp_messages_tenant_id_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_messages_tenant_id_ts ON public.whatsapp_messages USING btree (tenant_id, "timestamp" DESC);


--
-- Name: idx_whatsapp_sender_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_sender_phone ON public.whatsapp_messages USING btree (sender_phone);


--
-- Name: idx_whatsapp_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_timestamp ON public.whatsapp_messages USING btree ("timestamp" DESC);


--
-- Name: action_logs action_logs_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.drafts(id) ON DELETE SET NULL;


--
-- Name: action_logs action_logs_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_logs
    ADD CONSTRAINT action_logs_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: ai_drafts ai_drafts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: ai_drafts ai_drafts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts
    ADD CONSTRAINT ai_drafts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.incoming_messages(id) ON DELETE CASCADE;


--
-- Name: drafts drafts_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: incoming_messages incoming_messages_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incoming_messages
    ADD CONSTRAINT incoming_messages_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: message_logs message_logs_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs
    ADD CONSTRAINT message_logs_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.ai_drafts(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict cAefFhjC146s6YL9wy6isOrWUXdWpscd2U414eIcpRY1vlyj3bgoHJsVz6rjIoB

