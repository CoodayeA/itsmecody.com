---
title: "What five years of 24/7 SLA support taught me about owning a customer relationship"
description: "Uptime is the floor, not the job. Notes on onboarding, quarterly reviews, and earning the right to be the first call."
date: 2026-10-01
---

I started at InterWorks as an IT intern in 2020. Since then I've been a systems administrator, a systems engineer on a 24/7 support rotation, and now the company's first Technical Account Manager, responsible for the technical relationship with about 40 managed-services customers. Most of them run Tableau Server or Alteryx Server, more and more alongside Snowflake and Matillion.

The job titles changed, but the work kept pointing at the same lesson: keeping a platform up is the minimum. What customers remember is whether someone on your side actually understood their business while it was down.

## Uptime is the floor

An SLA tells a customer how fast you'll respond. It doesn't tell them whether you know why their Monday morning dashboards matter, who gets the angry email when an extract fails, or which of their workflows feeds a board report. On-call taught me to fix things fast. Account management taught me that a fast fix for the wrong priority still feels like a miss to the customer.

So the first question I ask in any incident now is not "what broke?" but "who is waiting on this, and what are they trying to do?" The technical answer usually comes faster once you know which part of the system the business actually leans on.

## Onboarding is where trust gets set

I lead technical onboarding for every new managed-services customer: kickoff, discovery, implementation planning, environment transition, and handoff. The temptation is to treat it as a checklist. In practice it's the cheapest moment you'll ever have to learn how a customer works.

Discovery is where I find out what "normal" looks like for them: peak hours, critical jobs, who their internal champion is, and what went wrong with their last provider. Every one of those answers saves time in the first real incident, because I already know what matters and who to call.

## The quarterly review is the product

I run quarterly service reviews across the full portfolio. The raw material is the same for everyone: platform health, incident history, performance trends. The useful part is the translation. An engineer wants to know which configuration change will stop the recurring failure. An executive sponsor wants to know whether the platform will hold up to next year's growth, and what it will cost if it doesn't.

A good review gives both of them a short list of priorities they can act on. A bad one is a slide deck of graphs. The difference is almost entirely whether the person presenting has been close enough to the incidents to know which graph matters.

## Be in the logs, then be in the room

The most valuable thing I do is the same thing that made me useful as an engineer: I debug production issues directly with customer developers and administrators, and I stay with the issue through validation instead of handing it off. That's what earns the right to be in the room later, when the conversation turns to architecture, renewals, or expansion.

> Customers trust the person who was there when it broke. Everything else in the relationship builds on that.

## Turn every repeat problem into an asset

With 40 customers on similar platforms, the same problems show up more than once. Each time something recurs, I try to turn it into something reusable: a playbook for our engineers, documentation for the customer's admins, or a section in the biannual newsletter I started for our whole managed-services base. That's how one person's time scales across a portfolio, and it's how support becomes proactive instead of reactive.

## What I'd tell someone moving from support into a TAM role

Your technical depth is the asset, so don't trade it away. Keep debugging. Learn to explain the same incident at three levels: to the engineer who will fix it, the manager who has to plan around it, and the executive who signs the renewal. And write things down, because the customer relationship is bigger than any one conversation.

I still run my own infrastructure at home, now including a self-hosted AI control plane, for the same reason. The closer I stay to the tools, the more useful I am to the people who depend on them.
