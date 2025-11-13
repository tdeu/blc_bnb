import { ethers } from 'ethers';
import { supabase } from '../utils/supabase';
import { TOKEN_ADDRESSES } from '../config/constants';

const BUYCAST_ABI = [
  "event CastPurchased(address indexed buyer, uint256 bnbAmount, uint256 castAmount)"
];

interface PurchaseEvent {
  buyer: string;
  bnbAmount: bigint;
  castAmount: bigint;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

class CastPurchaseTracker {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private isListening: boolean = false;
  private lastProcessedBlock: number = 0;

  /**
   * Initialize the tracker
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing CAST Purchase Tracker...');

    this.provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');

    this.contract = new ethers.Contract(
      TOKEN_ADDRESSES.BUYCAST_CONTRACT,
      BUYCAST_ABI,
      this.provider
    );

    // Get current block number
    this.lastProcessedBlock = await this.provider.getBlockNumber();
    console.log('✅ Tracker initialized at block:', this.lastProcessedBlock);
  }

  /**
   * Start listening for purchase events
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('⚠️ Tracker already listening');
      return;
    }

    if (!this.contract || !this.provider) {
      throw new Error('Tracker not initialized');
    }

    console.log('👂 Starting to listen for CastPurchased events...');

    // Listen for new CastPurchased events
    this.contract.on('CastPurchased', async (buyer, bnbAmount, castAmount, event) => {
      console.log('🔔 New CastPurchased event detected!');

      try {
        const block = await event.getBlock();

        const purchaseEvent: PurchaseEvent = {
          buyer,
          bnbAmount,
          castAmount,
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          timestamp: block.timestamp
        };

        await this.processPurchaseEvent(purchaseEvent);
      } catch (error) {
        console.error('❌ Error processing purchase event:', error);
      }
    });

    this.isListening = true;
    console.log('✅ Listening for CastPurchased events');
  }

  /**
   * Stop listening for events
   */
  stopListening(): void {
    if (this.contract) {
      this.contract.removeAllListeners('CastPurchased');
      this.isListening = false;
      console.log('🔇 Stopped listening for events');
    }
  }

  /**
   * Process a purchase event and store in database
   */
  private async processPurchaseEvent(event: PurchaseEvent): Promise<void> {
    console.log('📝 Processing purchase event:', {
      buyer: event.buyer,
      bnbAmount: ethers.formatEther(event.bnbAmount),
      castAmount: ethers.formatEther(event.castAmount),
      txHash: event.transactionHash
    });

    try {
      // Check if event already exists
      const { data: existing } = await supabase
        .from('cast_purchases')
        .select('id')
        .eq('transaction_hash', event.transactionHash)
        .single();

      if (existing) {
        console.log('⚠️ Purchase already recorded:', event.transactionHash);
        return;
      }

      // Insert into database
      const { error } = await supabase
        .from('cast_purchases')
        .insert({
          buyer_address: event.buyer.toLowerCase(),
          bnb_amount: ethers.formatEther(event.bnbAmount),
          cast_amount: ethers.formatEther(event.castAmount),
          transaction_hash: event.transactionHash,
          block_number: event.blockNumber,
          timestamp: new Date(event.timestamp * 1000).toISOString()
        });

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }

      console.log('✅ Purchase recorded successfully');

      // Update last processed block
      this.lastProcessedBlock = event.blockNumber;
    } catch (error) {
      console.error('❌ Error storing purchase event:', error);
      throw error;
    }
  }

  /**
   * Sync historical purchases from blockchain
   * Use this to backfill purchases that happened before tracker started
   */
  async syncHistoricalPurchases(fromBlock?: number): Promise<number> {
    if (!this.contract || !this.provider) {
      throw new Error('Tracker not initialized');
    }

    console.log('🔄 Syncing historical purchases...');

    try {
      // Get deployment block or use provided fromBlock
      const startBlock = fromBlock || this.lastProcessedBlock - 10000; // Look back 10k blocks
      const currentBlock = await this.provider.getBlockNumber();

      console.log(`Querying events from block ${startBlock} to ${currentBlock}`);

      // Query past events
      const filter = this.contract.filters.CastPurchased();
      const events = await this.contract.queryFilter(filter, startBlock, currentBlock);

      console.log(`📊 Found ${events.length} historical purchase events`);

      let processedCount = 0;

      for (const event of events) {
        try {
          const block = await event.getBlock();
          const args = event.args as any;

          const purchaseEvent: PurchaseEvent = {
            buyer: args.buyer,
            bnbAmount: args.bnbAmount,
            castAmount: args.castAmount,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: block.timestamp
          };

          await this.processPurchaseEvent(purchaseEvent);
          processedCount++;
        } catch (error) {
          console.error(`⚠️ Error processing event at block ${event.blockNumber}:`, error);
          // Continue with next event
        }
      }

      console.log(`✅ Processed ${processedCount} historical purchases`);
      return processedCount;
    } catch (error) {
      console.error('❌ Error syncing historical purchases:', error);
      throw error;
    }
  }

  /**
   * Get purchase by transaction hash (from blockchain)
   */
  async getPurchaseByTxHash(txHash: string): Promise<PurchaseEvent | null> {
    if (!this.provider) {
      throw new Error('Tracker not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) return null;

      const block = await this.provider.getBlock(receipt.blockNumber);
      if (!block) return null;

      // Parse logs for CastPurchased event
      const iface = new ethers.Interface(BUYCAST_ABI);

      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });

          if (parsed && parsed.name === 'CastPurchased') {
            return {
              buyer: parsed.args.buyer,
              bnbAmount: parsed.args.bnbAmount,
              castAmount: parsed.args.castAmount,
              transactionHash: txHash,
              blockNumber: receipt.blockNumber,
              timestamp: block.timestamp
            };
          }
        } catch {
          // Not the event we're looking for
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching purchase by tx hash:', error);
      return null;
    }
  }

  /**
   * Check if tracker is currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * Get last processed block number
   */
  getLastProcessedBlock(): number {
    return this.lastProcessedBlock;
  }
}

// Export singleton instance
export const castPurchaseTracker = new CastPurchaseTracker();
