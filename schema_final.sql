--
-- PostgreSQL database dump
--


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
-- Name: ai_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ai_drafts (
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

CREATE TABLE IF NOT EXISTS public.channel_mappings (
    id integer NOT NULL,
    teams_chat_id text NOT NULL,
    teams_chat_name text NOT NULL,
    slack_channel_id text NOT NULL,
    slack_channel_name text NOT NULL,
    project_name text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    whatsapp_number character varying(50),
    whatsapp_numbers text[] DEFAULT '{}'::text[]
);


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
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.clients (
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

CREATE TABLE IF NOT EXISTS public.contacts (
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
-- Name: incoming_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.incoming_messages (
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

CREATE TABLE IF NOT EXISTS public.message_logs (
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
-- Name: slack_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.slack_messages (
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
    edited_body text
);


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
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tasks (
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
    updated_at timestamp with time zone DEFAULT now()
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

CREATE TABLE IF NOT EXISTS public.teams_conversations (
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

CREATE TABLE IF NOT EXISTS public.teams_messages (
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
    dismissed boolean DEFAULT false
);


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
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.users (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'manager'::character varying,
    department character varying(100),
    teams_display_name character varying(255),
    created_at timestamp with time zone DEFAULT now()
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
-- Name: whatsapp_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
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
    CONSTRAINT whatsapp_messages_direction_check CHECK (((direction)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])))
);


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
-- Name: ai_drafts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_drafts ALTER COLUMN id SET DEFAULT nextval('public.ai_drafts_id_seq'::regclass);


--
-- Name: channel_mappings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_mappings ALTER COLUMN id SET DEFAULT nextval('public.channel_mappings_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: incoming_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incoming_messages ALTER COLUMN id SET DEFAULT nextval('public.incoming_messages_id_seq'::regclass);


--
-- Name: message_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_logs ALTER COLUMN id SET DEFAULT nextval('public.message_logs_id_seq'::regclass);


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
-- Name: whatsapp_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_messages ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_messages_id_seq'::regclass);


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
-- Name: idx_channel_mappings_whatsapp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_mappings_whatsapp ON public.channel_mappings USING btree (whatsapp_number);


--
-- Name: idx_slack_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slack_dismissed ON public.slack_messages USING btree (dismissed);


--
-- Name: idx_teams_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_dismissed ON public.teams_messages USING btree (dismissed);


--
-- Name: idx_teams_messages_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_teams_messages_unique ON public.teams_messages USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_teams_msg_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_teams_msg_unique ON public.teams_messages USING btree (message_id) WHERE (message_id IS NOT NULL);


--
-- Name: idx_whatsapp_ai_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_ai_priority ON public.whatsapp_messages USING btree (ai_priority);


--
-- Name: idx_whatsapp_ai_should_forward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_ai_should_forward ON public.whatsapp_messages USING btree (ai_should_forward);


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
-- Name: idx_whatsapp_sender_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_sender_phone ON public.whatsapp_messages USING btree (sender_phone);


--
-- Name: idx_whatsapp_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_timestamp ON public.whatsapp_messages USING btree ("timestamp" DESC);


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


