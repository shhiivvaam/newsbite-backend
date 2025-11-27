# NewsBite Backend

Node.js + Express + Prisma backend for NewsBite news website.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   - Copy `.env` and add your Supabase connection string
   - Get your connection string from Supabase: Project Settings > Database > Connection String > URI

3. **Set up Prisma**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npx prisma migrate dev --name init --create-only
   npx prisma migrate dev --name make_author_optional
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations

## API

Server runs on `http://localhost:3001` by default.

### Endpoints

- `GET /health` - Health check endpoint

echo "# newsbite-backend" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Krishanx2003/newsbite-backend.git
git push -u origin main
"# newsbite-backend" 
