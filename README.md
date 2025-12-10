# 🤖 Job Automation with Hyperbrowser

AI-powered job search and application automation using Claude Computer Use via [Hyperbrowser](https://hyperbrowser.ai).

## Features

- 🔍 **Intelligent Job Search** - Search across 12+ job platforms concurrently
- 🤖 **AI-Powered Applications** - Claude Computer Use fills out applications automatically
- 📄 **Resume Parsing** - Extract resume content using Anthropic Claude
- 🛡️ **Anti-Detection** - Stealth mode, proxy rotation, and fingerprint randomization
- 📊 **Job Tracking** - Persistent JSON database with status management
- 🎨 **Modern Dashboard** - Beautiful Next.js UI for monitoring and control

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Server Components
- **AI**: Claude Computer Use via Hyperbrowser SDK, Anthropic API
- **Logging**: Pino

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.local.example` to `.env.local` and add your API keys:

```bash
cp .env.local.example .env.local
```

Required keys:
- `HYPERBROWSER_API_KEY` - Get from [Hyperbrowser Dashboard](https://hyperbrowser.ai)
- `ANTHROPIC_API_KEY` - Get from [Anthropic Console](https://console.anthropic.com)

### 3. Add Your Profile

Update the files in `user/` directory:
- `job_preferences.json` - Your job search criteria
- `personal_info.json` - Your contact details for applications
- `Resume.pdf` - Your resume for text extraction

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── jobs/         # Job CRUD & search
│   │   │   └── sessions/     # Browser session management
│   │   ├── jobs/             # Jobs page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Dashboard
│   │
│   ├── lib/                   # Core libraries
│   │   ├── config/           # Configuration & anti-detection
│   │   ├── hyperbrowser/     # Hyperbrowser client & agent
│   │   ├── job-tracker/      # Job tracking system
│   │   ├── logger/           # Pino logger
│   │   └── resume/           # Resume parser (Anthropic)
│   │
│   └── types/                 # TypeScript types
│
├── data/                      # Job data storage
│   └── jobs.json
│
├── user/                      # User configuration
│   ├── job_preferences.json
│   ├── personal_info.json
│   ├── platform_configs.json
│   └── Resume.pdf
│
└── package.json
```

## API Endpoints

### Jobs

- `GET /api/jobs` - List all jobs (with optional filters)
- `POST /api/jobs` - Add a new job
- `PATCH /api/jobs` - Update job status

### Job Search

- `POST /api/jobs/search` - Start AI-powered job search
  ```json
  {
    "queries": ["Software Engineer", "Full Stack Developer"],
    "platforms": ["remoteok", "weworkremotely"]
  }
  ```

### Job Application

- `POST /api/jobs/apply` - Apply to a job
  ```json
  {
    "jobIndex": 0,
    "additionalInstructions": "Mention my YouTube channel"
  }
  ```

### Browser Sessions

- `GET /api/sessions` - Test Hyperbrowser connection
- `POST /api/sessions` - Execute a custom browser task

## Supported Platforms

- RemoteOK
- We Work Remotely
- AngelList
- Dice
- Glassdoor
- NoDesk
- Jobspresso
- Working Nomads
- Remote.co
- Jobgether
- DevRemote
- Remote Tech Jobs

## Configuration

### Job Preferences (`user/job_preferences.json`)

```json
{
  "target_roles": ["Software Engineer", "Full Stack Developer"],
  "preferred_companies": ["OpenAI", "Anthropic", "Google"],
  "min_salary": 140000,
  "remote_preference": "remote_or_hybrid",
  "tech_stack": ["TypeScript", "React", "Node.js"]
}
```

### Platform Configuration (`user/platform_configs.json`)

Configure anti-detection settings, delays, and per-platform limits.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HYPERBROWSER_API_KEY` | Hyperbrowser API key | Required |
| `ANTHROPIC_API_KEY` | Anthropic API key | Required |
| `SEARCH_MAX_STEPS` | Max steps per search | 30 |
| `APPLICATION_MAX_STEPS` | Max steps per application | 40 |
| `MAX_APPLICATIONS_PER_RUN` | Application limit | 10 |

## License

MIT

## Support

- [Hyperbrowser Docs](https://docs.hyperbrowser.ai)
- [Hyperbrowser Discord](https://discord.gg/hyperbrowser)
