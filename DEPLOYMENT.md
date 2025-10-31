# Chat Feature Deployment Guide

## Current Issue
Your portfolio is likely deployed on GitHub Pages, which only serves static files. The chat feature uses a Python serverless function that requires a platform like **Vercel** or **Netlify Functions**.

## Quick Fix: Deploy to Vercel

### Option 1: Deploy entire site to Vercel (Recommended)

1. **Push your code to GitHub** (if not already there):
   ```bash
   git push origin chatbot
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel will auto-detect the Python function in `api/`

3. **Add Environment Variable**:
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add: `GROQ_API_KEY` = your API key

4. **Deploy!**
   - Vercel will auto-deploy on every push to the `chatbot` branch

### Option 2: Deploy only API to Vercel (Keep site on GitHub Pages)

If you want to keep the main site on GitHub Pages but deploy the API separately:

1. Create a separate repository for just the API
2. Deploy it to Vercel
3. Update the `chat.js` file to point to your Vercel API URL:
   ```javascript
   const apiEndpoints = [
     'https://your-api-name.vercel.app/api/chat',  // Your Vercel API
     '/api/chat'
   ];
   ```

## Testing Locally

If you want to test the chat feature locally:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Run locally:
   ```bash
   vercel dev
   ```

3. The chat will work at `http://localhost:3000`

## Alternative: Use a Third-Party API Proxy

If you prefer not to use Vercel, you can:
- Use Cloudflare Workers
- Use AWS Lambda
- Use a simple proxy service

## Current State

The chat UI is now functional with improved error handling. It will show:
- Clear error messages if the API is unavailable
- Try multiple endpoints automatically
- Gracefully handle connection issues

Once deployed to Vercel, everything will work automatically! 🚀

