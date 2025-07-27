# Echo

A real-time chat application with AI integration, built with Node.js and modern web technologies.

## Features

- Real-time messaging
- AI-powered responses
- Modern, responsive UI
- Syntax highlighting for code
- File sharing capabilities
- User authentication

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Real-time Communication**: WebSocket
- **AI Integration**: Claude API
- **Code Highlighting**: Prism.js

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jayraj0908/Echo.git
   cd Echo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables:
   ```
   CLAUDE_API_KEY=your_claude_api_key_here
   PORT=3000
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
Echo/
├── public/          # Static files (HTML, CSS, JS)
├── knowledge/       # Knowledge base files
├── server.js        # Main server file
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 