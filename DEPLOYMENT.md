# Deployment Guide

## Deploy to Render

1. Push to GitLab:
```bash
git add .
git commit -m "Initial commit: Analytics server"
git push origin main
```

2. Go to https://render.com

3. Create new Web Service

4. Connect GitLab repository

5. Deploy (uses default Node.js settings)

6. Get your URL and share with students!

## Test the deployment

Visit: `https://your-app.onrender.com/dashboard`

No, not automatically. Let me explain how this works:

## Current Setup

You have **two separate repositories** with **two remotes** configured locally:

1. **origin** (GitLab team repo):
   ```
   https://gitlab.wethinkco.de/performanceteam/meta/meta-workshop-analytics
   ```

2. **github** (Your GitHub repo):
   ```
   https://github.com/MrPeterManda/meta-workshop-analytics.git
   ```

These two repos are **NOT automatically synced**. They're independent.

***

## How to Sync Changes from GitLab to GitHub

### Scenario 1: Someone Pushes to GitLab Team Repo

If changes are made to the GitLab repo, you need to **manually sync** them:

```bash
cd meta-workshop-analytics

# Step 1: Pull changes from GitLab
git pull origin master

# Step 2: Push those changes to GitHub
git push github master
```

Now Render (watching GitHub) will auto-deploy the changes.

***

## Check Your Current Remotes

Run this to see what remotes you have:

```bash
git remote -v
```

You should see something like:
```
origin  https://gitlab.wethinkco.de/performanceteam/meta/meta-workshop-analytics (fetch)
origin  https://gitlab.wethinkco.de/performanceteam/meta/meta-workshop-analytics (push)
github  https://github.com/MrPeterManda/meta-workshop-analytics.git (fetch)
github  https://github.com/MrPeterManda/meta-workshop-analytics.git (push)
```

***

## Workflow Options

### Option A: Work from GitLab, Sync to GitHub (Team Collaboration)

If your team works on GitLab:

```bash
# Pull latest from team GitLab
git pull origin master

# Make your changes
git add .
git commit -m "Update analytics"

# Push to GitLab (team sees it)
git push origin master

# Sync to GitHub (Render deploys it)
git push github master
```

***

### Option B: Work from GitHub Only (Solo Work)

If you work alone:

```bash
# Make changes
git add .
git commit -m "Update analytics"

# Push to GitHub only (Render deploys it)
git push github master
```

***

### Option C: Auto-Sync Both (Create Alias)

Create a shortcut to push to both at once:

```bash
# Create alias
git config alias.pushboth '!git push origin master && git push github master'

# Now use:
git pushboth
```

This pushes to both GitLab (team) and GitHub (Render) in one command.

***

## Which Workflow Should You Use?

**For the workshop scenario, it's recommended to:**

1. **Work on GitHub directly** (since Render watches it)
2. **Occasionally sync back to GitLab** (for team backup)

```bash
# Daily work
git push github master  # Deploys to Render automatically

# Occasional backup to team repo
git push origin master  # Updates GitLab team repo
```

***

## Important Note

**The two repos won't sync unless you manually push/pull between them.** Adding a remote just tells Git where the repos are located - it doesn't create automatic syncing.
