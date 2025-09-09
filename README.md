# CasperAI - Advanced AI Assistant

A secure, production-ready AI chatbot with multi-database support.

## Features

- Real-time chat interface
- Multi-database support (MongoDB, Supabase, Firebase)
- Learning and memory capabilities
- Secure deployment ready
- Responsive design

## Setup

1. Clone this repository
2. Run `npm install` to install dependencies
3. Copy `.env.example` to `.env` and configure your environment variables
4. Run `npm start` to start the server

## Environment Variables

See `.env.example` for all available configuration options.

## Deployment on Render

1. Fork this repository to your GitHub account
2. Connect your GitHub account to Render
3. Create a new Web Service on Render
4. Connect your forked repository
5. Set the build command to `npm install`
6. Set the start command to `npm start`
7. Add your environment variables in the Render dashboard
8. Deploy!

## Database Setup

Choose one primary database:

### MongoDB
1. Create a MongoDB Atlas cluster or use a local MongoDB instance
2. Set the `MONGODB_URI` environment variable

### Supabase
1. Create a Supabase project
2. Create a `memories` table with appropriate schema
3. Set the `SUPABASE_URL` and `SUPABASE_KEY` environment variables

### Firebase
1. Create a Firebase project
2. Set up Firestore database
3. Add your service account JSON to the `FIREBASE_CONFIG` environment variable

## Security Features

- Input validation and sanitization
- Security headers
- Environment variable protection
- No client-side code execution
- Rate limiting ready

## License

MIT
