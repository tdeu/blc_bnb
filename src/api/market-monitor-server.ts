// Market Monitor Server - Handles automated market monitoring and resolution
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MarketMonitorService } from '../services/marketMonitorService';
import { getFinalResolutionExecutor } from '../services/finalResolutionExecutor';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.MONITOR_PORT || 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

// Initialize services
const marketMonitor = new MarketMonitorService();

// Initialize final resolution executor
// DRY_RUN mode can be controlled via environment variable
const isDryRun = process.env.FINAL_RESOLUTION_DRY_RUN === 'true';
const finalResolutionExecutor = getFinalResolutionExecutor(isDryRun);

if (isDryRun) {
  console.log('⚠️ Final Resolution Executor running in DRY-RUN mode');
  console.log('   Set FINAL_RESOLUTION_DRY_RUN=false in .env to enable live mode');
}

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BlockCast Market Monitor',
    timestamp: new Date().toISOString(),
    monitor: marketMonitor.getStatus()
  });
});

app.get('/status', (req, res) => {
  const status = marketMonitor.getStatus();
  res.json({
    service: 'Market Monitor Service',
    ...status,
    timestamp: new Date().toISOString()
  });
});

app.post('/run-once', async (req, res) => {
  try {
    // Run market monitor (preliminary resolution)
    const monitorStatus = await marketMonitor.runOnce();

    // Run final resolution executor (separate, non-blocking)
    const finalResolutionResults = await finalResolutionExecutor.execute();

    res.json({
      success: true,
      monitor: monitorStatus,
      finalResolution: {
        executed: finalResolutionResults.length,
        successful: finalResolutionResults.filter(r => r.success).length,
        failed: finalResolutionResults.filter(r => !r.success).length,
        results: finalResolutionResults
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run monitor once'
    });
  }
});

// New endpoint: Run only final resolution executor
app.post('/run-final-resolution', async (req, res) => {
  try {
    console.log('🔍 Manual final resolution execution requested...');
    const results = await finalResolutionExecutor.execute();

    res.json({
      success: true,
      executed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      mode: finalResolutionExecutor.getStatus(),
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run final resolution'
    });
  }
});

app.post('/start', (req, res) => {
  try {
    marketMonitor.start();
    res.json({
      success: true,
      message: 'Market monitor service started',
      status: marketMonitor.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start monitor'
    });
  }
});

app.post('/stop', (req, res) => {
  try {
    marketMonitor.stop();
    res.json({
      success: true,
      message: 'Market monitor service stopped',
      status: marketMonitor.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop monitor'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BlockCast Market Monitor Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Status endpoint: http://localhost:${PORT}/status`);

  // Start market monitoring automatically
  console.log(`🔄 Auto-starting market monitor service...`);
  marketMonitor.start();

  // Log final resolution executor status
  console.log(`⚖️ Final Resolution Executor: ${finalResolutionExecutor.getStatus()} mode`);
  console.log(`   To run final resolution manually: POST http://localhost:${PORT}/run-final-resolution`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Market Monitor Server...');
  marketMonitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Market Monitor Server...');
  marketMonitor.stop();
  process.exit(0);
});

export default app;