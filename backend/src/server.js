const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const { requestMiddleware, metricsHandler } = require('./middleware/metrics');

dotenv.config();

mongoose.set('strictQuery', true);

const app = express();

app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use('/api', apiLimiter);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Prometheus request metrics
app.use(requestMiddleware);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/buzzforge';

// Routes
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const likeRoutes = require('./routes/likes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Prometheus metrics endpoint (restrict to internal network via nginx/firewall in production)
if (process.env.METRICS_ENABLED !== 'false') {
  app.get('/metrics', metricsHandler);
}

// Global error handler — must be registered last, after all routes
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });

    console.log('MongoDB connected');

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      // Signal to PM2 that the app is ready (used with wait_ready: true)
      if (process.send) {
        process.send('ready');
      }
    });

    const shutdown = (signal) => {
      console.log(`${signal} received — starting graceful shutdown`);

      server.close(async () => {
        console.log('HTTP server closed');
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
        } catch (err) {
          console.error('Error closing MongoDB connection:', err.message);
        }
        process.exit(0);
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        console.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

startServer();
