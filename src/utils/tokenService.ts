import { TOKEN_CONFIG, CollateralToken } from '../config/constants';

/**
 * Token Service - Handles token conversions and display formatting
 *
 * This service bridges the gap between:
 * - UI Layer: Shows HBAR for user-friendly experience
 * - Contract Layer: Uses CAST tokens for actual transactions
 */
export class TokenService {

  /**
   * Convert amount from display token to contract token
   * @param amount Amount in display token (HBAR)
   * @returns Amount in contract token (CAST)
   */
  static toContractAmount(amount: string): string {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0';

    // If primary token is CAST, no conversion needed
    if (TOKEN_CONFIG.PRIMARY_BETTING_TOKEN === 'CAST') {
      return amount;
    }

    // Convert HBAR to CAST for contracts
    const castAmount = numAmount * TOKEN_CONFIG.EXCHANGE_RATES.HBAR_TO_CAST;
    return castAmount.toString();
  }

  /**
   * Convert amount from contract token to display token
   * @param amount Amount in contract token (CAST)
   * @returns Amount in display token (HBAR)
   */
  static toDisplayAmount(amount: string): string {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0';

    // If primary token is CAST, no conversion needed
    if (TOKEN_CONFIG.PRIMARY_BETTING_TOKEN === 'CAST') {
      return amount;
    }

    // Convert CAST to HBAR for display
    const hbarAmount = numAmount * TOKEN_CONFIG.EXCHANGE_RATES.CAST_TO_HBAR;
    return hbarAmount.toString();
  }

  /**
   * Get the token symbol for UI display
   */
  static getDisplayTokenSymbol(): CollateralToken {
    return TOKEN_CONFIG.PRIMARY_BETTING_TOKEN;
  }

  /**
   * Get the token symbol for contracts
   */
  static getContractTokenSymbol(): CollateralToken {
    return TOKEN_CONFIG.CONTRACT_COLLATERAL_TOKEN;
  }

  /**
   * Format amount for UI display with proper token symbol
   * @param amount Amount to display
   * @param showBothTokens Whether to show both HBAR and CAST amounts
   */
  static formatDisplayAmount(amount: string, showBothTokens: boolean = TOKEN_CONFIG.SHOW_BOTH_TOKENS): string {
    const displayAmount = this.toDisplayAmount(amount);
    const displayToken = this.getDisplayTokenSymbol();

    if (!showBothTokens || TOKEN_CONFIG.PRIMARY_BETTING_TOKEN === 'CAST') {
      return `${parseFloat(displayAmount).toFixed(3)} ${displayToken}`;
    }

    // Show both tokens for clarity
    const contractAmount = amount;
    const contractToken = this.getContractTokenSymbol();

    return `${parseFloat(displayAmount).toFixed(3)} ${displayToken} (${parseFloat(contractAmount).toFixed(0)} ${contractToken})`;
  }

  /**
   * Validate amount in display token
   */
  static validateDisplayAmount(amount: string, minAmount: string, maxAmount: string): {
    isValid: boolean;
    error?: string;
  } {
    const numAmount = parseFloat(amount);
    const numMin = parseFloat(minAmount);
    const numMax = parseFloat(maxAmount);

    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: 'Please enter a valid amount' };
    }

    if (numAmount < numMin) {
      return {
        isValid: false,
        error: `Minimum amount: ${numMin} ${this.getDisplayTokenSymbol()}`
      };
    }

    if (numAmount > numMax) {
      return {
        isValid: false,
        error: `Insufficient balance. You have ${numMax} ${this.getDisplayTokenSymbol()}`
      };
    }

    return { isValid: true };
  }

  /**
   * Get conversion info for user understanding
   */
  static getConversionInfo(): {
    displayToken: CollateralToken;
    contractToken: CollateralToken;
    rate: string;
    showConversion: boolean;
  } {
    return {
      displayToken: this.getDisplayTokenSymbol(),
      contractToken: this.getContractTokenSymbol(),
      rate: `1 ${this.getDisplayTokenSymbol()} = ${TOKEN_CONFIG.EXCHANGE_RATES.HBAR_TO_CAST} ${this.getContractTokenSymbol()}`,
      showConversion: TOKEN_CONFIG.PRIMARY_BETTING_TOKEN !== TOKEN_CONFIG.CONTRACT_COLLATERAL_TOKEN
    };
  }
}

export default TokenService;