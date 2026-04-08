# BuzzForge

A social publishing platform with short-form thoughts, long-form stories, and community-driven discovery.

## Features

- **Microblog Feed**: Post short thoughts and updates (like tweets)
- **Full Articles**: Write and publish longer-form blog posts
- **Interactions**: Like, repost/share, and comment on posts
- **Hashtags & Search**: Organize content with hashtags and search functionality
- **Media Support**: Upload images and videos to your posts
- **User Accounts**: Registration, login, and profile customization
- **Session Security**: Cookie-based auth with protected write actions
- **Responsive Design**: Works great on desktop and mobile

## Project Structure

```
BuzzForge/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── models/    # MongoDB schemas
│   │   ├── routes/    # API endpoints
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/ # Custom middleware
│   │   └── server.js  # Main server file
│   ├── uploads/       # Media files directory
│   └── package.json
├── frontend/          # React web application
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/ # Reusable components
│   │   ├── styles/    # CSS files
│   │   ├── services/  # API client
│   │   └── App.js     # Main app component
│   ├── public/        # Static files
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MongoDB connection string and admin settings:
   ```env
   MONGODB_URI=your-mongodb-uri
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-strong-password
   JWT_SECRET=your-long-random-secret
   ```

5. Start the server:
   ```bash
   npm run dev    # Development mode with auto-reload
   npm start      # Production mode
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend will open at `http://localhost:3000`

## API Endpoints

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create post (admin)
- `PUT /api/posts/:id` - Update post (admin)
- `DELETE /api/posts/:id` - Delete post (admin)
- `GET /api/posts/trending/hashtags` - Get trending hashtags

### Comments
- `GET /api/comments/post/:postId` - Get comments for a post
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id/approve` - Approve comment (admin)
- `DELETE /api/comments/:id` - Delete comment (admin)

### Likes
- `POST /api/likes/:postId/like` - Toggle like
- `POST /api/likes/:postId/repost` - Toggle repost
- `GET /api/likes/:postId/status` - Check like status

## Tech Stack

- **Backend**: Express.js, MongoDB, Mongoose
- **Frontend**: React, React Router, Axios
- **Styling**: CSS3
- **Media Upload**: Multer
- **Utilities**: date-fns, react-icons

## Features Guide

### Creating Posts

1. Go to the Admin Panel (`/admin`)
2. Choose post type: "Tweet" (short) or "Article" (full)
3. Add title, content, and optional excerpt
4. Add hashtags (comma-separated)
5. Upload media files (optional)
6. Click "Publish Post"

### Interacting with Posts

- **Like**: Click the heart icon to like a post
- **Repost**: Click the share icon to repost
- **Comment**: Click on a post and add a comment
- **Search**: Use the search bar to find posts by keyword
- **Hashtags**: Click on hashtags to view related posts

## Development Tips

- Comments require approval before appearing on the site
- Each IP address can only like/repost a post once
- Hashtags are automatically converted to lowercase
- Media files are stored in the `backend/uploads` directory
- Admin write actions require a valid authenticated session cookie
- For cross-domain production deployments, set `ADMIN_COOKIE_SAME_SITE=none` and `ADMIN_COOKIE_SECURE=true`

## VPS Deployment (Ubuntu + Nginx + PM2)

### 1. Install dependencies on the VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Upload and install project

```bash
cd /var/www
sudo mkdir -p buzzforge
sudo chown -R $USER:$USER buzzforge
cd buzzforge

# clone your repo here
git clone <your-repo-url> .

cd backend && npm install
cd ../frontend && npm install && npm run build
```

### 3. Configure backend environment

```bash
cd /var/www/buzzforge/backend
cp .env.example .env
nano .env
```

Set at least:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
CORS_ORIGIN=https://your-domain.com
ADMIN_COOKIE_SAME_SITE=none
ADMIN_COOKIE_SECURE=true
USER_COOKIE_SAME_SITE=none
USER_COOKIE_SECURE=true
JWT_SECRET=your-strong-random-secret
```

### 4. Start backend with PM2

```bash
cd /var/www/buzzforge
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

### 5. Configure Nginx

```bash
sudo cp deploy/nginx-buzzforge.conf /etc/nginx/sites-available/buzzforge
sudo nano /etc/nginx/sites-available/buzzforge
```

Replace `YOUR_DOMAIN_OR_IP` with your real domain or VPS IP.

```bash
sudo ln -s /etc/nginx/sites-available/buzzforge /etc/nginx/sites-enabled/buzzforge
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Enable HTTPS (recommended)

If you have a domain:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Domain and IP FAQ

- You cannot use a custom domain you do not own.
- You can still access your app directly via VPS IP.
- For a free hostname, you can use dynamic DNS/free subdomain providers and point them to your VPS IP.
- For production trust and stable HTTPS, buy a domain and point A/AAAA records to your VPS.

## Future Enhancements

- User authentication and profiles
- Dark mode theme
- Email notifications
- SEO optimization
- Social media integration
- Analytics dashboard

## License

MIT

## Author

BuzzForge Team
