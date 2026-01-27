--
-- PostgreSQL database dump
--

\restrict wBTBqtTeTa7gUOBsIhc1ywQWEAg8BQ1yA4xEqGDD2SCfo1oaNHkcM1Cm7d2Dld6

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: GrupoRepense; Type: TYPE; Schema: public; Owner: repense_user
--

CREATE TYPE public."GrupoRepense" AS ENUM (
    'Igreja',
    'Espiritualidade',
    'Evangelho'
);


ALTER TYPE public."GrupoRepense" OWNER TO repense_user;

--
-- Name: ModeloCurso; Type: TYPE; Schema: public; Owner: repense_user
--

CREATE TYPE public."ModeloCurso" AS ENUM (
    'online',
    'presencial'
);


ALTER TYPE public."ModeloCurso" OWNER TO repense_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    session_id text NOT NULL,
    student_id text NOT NULL,
    presente boolean DEFAULT true NOT NULL,
    observacao text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lida_em timestamp(3) without time zone,
    lida_por_admin boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Attendance" OWNER TO repense_user;

--
-- Name: Class; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public."Class" (
    id text NOT NULL,
    notion_id text,
    grupo_repense public."GrupoRepense" NOT NULL,
    modelo public."ModeloCurso" NOT NULL,
    capacidade integer NOT NULL,
    numero_inscritos integer DEFAULT 0 NOT NULL,
    eh_ativo boolean DEFAULT true NOT NULL,
    eh_16h boolean DEFAULT false NOT NULL,
    link_whatsapp text,
    data_inicio timestamp(3) without time zone,
    horario text,
    eh_mulheres boolean DEFAULT false NOT NULL,
    eh_itu boolean DEFAULT false NOT NULL,
    teacher_id text,
    numero_sessoes integer DEFAULT 8 NOT NULL,
    atualizado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    arquivada boolean DEFAULT false,
    final_report text,
    final_report_em timestamp without time zone,
    cidade character varying(255) DEFAULT 'Indaiatuba'::character varying,
    CONSTRAINT "Class_capacidade_check" CHECK ((numero_inscritos <= capacidade))
);


ALTER TABLE public."Class" OWNER TO repense_user;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    class_id text NOT NULL,
    numero_sessao integer NOT NULL,
    data_sessao timestamp(3) without time zone NOT NULL,
    relatorio text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Session" OWNER TO repense_user;

--
-- Name: Teacher; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public."Teacher" (
    id text NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    telefone text NOT NULL,
    eh_ativo boolean DEFAULT true NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Teacher" OWNER TO repense_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO repense_user;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public.admins (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL
);


ALTER TABLE public.admins OWNER TO repense_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    event_type text NOT NULL,
    actor_id text,
    actor_type text,
    target_entity text,
    target_id text,
    action text,
    metadata jsonb,
    ip_address text,
    user_agent text,
    status text DEFAULT 'success'::text NOT NULL,
    error_message text,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO repense_user;

--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public.enrollments (
    id text NOT NULL,
    student_id text NOT NULL,
    class_id text NOT NULL,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text DEFAULT 'ativo'::text NOT NULL,
    concluido_em timestamp(3) without time zone,
    cancelado_em timestamp(3) without time zone,
    transferido_de_class_id text
);


ALTER TABLE public.enrollments OWNER TO repense_user;

--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public.notification_reads (
    id text NOT NULL,
    admin_id text NOT NULL,
    notification_type text NOT NULL,
    reference_id text NOT NULL,
    read_at timestamp(3) without time zone,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notification_reads OWNER TO repense_user;

--
-- Name: students; Type: TABLE; Schema: public; Owner: repense_user
--

CREATE TABLE public.students (
    id text NOT NULL,
    nome text NOT NULL,
    cpf text NOT NULL,
    telefone text NOT NULL,
    email text,
    genero text,
    estado_civil text,
    nascimento timestamp(3) without time zone,
    criado_em timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    priority_list boolean DEFAULT false,
    priority_list_course_id text,
    priority_list_added_at timestamp without time zone,
    cidade_preferencia character varying(255)
);


ALTER TABLE public.students OWNER TO repense_user;

--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: Teacher Teacher_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Teacher"
    ADD CONSTRAINT "Teacher_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: Class courses_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: Attendance_lida_por_admin_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX "Attendance_lida_por_admin_idx" ON public."Attendance" USING btree (lida_por_admin);


--
-- Name: Attendance_session_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX "Attendance_session_id_idx" ON public."Attendance" USING btree (session_id);


--
-- Name: Attendance_session_id_student_id_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX "Attendance_session_id_student_id_key" ON public."Attendance" USING btree (session_id, student_id);


--
-- Name: Attendance_student_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX "Attendance_student_id_idx" ON public."Attendance" USING btree (student_id);


--
-- Name: Class_arquivada_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX "Class_arquivada_idx" ON public."Class" USING btree (arquivada);


--
-- Name: Class_cidade_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX "Class_cidade_idx" ON public."Class" USING btree (cidade);


--
-- Name: Class_teacher_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX "Class_teacher_id_idx" ON public."Class" USING btree (teacher_id);


--
-- Name: Session_class_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX "Session_class_id_idx" ON public."Session" USING btree (class_id);


--
-- Name: Session_class_id_numero_sessao_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX "Session_class_id_numero_sessao_key" ON public."Session" USING btree (class_id, numero_sessao);


--
-- Name: Teacher_email_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX "Teacher_email_key" ON public."Teacher" USING btree (email);


--
-- Name: admins_email_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX admins_email_key ON public.admins USING btree (email);


--
-- Name: audit_logs_actor_id_criado_em_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX audit_logs_actor_id_criado_em_idx ON public.audit_logs USING btree (actor_id, criado_em);


--
-- Name: audit_logs_criado_em_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX audit_logs_criado_em_idx ON public.audit_logs USING btree (criado_em);


--
-- Name: audit_logs_event_type_criado_em_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX audit_logs_event_type_criado_em_idx ON public.audit_logs USING btree (event_type, criado_em);


--
-- Name: audit_logs_target_entity_target_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX audit_logs_target_entity_target_id_idx ON public.audit_logs USING btree (target_entity, target_id);


--
-- Name: enrollments_course_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX enrollments_course_id_idx ON public.enrollments USING btree (class_id);


--
-- Name: enrollments_status_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX enrollments_status_idx ON public.enrollments USING btree (status);


--
-- Name: enrollments_student_id_course_id_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX enrollments_student_id_course_id_key ON public.enrollments USING btree (student_id, class_id);


--
-- Name: enrollments_student_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX enrollments_student_id_idx ON public.enrollments USING btree (student_id);


--
-- Name: notification_reads_admin_id_notification_type_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX notification_reads_admin_id_notification_type_idx ON public.notification_reads USING btree (admin_id, notification_type);


--
-- Name: notification_reads_admin_id_notification_type_reference_id_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX notification_reads_admin_id_notification_type_reference_id_key ON public.notification_reads USING btree (admin_id, notification_type, reference_id);


--
-- Name: notification_reads_admin_id_read_at_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX notification_reads_admin_id_read_at_idx ON public.notification_reads USING btree (admin_id, read_at);


--
-- Name: notification_reads_reference_id_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX notification_reads_reference_id_idx ON public.notification_reads USING btree (reference_id);


--
-- Name: students_cpf_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX students_cpf_idx ON public.students USING btree (cpf);


--
-- Name: students_cpf_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX students_cpf_key ON public.students USING btree (cpf);


--
-- Name: students_email_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX students_email_key ON public.students USING btree (email);


--
-- Name: students_priority_list_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX students_priority_list_idx ON public.students USING btree (priority_list);


--
-- Name: students_telefone_idx; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE INDEX students_telefone_idx ON public.students USING btree (telefone);


--
-- Name: students_telefone_key; Type: INDEX; Schema: public; Owner: repense_user
--

CREATE UNIQUE INDEX students_telefone_key ON public.students USING btree (telefone);


--
-- Name: Attendance Attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Class Class_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT "Class_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES public."Teacher"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Session Session_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_class_id_fkey" FOREIGN KEY (class_id) REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enrollments enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public."Class"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: repense_user
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO repense_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO repense_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO repense_user;


--
-- PostgreSQL database dump complete
--

\unrestrict wBTBqtTeTa7gUOBsIhc1ywQWEAg8BQ1yA4xEqGDD2SCfo1oaNHkcM1Cm7d2Dld6

