# ECHO - Your AI Cofounder

ECHO is a professional AI cofounder platform that brings together specialized AI agents to help you build, grow, and scale your startup with intelligent automation.

## Features

- **Professional AI Agents**: Specialized agents for different roles (Analyst, PM, UX Expert, Architect, Product Owner)
- **BMad Methodology Integration**: Agile workflow facilitation with proper methodology guidance
- **Real-time Chat**: Smooth streaming responses with typing animations
- **Pro Feature System**: Advanced features with upgrade prompts and free alternatives
- **Firebase Authentication**: Secure user management and conversation storage
- **Responsive Design**: Works perfectly on all devices

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **AI**: Anthropic Claude API
- **Deployment**: Railway

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd echo-claude
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   BMAD_ENABLED=true
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Railway Deployment

1. **Connect to Railway**
   - Install Railway CLI: `npm install -g @railway/cli`
   - Login: `railway login`

2. **Deploy to Railway**
   ```bash
   railway init
   railway up
   ```

3. **Set environment variables**
   In Railway dashboard, add:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `BMAD_ENABLED`: `true`

4. **Your app will be live!**
   Railway will provide a URL like `https://your-app-name.railway.app`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude | Yes |
| `BMAD_ENABLED` | Enable BMad methodology features | No (default: true) |

## Project Structure

```
echo-claude/
├── public/                 # Static files
│   ├── index.html         # Landing page
│   ├── login.html         # Authentication page
│   ├── app.html          # Main chat application
│   ├── styles.css        # Global styles
│   ├── auth.css          # Authentication styles
│   ├── landing.css       # Landing page styles
│   ├── app.js           # Main application logic
│   ├── auth.js          # Authentication logic
│   ├── landing.js       # Landing page logic
│   └── shared.js        # Shared utilities
├── knowledge/            # BMad integration
│   └── bmad-integration.js
├── server.js            # Express server
├── package.json         # Dependencies
├── Procfile            # Railway deployment
├── railway.json        # Railway configuration
└── README.md           # This file
```

## Features Overview

### AI Agent System
- **Agent Activation**: Use `*agent` commands (e.g., `*pm`, `*analyst`)
- **Professional Responses**: Each agent has specialized expertise
- **Workflow Guidance**: Intelligent routing through BMad methodology

### Pro Feature System
- **Free Tier**: Basic chat and document generation
- **Pro Features**: HTML wireframes, SVG diagrams, architecture diagrams
- **Upgrade Flow**: Professional upgrade prompts with alternatives

### Authentication
- **Firebase Integration**: Secure user management
- **Conversation Storage**: Persistent chat history
- **User Profiles**: Personalized experience

## Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes
3. Test locally: `npm start`
4. Commit: `git commit -m "Add new feature"`
5. Push: `git push origin feature/new-feature`

### Code Style
- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Test changes before committing

## Deployment Checklist

Before deploying to Railway:

- [ ] All environment variables set
- [ ] Firebase project configured
- [ ] Anthropic API key valid
- [ ] Local testing completed
- [ ] README updated
- [ ] No sensitive data in code

## Support

For issues or questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with details

## License

ISC License - see LICENSE file for details.

---

**Made for founders by founders** 🚀 