# PivotaConnect Platform

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="[https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png](https://pivotaconnect.com/_next/image?url=%2Flogofinaletransparent.png&w=256&q=75)" width="45"></a>

**A Unified Pan-African Listings Platform for Life Opportunities — Serving Formal AND Informal Economies**

[Website](https://pivotaconnect.com) | [Documentation](https://docs.pivotaconnect.com) | [API Reference](https://api.pivotaconnect.com)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Business Objectives](#business-objectives)
3. [Platform Structure](#platform-structure)
4. [Architecture](#architecture)
5. [Technology Stack](#technology-stack)
6. [Prerequisites](#prerequisites)
7. [Getting Started](#getting-started)
8. [Environment Configuration](#environment-configuration)
9. [Docker Setup](#docker-setup)
10. [Microservices](#microservices)
11. [External Services](#external-services)
12. [Communication Patterns](#communication-patterns)
13. [Authentication & Authorization](#authentication--authorization)
14. [Database Design](#database-design)
15. [AI SmartMatch Engine](#ai-smartmatch-engine)
16. [Revenue Model](#revenue-model)
17. [Monitoring & Observability](#monitoring--observability)
18. [Testing](#testing)
19. [Deployment](#deployment)
20. [API Documentation](#api-documentation)
21. [Contributing](#contributing)
22. [License](#license)

---

## Project Overview

PivotaConnect is a trusted, scalable, pan-African digital marketplace that connects individuals and organizations to essential life opportunities through a unified, multi-category platform. Unlike single-purpose job boards or property portals that serve only the formal economy, PivotaConnect integrates three opportunity pillars—Employment, Housing, and Social Support—into one intelligent ecosystem, with a horizontal layer of Professional Services that enhances all pillars.

### Core Mission

Democratize access to opportunities for every African—from the formal professional to the informal worker, from the corporate employer to the individual landlord, from the international NGO to the local community organization—by creating a single, trusted ecosystem where people can find jobs, housing, and social support, with secure payments and conflict resolution built-in.

### The Problem We Solve

**Africa's Two-Tiered Market**

Across Africa, access to reliable life opportunities is not just fragmented—it's two-tiered. The formal economy has digital platforms, but they exclude the majority. The informal economy has people, but no digital infrastructure to serve them.

- **Formal Sector (Served, but poorly):** Existing platforms lack payment protection, verification, and dispute resolution
- **Informal Sector (Completely invisible):** 83% of Kenyan workers cannot use existing job boards because they require CVs and academic certificates

**The Trust Deficit**

Fraud doesn't discriminate—it affects formal and informal users alike:
- Job scams: "Processing fees" for fake jobs, identity theft
- Housing scams: Fake agents collect deposit and disappear
- Service scams: Poor work with no warranty or recourse
- Social support scams: Fake harambees and fraudulent charities

**Fragmentation**

A typical Kenyan seeking opportunities must navigate 5+ job boards, 10+ Facebook housing groups, word-of-mouth for services, WhatsApp broadcasts for social programs, and cash transactions with no protection.

### Key Differentiators

| Feature | PivotaConnect | Traditional Platforms |
|---------|---------------|----------------------|
| Serves informal workers | Yes | No |
| Escrow-protected payments | Yes | Rarely |
| Dispute resolution | Yes | No |
| Cross-pillar bundling | Yes | No |
| AI-powered matching | Yes | Basic |
| Multi-language (English/Swahili) | Yes | No |
| No-CV job listings | Yes | No |
| M-PESA integration | Yes | Limited |

---

## Business Objectives

### Primary Objectives

1. **Build a unified multi-pillar marketplace** that serves as the single destination for employment, housing, and social support opportunities across Africa

2. **Serve all market segments** – formal professionals, informal workers, corporate employers, individual landlords, international NGOs, and local community organizations

3. **Create a sustainable revenue engine** through diversified streams: subscriptions, transaction commissions, pay-as-you-go, escrow fees, verification services, and corporate packages

4. **Establish trust as a competitive moat** by building verification, escrow, and dispute resolution systems that eliminate fraud and protect all users

5. **Achieve pan-African scale** with a microservices architecture designed for rapid expansion across multiple countries

6. **Generate meaningful social impact** while building a profitable business – measuring success in both revenue and lives improved

7. **Bridge the formal-informal divide** by creating a platform where both segments can participate equally and benefit from the same trust and financial protections

### Target Metrics

| Metric | Year 1 Target | Year 3 Target |
|--------|---------------|---------------|
| Active Users | 50,000 | 500,000 |
| Active Listings | 10,000 | 100,000 |
| Verified Professionals | 2,000 | 50,000 |
| Jobs Filled (Formal) | 2,000 | 30,000 |
| Jobs Filled (Informal) | 3,000 | 70,000 |
| Housing Transactions | 2,000 | 50,000 |
| Professional Bookings | 10,000 | 500,000 |
| Platform GMV | KES 200M | KES 5B |
| Revenue | KES 15M | KES 400M |

---

## Platform Structure

PivotaConnect unifies opportunity access into a single intelligent marketplace that serves everyone—from the formal professional to the informal worker, from the property owner to the tenant, from the NGO to the beneficiary.

### The Three Pillars

**Pillar 1: Employment (Formal + Informal)**

Target Market: All workers—from university graduates to informal sector artisans, from corporate professionals to casual laborers

| Post Type | Description | Target User |
|-----------|-------------|-------------|
| Formal Jobs | Degree-required, CV-based | Professionals |
| Mid-Level Jobs | Diploma/certificate level | Technicians, administrators |
| Informal Jobs | No documents required | Common mwananchi |
| Gig Work | Task-based, immediate | Youth, casual workers |
| Domestic Work | House help, gardeners, drivers | Informal workers |
| Construction | Daily/weekly labor | Casual workers |
| Security | Guards, night watchmen | Informal workers |
| Sales Agents | Commission-based | Informal workers |
| Artisan Services | Skilled trades | Informal workers |
| Apprenticeships | Learn while earning | Youth |
| Internships | Training positions | Students, graduates |
| Contracts | Fixed-term projects | Freelancers, consultants |

**Key Innovation:** No CV required for informal posts. Post what you can do, get paid for what you deliver. Formal posts can use traditional CVs.

**Pillar 2: Housing & Real Estate**

Target Market: Tenants, homeowners, landlords, property seekers, real estate investors

| Post Type | Description |
|-----------|-------------|
| Long-term Rentals | Monthly/yearly lease |
| Short-term Rentals | Daily/weekly stays |
| Room Rentals | Single room in shared house |
| Bedsitters | Studio apartments |
| Single Rooms | Basic accommodation |
| Houses for Sale | Property purchase |
| Land for Sale | Plots and farmland |
| Commercial Property | Business premises |
| Housing Requests | Tenants seeking properties |

**Pillar 3: Social Support**

Target Market: Vulnerable populations, NGOs, government agencies, community organizations, charitable individuals, faith-based organizations

| Category | Organization Post | Individual Post |
|----------|-------------------|-----------------|
| Food | Monthly food parcels | Need food for family |
| Cash | Financial assistance grants | Medical fundraising |
| Shelter | Emergency shelter | Temporary housing after fire |
| Health | Free medical camps | Help with treatment costs |
| Mental Health | Free counseling sessions | Support group for depression |
| Education | Free training courses | Free tutoring |
| Child Support | After-school programs | Childcare assistance |
| Disability | Wheelchair distribution | Sign language interpreter |
| Elderly | Senior meal programs | Check on elderly mother |
| Refugee | Legal aid for refugees | Clothes for refugee family |
| Disaster | Emergency relief supplies | Temporary shelter after flood |
| Donations | Donation drives | Free items |
| Volunteering | Volunteer opportunities | Offer volunteer time |
| Mutual Aid | N/A | Skill exchange |
| Burial | Funeral expense assistance | Help with burial costs |

### Professional Services Layer

A horizontal layer of bookable professionals that enables all three pillars:

| Professional Type | Service Area |
|------------------|--------------|
| Trainers | Skills training (formal & informal) |
| CV Writers | Formal application assistance |
| Career Coaches | Career guidance |
| Transport Providers | Worker transport |
| Tool Suppliers | Equipment rental |
| Safety Gear Vendors | Protective equipment |
| Movers | Relocation services |
| Electricians | Electrical work |
| Plumbers | Plumbing repairs |
| Cleaners | House cleaning |
| Painters | Painting services |
| Carpenters | Furniture repair/assembly |
| Handymen | General repairs |
| Security Installers | Alarm/CCTV installation |
| Property Managers | Rental management |
| Valuers | Property valuation |
| Housing Agents | Finder's fee service |
| Counselors | Therapy sessions |
| Social Workers | Case management |
| Nutritionists | Dietary advice |
| Addiction Counselors | Recovery support |
| Disability Support Workers | Personal care assistance |
| Elderly Caregivers | Senior care |
| Crisis Counselors | Emergency intervention |
| Case Workers | Service coordination |
| Community Health Workers | Home health visits |
| Funeral Coordinators | Burial arrangements |

### Trust & Financial Infrastructure

The platform includes three core trust components:

**Wallet System**
- Balance management
- Deposits and withdrawals
- Payout processing
- M-PESA integration

**Escrow System**
- Fund holding during transactions
- Conditional release based on completion
- Refund processing
- Commission collection

**Dispute Resolution**
- Evidence management
- Mediation process
- Arbitration
- Reputation impact

### AI SmartMatch Engine

The intelligence layer that makes PivotaConnect more than just a listings board:

**Data Analysis Capabilities**
- User profile analysis (skills, experience, preferences, location, formal/informal status)
- Listing type analysis (job requirements, property details, program criteria)
- Professional category analysis (services offered, specialties, service areas)
- Location proximity calculation
- Skill compatibility matching
- Historical performance tracking
- Engagement signal analysis
- Trust score evaluation
- Price range compatibility

**Core Functions**
- Intelligent recommendations showing users what they're most likely to want
- Dynamic ranking placing best matches first
- Complementary bundling suggesting professionals relevant to a listing
- Fraud detection flagging suspicious listings and behavior
- Trust scoring calculating reliability of users
- Cross-pillar suggestions connecting opportunities across pillars

**Example: Housing Listing with AI**

When a user lists "2-bedroom apartment in Kilimani for KES 45,000/month", AI SmartMatch automatically:
- Shows the listing to users who searched in Kilimani
- Prioritizes users with budget KES 40,000-50,000
- Suggests relevant professionals (movers, electricians, cleaners, security companies)
- Bundles services for the tenant with package discount
- Recommends property management services to the landlord
- Suggests similar properties in nearby areas

**Result:** One listing generates up to 5 transactions instead of 1.

### Platform Participants

| Participant Type | Role | Examples |
|-----------------|------|----------|
| Opportunity Creators | Post listings | Employers, Landlords, NGOs, Government agencies, Individuals |
| Opportunity Seekers | Find opportunities | Job seekers (formal & informal), Tenants, Beneficiaries, Home buyers |
| Professionals | Offer bookable services | Electricians, Trainers, Counselors, Movers, Plumbers, Cleaners |
| Agents | Intermediate | Housing agents, Recruitment agents, Case workers, Brokers |

---

## Architecture

### High-Level Architecture Diagram

[Insert Architecture Diagram Here]

The diagram should show:
- API Gateway with Guards, Interceptors, and Decorators
- Five NestJS microservices (Auth, Profile, Listings, Admin, Notification)
- Three Spring Boot external services (Payment, Escrow, Conflict Resolution)
- Infrastructure components (PostgreSQL, Redis, Kafka, RabbitMQ)
- Communication lines (gRPC, HTTP, Kafka, RabbitMQ)

### Communication Matrix

| Communication Type | Technology | Use Case |
|-------------------|------------|----------|
| Gateway → Services | gRPC | All API requests from gateway |
| Gateway → External Services | HTTP | Spring Boot services (Payment, Escrow, Conflict) |
| Service → Service (Sync) | gRPC | Direct service-to-service calls |
| Service → Service (Async Events) | Kafka | Analytics, AI training data, business intelligence |
| Service → Service (Async Messages) | RabbitMQ | Notifications, emails |
| Any Service → External | HTTP | Transaction processing, escrow holds, dispute resolution |

### Data Flow

[Insert Data Flow Diagram Here]

The diagram should show:
1. Client request flow through Gateway
2. gRPC communication between Gateway and services
3. Service-to-service sync calls via gRPC
4. Async events via Kafka to Admin Service for analytics
5. Async messages via RabbitMQ to Notification Service
6. HTTP calls to external Spring Boot services
7. Database interactions via Prisma
8. Cache interactions via Redis

---

## Technology Stack

### Core Platform (NestJS Microservices)

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Monorepo Management | Nx | Latest | Build system, code generation, dependency graph |
| Framework | NestJS | 10.x | Modular microservices architecture |
| API Layer | GraphQL + REST | - | Flexible client communication |
| Service Communication | gRPC | - | High-performance sync calls |
| Message Queue (Events) | Kafka | 3.x | Async event-driven architecture for analytics |
| Message Queue (Messages) | RabbitMQ | 3.12 | Async messaging for notifications |
| Cache & Queue | Redis + BullMQ | 7.x | Rate limiting, job queues, caching |
| ORM | Prisma | 5.x | Type-safe database access |
| Connection Pooling | Prisma Accelerate | - | Database connection optimization |
| Database | PostgreSQL | 15.x | ACID-compliant relational data |
| Search (Future) | Elasticsearch | 8.x | Full-text & geospatial search |
| Email | Resend + Nodemailer | - | Transactional emails |

### External Services (Spring Boot)

| Service | Technology | Version | Purpose |
|---------|------------|---------|---------|
| Payment Service | Spring Boot | 3.x | M-PESA, Stripe, bank transfers, payouts |
| Escrow Service | Spring Boot | 3.x | Fund holding, release, refunds, commission |
| Conflict Resolution | Spring Boot | 3.x | Dispute filing, evidence management, mediation, arbitration |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Containerization | Docker + Docker Compose |
| Cloud | AWS / Azure |
| Authentication | JWT, OAuth2 |
| API Documentation | Swagger/OpenAPI |

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Verification Command |
|-------------|---------|---------------------|
| Node.js | 20.x or higher | `node --version` |
| Nx CLI | Latest | `nx --version` |
| Docker | 24.x or higher | `docker --version` |
| Docker Compose | 2.x or higher | `docker compose version` |
| PostgreSQL | 15.x or higher | `psql --version` |
| Redis | 7.x or higher | `redis-server --version` |
| Kafka | 3.x or higher | (via Docker) |
| RabbitMQ | 3.12 or higher | (via Docker) |
| Java | 17.x or higher | `java --version` |
| Maven | 3.8+ or Gradle 7+ | `mvn --version` |

---

## Getting Started

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/pivotaconnect.git
cd pivotaconnect
