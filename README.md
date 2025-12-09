# Meta AI Workshop Analytics

Real-time analytics dashboard to track student engagement and feature adoption across forked workshop projects.

## Features

- **Real-time Dashboard** - See student activity as it happens
- **Usage Analytics** - Track Chat, Summarize, Multimodal, and RAG feature usage
- **Student Management** - Register students and track their deployments
- **CSV Export** - Export data for reporting to Meta AI
- **Auto-refresh** - Dashboard updates every 30 seconds

## Quick Start

### 1. Clone and Install

```bash
git clone <this-repo-url>
cd meta-ai-workshop-analytics
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (default PORT is 3002)
```

### 3. Run Locally

```bash
npm start
```

Visit:
- Registration: http://localhost:3002/
- Dashboard: http://localhost:3002/dashboard

### 4. Deploy to Render

1. Push this repo to GitLab
2. Go to https://render.com
3. Create new **Web Service**
4. Connect your GitLab repository
5. Use these settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** None required (uses defaults)

6. Click **Create Web Service**

Your analytics dashboard will be live at: `https://your-app-name.onrender.com/dashboard`

## For Workshop Facilitators

### Step 1: Deploy Analytics Server

Deploy this to Render and get your public URL (e.g., `https://workshop-analytics.onrender.com`)

### Step 2: Share Registration Link

Send students to: `https://workshop-analytics.onrender.com/`

### Step 3: Students Add Tracking Code

See TRACKING_CODE.js for code to add to student apps.

### Step 4: Monitor Dashboard

View real-time analytics at: `https://workshop-analytics.onrender.com/dashboard`

### Step 5: Export for Meta AI

Download CSV report: `https://workshop-analytics.onrender.com/api/export?format=csv`

## License

MIT
