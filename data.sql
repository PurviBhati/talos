--
-- PostgreSQL database dump
--

\restrict SPSLBsg3cENXSFbQwPjUYSKGt5KTvWFJ43ipjorO45QNDc9h37nHo9IdXUaZ9VO

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
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, default_platform, slack_channel, whatsapp_number, created_at) FROM stdin;
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

COPY public.channel_mappings (id, teams_chat_id, teams_chat_name, slack_channel_id, slack_channel_name, project_name, active, created_at, whatsapp_number, whatsapp_numbers) FROM stdin;
1	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	Buildbite	C0AHE5C59NH	#privateopenclawdemo	Buildbite	t	2026-03-09 14:48:19.156011	\N	{}
2	19:c674dec86329409aac6054bdc2c986e4@thread.v2	Pelotech - Josef	C0AHHG10HDG	#openclawtest	Pelotech	t	2026-03-09 14:48:19.156011	\N	{}
3	19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2	Ignite Deep Tech	C0AH24BPHRD	#testdemo	Ignite Deep Tech	t	2026-03-09 14:48:19.156011	\N	{}
11	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	Deep Group	none	none	Deep Group	t	2026-03-13 13:12:39.511842	\N	{}
10	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	Avishkar Developers	none	none	Avishkar Developers	t	2026-03-13 13:12:39.511842	\N	{}
9	19:242493be18a54cb58c65303932eeeb7f@thread.v2	Atomic Object	none	none	Atomic Object	t	2026-03-13 13:12:39.511842	\N	{}
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contacts (id, name, email, slack_user_id, slack_channel, whatsapp_number, notes, created_at) FROM stdin;
\.


--
-- Data for Name: message_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_logs (id, draft_id, action_type, performed_by, metadata, created_at) FROM stdin;
1	1	test_manual	system	{}	2026-02-24 11:34:21.979768
\.


--
-- Data for Name: slack_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.slack_messages (id, sender, sender_id, body, "timestamp", channel_id, channel_name, ts, forwarded_to_teams, forwarded_at, created_at, dismissed, edited_body) FROM stdin;
18	openclaw	\N	:incoming_envelope: Slack → Teams From: purvi.appsrow (C0AH24BPHRD)   Heyy @user	2026-03-13 15:25:05.879+05:30	C0AH24BPHRD	C0AH24BPHRD	\N	f	\N	2026-03-13 15:25:08.393772+05:30	f	\N
13	purvi.​appsrow	\N	heyy	2026-03-13 12:54:06.423+05:30	C0AH24BPHRD	testdemo	\N	t	\N	2026-03-13 12:54:09.944745+05:30	t	heyy\n\ntest - ignore please\nSuccess
19	purvi.​appsrow	\N	there's the demo.	2026-03-13 18:02:37.602+05:30	C0AH24BPHRD	C0AH24BPHRD	\N	f	\N	2026-03-13 18:03:13.648376+05:30	f	\N
20	openclaw	\N	For Test	2026-03-13 19:02:44.963+05:30	C0AHE5C59NH	C0AHE5C59NH	\N	f	\N	2026-03-13 19:02:47.246913+05:30	f	\N
10	purvi.​appsrow	U0AHH7YBQKC	the above workflow is good, but can u please change it?\nthe link i've attached, please review it and make something similar.\n\n<https://buildbite.com/lp/construction-demo>	2026-03-09 16:45:22.006+05:30	C0AH24BPHRD	testdemo	1773054922.006469	t	2026-03-09 18:44:04.9778+05:30	2026-03-09 16:45:24.456554+05:30	t	\N
9	purvi.​appsrow	U0AHH7YBQKC	<@U0AJBNZUHJ4> hi	2026-03-09 15:27:05.633+05:30	C0AH24BPHRD	testdemo	1773050225.633559	f	\N	2026-03-09 15:27:07.968814+05:30	t	\N
8	purvi.​appsrow	U0AHH7YBQKC	hello <@U0AHE0726MB>	2026-03-09 15:24:06.978+05:30	C0AHE5C59NH	privateopenclawdemo	1773050046.978329	f	\N	2026-03-09 15:24:10.005985+05:30	t	\N
11	purvi.​appsrow	U0AHH7YBQKC	hello <@U0AHE0726MB>\nwe have done the teams to whatsapp commnuication, but the image didn't passed yesterday.\nI'd like to check how it's working.\nSend me the site link.	2026-03-11 10:21:19.744+05:30	C0AHE5C59NH	privateopenclawdemo	1773204679.744629	f	\N	2026-03-11 10:21:26.531309+05:30	f	\N
15	Abhishek soni	\N	Hello team, we’d like to show maps on contact us page like this.\nLet me know, how’d it look ok that page.	2026-03-13 10:52:22.648+05:30	C0AH24BPHRD	testdemo	\N	t	\N	2026-03-13 13:01:20.701509+05:30	f	\N
16	purvi.​appsrow	\N	Heyy <@U0AHE0726MB>	2026-03-13 14:38:02.607+05:30	C0AH24BPHRD	C0AH24BPHRD	\N	t	\N	2026-03-13 14:38:05.76924+05:30	t	\N
14	purvi.​appsrow	\N	heyy <@U0AHE0726MB>\n\nsure will work on it.\nLet me know if there's anything else.	2026-03-13 12:25:58.067+05:30	C0AH24BPHRD	testdemo	\N	t	\N	2026-03-13 13:01:20.432932+05:30	t	\N
17	purvi.​appsrow	\N	test - please ignore	2026-03-13 14:41:38.379+05:30	C0AH24BPHRD	C0AH24BPHRD	\N	t	\N	2026-03-13 14:41:41.173302+05:30	t	\N
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, source, source_message_id, client_name, platform_label, body, links, images, status, teams_task_id, teams_plan_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: teams_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams_conversations (id, conversation_id, conversation_name, service_url, tenant_id, bot_id, bot_name, created_at, updated_at) FROM stdin;
2	19:242493be18a54cb58c65303932eeeb7f@thread.v2	Atomic Object	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 12:41:46.187165	2026-03-09 18:42:35.765997
4	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	Buildbite	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-03-09 18:42:35.765997
5	19:b8106b41b4eb4b4289f0add58655fbca@thread.v2	Avishkar Developers	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-03-09 18:42:35.765997
1	19:c674dec86329409aac6054bdc2c986e4@thread.v2	Pelotech - Josef	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-06 18:06:38.951386	2026-03-09 18:42:35.765997
7	19:8fc98a7687624b4abd4c2ecb84a58be9@thread.v2	Ignite Deep Tech	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-03-09 18:42:35.765997
8	19:f92996ccf45c4e3e92d539c0603a2953@thread.v2	Deep Group	https://smba.trafficmanager.net/in/	d3775544-3fba-465a-ae1a-977350295eb3	28:cc36da8b-5cf6-4ce6-9997-bb345bd170ea	UnifiedHub-Bot	2026-03-09 18:40:23.704998	2026-03-09 18:42:35.765997
\.


--
-- Data for Name: teams_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams_messages (id, sender, body, "timestamp", message_type, files, links, source_id, source_type, created_at, approval_status, suggested_platform, approved_draft, message_id, chat_name, priority, flag_admin, ai_reasoning, recipient_name, recipient_slack_id, recipient_whatsapp, should_forward, ai_category, ai_should_forward, ai_priority, ai_reason, forwarded_to_slack, forwarded_to_slack_at, forwarded_to_whatsapp, forwarded_to_whatsapp_at, dismissed) FROM stdin;
361	Abhishek Soni	<p>I edited the section "Problems that cost you hours every day" and would like your view on the attached document. Rob will update the yellow markings and I marked the existing images in Figma.</p>	2026-03-16 11:07:49.614+05:30	project_update	[]	[]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-03-16 11:10:54.537179+05:30	waiting	\N	\N	1773639469614	Buildbite	medium	f	Document attached for review and project update mentioned	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f
362	Abhishek Soni	<p>Nice, you can go live with it: <a href="https://buildbite-25848238.hs-sites-eu1.com/author/micke-paqvalen" rel="noreferrer noopener" title="https://buildbite-25848238.hs-sites-eu1.com/author/micke-paqvalen" target="_blank">https://buildbite-25848238.hs-sites-eu1.com/author/micke-paqvalen</a><br>\n<br>\nand please redirect the duplicate</p>	2026-03-16 11:11:39.705+05:30	project_update	[]	["https://buildbite-25848238.hs-sites-eu1.com/author/micke-paqvalen", "https://buildbite-25848238.hs-sites-eu1.com/author/micke-paqvalen", "https://buildbite-25848238.hs-sites-eu1.com/author/micke-paqvalen"]	19:4bc8f6aad31945c89f8d8532b75b7045@thread.v2	groupChat	2026-03-16 11:11:42.029671+05:30	waiting	\N	\N	1773639699705	Buildbite	medium	f	Contains a link and project update instructions	\N	\N	\N	f	\N	\N	\N	\N	f	\N	f	\N	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, role, department, teams_display_name, created_at) FROM stdin;
1	Admin	pm@appsrow.com	$2b$10$k.dPyQHAKMD0y27ILX0TKufRyonPm6G7UWsYvgPItBbjO3nk/hs76	admin	\N	\N	2026-02-27 14:03:02.06781+05:30
\.


--
-- Data for Name: whatsapp_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.whatsapp_messages (id, sender, sender_phone, body, message_sid, "timestamp", media_urls, direction, forwarded_to_teams, forwarded_to_slack, forwarded_at, ai_category, ai_should_forward, ai_priority, ai_reason, created_at, dismissed, content_summary, action_required, urgency_indicators, group_name, edited_body) FROM stdin;
\.


--
-- Name: ai_drafts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_drafts_id_seq', 21, true);


--
-- Name: channel_mappings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.channel_mappings_id_seq', 11, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, false);


--
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);


--
-- Name: incoming_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.incoming_messages_id_seq', 83, true);


--
-- Name: message_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_logs_id_seq', 1, true);


--
-- Name: slack_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.slack_messages_id_seq', 20, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 1, false);


--
-- Name: teams_conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teams_conversations_id_seq', 14, true);


--
-- Name: teams_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teams_messages_id_seq', 362, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: whatsapp_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.whatsapp_messages_id_seq', 59, true);


--
-- PostgreSQL database dump complete
--

\unrestrict SPSLBsg3cENXSFbQwPjUYSKGt5KTvWFJ43ipjorO45QNDc9h37nHo9IdXUaZ9VO

