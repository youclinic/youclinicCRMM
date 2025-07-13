# Health Tourism CRM Application
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
  
This project is connected to the Convex deployment named [`rare-ant-887`](https://dashboard.convex.dev/d/rare-ant-887).
  
## Project structure
  
The frontend code is in the `src` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## Deployment to Vercel

### Prerequisites
1. Make sure you have a Vercel account
2. Install Vercel CLI: `npm i -g vercel`
3. Ensure your Convex deployment is set up and running

### Deployment Steps
1. **Build the project locally first:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Set Environment Variables in Vercel Dashboard:**
   - Go to your Vercel project dashboard
   - Navigate to Settings > Environment Variables
   - Add your Convex URL: `VITE_CONVEX_URL=your_convex_deployment_url`

4. **Configure Custom Domain (Optional):**
   - In Vercel dashboard, go to Settings > Domains
   - Add your custom domain

### Environment Variables
Make sure to set the following environment variables in your Vercel deployment:
- `VITE_CONVEX_URL`: Your Convex deployment URL

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
