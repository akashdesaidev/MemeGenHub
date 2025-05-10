# ImageGenHub

A meme generation and sharing platform built with Next.js (frontend) and Express/Node.js (backend).

## Project Structure

- `/frontend` - Next.js application
- `/backend` - Express API server

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB database (local or Atlas)
- Cloudinary account (for image storage)

### Running the Application Locally

1. Clone the repository
2. Set up environment variables:

   - Copy `.env.example` to `.env.local` in the frontend directory
   - Copy `.env.example` to `.env` in the backend directory
   - Fill in your environment variables

3. Install dependencies and run the application:

```bash
# Install dependencies for both frontend and backend
npm install

# Run both frontend and backend concurrently
npm run dev
```

## Deployment to Vercel

This application is designed to be deployed as two separate Vercel projects:

### Frontend Deployment

1. Create a new Vercel project linked to your repository
2. Select the `/frontend` directory as the project root
3. Configure the following environment variables in Vercel project settings:

   - `NEXTAUTH_URL` - Your production URL (e.g., https://imagegenhub.vercel.app)
   - `NEXTAUTH_SECRET` - Secure random string for NextAuth
   - `NEXT_PUBLIC_API_URL` - URL of your deployed backend API
   - OAuth credentials if using social login
   - Cloudinary credentials if using image uploads

4. Deploy the project

### Backend Deployment

1. Create a second Vercel project linked to your repository
2. Select the `/backend` directory as the project root
3. Configure the following environment variables in Vercel project settings:

   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Secure random string for JWT tokens
   - `CORS_ORIGIN` - URL of your frontend application
   - Cloudinary credentials for image uploads
   - Any other secrets needed by your application

4. Deploy the project

### Using Vercel CLI (Alternative)

You can also deploy using the Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy the frontend
cd frontend
vercel

# Deploy the backend
cd ../backend
vercel
```

## Important Notes

- Remember to set up proper CORS configurations to allow communication between frontend and backend
- For the fullstack deployment to work, make sure the frontend's API URL environment variable points to the deployed backend URL
- Both projects must be deployed separately on Vercel

## Troubleshooting

- **CORS Issues**: Ensure the backend's CORS configuration includes your frontend domain
- **API Connection Problems**: Verify that the `NEXT_PUBLIC_API_URL` in the frontend points to the correct backend URL
- **Authentication Errors**: Make sure all secrets and keys are properly set in environment variables
