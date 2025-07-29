# Railway Deployment Guide

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repo
3. **Anthropic API Key**: Get your API key from [console.anthropic.com](https://console.anthropic.com)
4. **Firebase Project**: Set up Firebase for authentication

## Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure your repository has these files:
- ✅ `package.json` (with start script)
- ✅ `server.js` (main server file)
- ✅ `Procfile` (Railway deployment)
- ✅ `railway.json` (Railway configuration)
- ✅ `.gitignore` (excludes node_modules, .env, etc.)

### 2. Connect to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to your project directory
cd echo-claude

# Initialize Railway project
railway init
```

### 3. Set Environment Variables

In Railway dashboard or via CLI:

```bash
# Set your Anthropic API key
railway variables set ANTHROPIC_API_KEY=your_api_key_here

# Enable BMad features
railway variables set BMAD_ENABLED=true
```

**Required Variables:**
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `BMAD_ENABLED`: `true` (optional, defaults to true)

### 4. Deploy

```bash
# Deploy to Railway
railway up

# Or push to GitHub and Railway will auto-deploy
git push origin main
```

### 5. Get Your URL

Railway will provide a URL like:
`https://your-app-name.railway.app`

### 6. Test Your Deployment

1. Visit your Railway URL
2. Test the landing page
3. Test authentication
4. Test chat functionality
5. Test agent activation (`*pm`, `*analyst`, etc.)

## Troubleshooting

### Common Issues

**Build Fails:**
- Check `package.json` has correct start script
- Ensure all dependencies are listed
- Check for syntax errors in code

**Environment Variables:**
- Verify API keys are set correctly
- Check variable names match exactly
- Restart deployment after setting variables

**App Crashes:**
- Check Railway logs: `railway logs`
- Verify server.js starts correctly
- Check for missing dependencies

### Useful Commands

```bash
# View logs
railway logs

# Check status
railway status

# Open in browser
railway open

# View variables
railway variables

# Restart deployment
railway up
```

## Post-Deployment

### 1. Set Custom Domain (Optional)

In Railway dashboard:
1. Go to your project
2. Click "Settings"
3. Add custom domain
4. Update DNS records

### 2. Monitor Performance

- Check Railway metrics
- Monitor API usage
- Watch for errors in logs

### 3. Update Firebase Settings

Update your Firebase project:
1. Go to Firebase Console
2. Add your Railway domain to authorized domains
3. Update OAuth redirect URLs if needed

## Success Checklist

- [ ] App deploys without errors
- [ ] Landing page loads correctly
- [ ] Authentication works
- [ ] Chat functionality works
- [ ] Agent activation works (`*pm`, `*analyst`)
- [ ] Pro features show upgrade prompts
- [ ] Environment variables set correctly
- [ ] Custom domain configured (if needed)
- [ ] Firebase settings updated

## Support

If you encounter issues:
1. Check Railway logs
2. Verify environment variables
3. Test locally first
4. Check Firebase configuration
5. Review this guide

---

**Your ECHO app is now live on Railway!** 🚀 