/**
 * Final Resolution Executor
 *
 * Handles the execution of final resolutions for markets
 * that have completed their evidence collection period.
 *
 * This is a stub implementation to prevent the market-monitor-server from crashing.
 * The actual resolution logic is handled by automaticResolutionMonitor.
 */

export interface ResolutionResult {
  marketId: string;
  success: boolean;
  outcome?: 'yes' | 'no';
  error?: string;
  transactionHash?: string;
}

class FinalResolutionExecutor {
  private isDryRun: boolean;

  constructor(isDryRun: boolean = true) {
    this.isDryRun = isDryRun;
    console.log(`🔧 FinalResolutionExecutor initialized (${isDryRun ? 'DRY-RUN' : 'LIVE'} mode)`);
  }

  /**
   * Execute final resolution for markets with expired evidence periods
   */
  async execute(): Promise<ResolutionResult[]> {
    console.log('⚖️ FinalResolutionExecutor.execute() called');

    if (this.isDryRun) {
      console.log('   DRY-RUN mode: No actual resolution will be performed');
      console.log('   Use PendingResolutionManager in admin panel for actual resolution');
    }

    // This is handled by the PendingResolutionManager component
    // and automaticResolutionMonitor service instead
    console.log('   Resolution is handled by automaticResolutionMonitor');
    console.log('   Markets in evidence_collection status need admin review');

    return [];
  }

  /**
   * Get current mode status
   */
  getStatus(): string {
    return this.isDryRun ? 'DRY-RUN' : 'LIVE';
  }
}

// Factory function to create executor with specified mode
export function getFinalResolutionExecutor(isDryRun: boolean = true): FinalResolutionExecutor {
  return new FinalResolutionExecutor(isDryRun);
}

// Export default instance (dry-run mode for safety)
export const finalResolutionExecutor = new FinalResolutionExecutor(true);
