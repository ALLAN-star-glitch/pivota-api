import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PricingService {
  
  /**
   * Calculates the quote based on plan isPremium status and feature prices.
   */
  calculateQuote(
    plan: { isPremium: boolean }, 
    features: { prices: Record<string, number> }, 
    requestedCycle?: string, 
    amountPaid = 0 // Removed ': number' as it is trivially inferred
  ) {
    // 1. Handle Free Plans (isPremium: false)
    if (!plan.isPremium) {
      const foreverDate = new Date();
      foreverDate.setFullYear(foreverDate.getFullYear() + 10);
      
      return {
        totalAmount: 0,
        amountPaid: 0,
        billingCycle: 'monthly',
        expiresAt: foreverDate,
        status: 'ACTIVE' as const,
      };
    }

    // 2. Validate Cycle for Paid Plans
    const cycle = requestedCycle || 'monthly';
    const totalAmount = features.prices[cycle];

    if (totalAmount === undefined) {
      throw new BadRequestException(`Pricing not configured for cycle: ${cycle}`);
    }

    // 3. Calculate Expiry and Status
    const expiresAt = this.calculateExpiry(cycle, amountPaid, totalAmount);
    const status = amountPaid < totalAmount ? 'PARTIALLY_PAID' : 'ACTIVE';

    return {
      totalAmount,
      amountPaid,
      billingCycle: cycle,
      expiresAt,
      status,
    };
  }

  private calculateExpiry(cycle: string, paid: number, total: number): Date {
    const now = new Date();
    // Record<string, number> satisfies the "no implicit any" without a 'type' block
    const cycleMonthsMap: Record<string, number> = { 
      monthly: 1, 
      quarterly: 3, 
      halfYearly: 6, 
      annually: 12 
    };

    const fullMonths = cycleMonthsMap[cycle] || 1;

    // Full Payment
    if (paid >= total) {
      now.setMonth(now.getMonth() + fullMonths);
      return now;
    }

    // Partial Payment Logic (50% Threshold as per previous logic)
    if (paid / total < 0.5) {
      throw new BadRequestException('Minimum 50% payment required for partial activation.');
    }

    const proportionalMonths = fullMonths * (paid / total);
    now.setMonth(now.getMonth() + Math.floor(proportionalMonths));
    return now;
  }
}