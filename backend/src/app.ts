import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { testConnection } from './utils/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Restaurant Management System API',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method 
  });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  
  // Don't send stack trace in production
  const isDevelopment = NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    const server = app.listen(PORT, () => {
      console.log('🚀================================🚀');
      console.log(`🏪 Restaurant Management System API`);
      console.log(`🌟 Server running on port ${PORT}`);
      console.log(`📍 API base URL: http://localhost:${PORT}/api`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log('🚀================================🚀');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🔄 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;