"use client"

import React from 'react';
import { useMouseGlow } from '@/hooks/useMouseGlow';
import { Card, CardBody, Tooltip, cn } from '@heroui/react';
import { useFormContext } from 'react-hook-form';
import { SOL_PH_VOLATILITY, SOL_PH_RISK_FREE_RATE } from '@/constants/constants';
import { formatNumberWithCommas } from '@/utils/utils';
import { 
  calculateIntrinsicValue, 
  calculateExtrinsicValue 
} from '@/constants/option-lab/calculations';
import { Info } from 'lucide-react';

interface AdvancedOptionDetailsProps {
  assetPrice: number | null;
  showTitle?: boolean;
  collateralInfo?: {
    collateralProvided: string;
    collateralType: string;
    collateralPrice: number;
    borrowCost?: number;
    borrowFee?: number;
  };
}

export function AdvancedOptionDetails({ assetPrice, showTitle = true, collateralInfo }: AdvancedOptionDetailsProps) {
  const cardRef = useMouseGlow();
  const methods = useFormContext();
  const formValues = methods.watch();
  
  const {
    asset,
    optionType,
    strikePrice,
    premium,
    quantity,
    expirationDate
  } = formValues;

  // Calculate days to expiration
  const daysToExpiration = expirationDate ? Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
  
  // Calculate daily theta yield
  const dailyThetaYield = premium && quantity && daysToExpiration > 0 
    ? (Number(premium) * quantity * 100) / daysToExpiration
    : 0;

  return (
    <Card 
      ref={cardRef}
      className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
      style={{
        background: `
          radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
            rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0))), 
            transparent 40%
          ),
          linear-gradient(to bottom right, 
            rgb(15 23 42 / 0.4), 
            rgb(30 41 59 / 0.3), 
            rgb(51 65 85 / 0.2)
          )
        `
      }}
    >
      <CardBody className="p-4">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
              <Info className="w-3 h-3 text-[#4a85ff]" />
            </div>
            <h4 className="text-sm font-medium text-white">Advanced Option Details</h4>
          </div>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-white/40">Implied Volatility</p>
              <Tooltip 
                content={
                  <div className="text-xs font-light text-white/70 max-w-xs">
                    Market expectation of future price movement for <span style={{ color: '#4a85ff', textShadow: '0 0 8px #4a85ff88, 0 0 2px #4a85ff' }}>{asset || 'the asset'}</span>. Higher volatility increases option premiums as larger price swings become more likely.
                  </div>
                }
                placement="top"
              >
                <Info className="w-3 h-3 text-white/30 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-sm font-medium text-white">{(SOL_PH_VOLATILITY * 100).toFixed(2)}%</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-white/40">Risk-Free Rate</p>
              <Tooltip 
                content={
                  <div className="text-xs font-light text-white/70 max-w-xs">
                    Interest rate of &quot;risk-free&quot; investments (like Lending USDC). Used as the baseline for pricing models to calculate theoretical option values.
                  </div>
                }
                placement="top"
              >
                <Info className="w-3 h-3 text-white/30 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-sm font-medium text-white">{(SOL_PH_RISK_FREE_RATE * 100).toFixed(2)}%</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-white/40">Moneyness</p>
              <Tooltip 
                content={
                  <div className="text-xs font-light text-white/70 max-w-xs">
                    Shows how much of the option&apos;s premium comes from immediate profit (IV) vs time/volatility value (EV). Helps assess risk and pricing efficiency.
                  </div>
                }
                placement="top"
              >
                <Info className="w-3 h-3 text-white/30 cursor-help" />
              </Tooltip>
            </div>
            {/* Value Breakdown Display */}
            {assetPrice && strikePrice && premium && Number(premium) > 0 ? (
              (() => {
                const intrinsicValue = calculateIntrinsicValue(optionType, assetPrice, Number(strikePrice));
                const extrinsicValue = calculateExtrinsicValue(Number(premium), intrinsicValue);
                const totalValue = intrinsicValue + extrinsicValue;
                const intrinsicPercentage = totalValue > 0 ? (intrinsicValue / totalValue) * 100 : 0;
                const extrinsicPercentage = totalValue > 0 ? (extrinsicValue / totalValue) * 100 : 0;
                const intrinsicDominant = intrinsicPercentage > extrinsicPercentage;
                
                return (
                  <div className="flex items-center gap-2">
                    <span 
                      className={`text-xs font-medium text-green-400 transition-all duration-300 ${
                        intrinsicDominant ? 'drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]' : ''
                      }`}
                    >
                      IV
                    </span>
                    
                    <Tooltip 
                      content={
                        <div className="text-xs font-light space-y-1">
                          <div><span className="text-green-400">Intrinsic Value</span>: ${intrinsicValue.toFixed(2)} ({intrinsicPercentage.toFixed(1)}%)</div>
                          <div><span className="text-red-400">Extrinsic Value</span>: ${extrinsicValue.toFixed(2)} ({extrinsicPercentage.toFixed(1)}%)</div>
                        </div>
                      }
                      placement="top"
                    >
                      <div className="relative h-2 w-16 bg-white/10 rounded-full overflow-hidden cursor-help">
                        <div 
                          className="absolute left-0 h-full bg-green-400 transition-all duration-300"
                          style={{ 
                            width: `${intrinsicPercentage}%`,
                            boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                          }}
                        />
                        <div 
                          className="absolute right-0 h-full bg-red-400 transition-all duration-300"
                          style={{ 
                            width: `${extrinsicPercentage}%`,
                            boxShadow: '0 0 8px rgba(248, 113, 113, 0.6)'
                          }}
                        />
                      </div>
                    </Tooltip>
                    
                    <span 
                      className={`text-xs font-medium text-red-400 transition-all duration-300 ${
                        !intrinsicDominant ? 'drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]' : ''
                      }`}
                    >
                      EV
                    </span>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm font-medium text-white">-</p>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-white/40">Option Premium</p>
              <Tooltip 
                content={
                  <div className="text-xs font-light text-white/70 max-w-xs">
                    The price paid by the buyer for each option contract. This is the maximum profit for the option seller at expiration.
                  </div>
                }
                placement="top"
              >
                <Info className="w-3 h-3 text-white/30 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-sm font-medium text-blue-400 transition-all duration-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] hover:drop-shadow-[0_0_12px_rgba(96,165,250,1)]">
              ${premium ? Number(premium).toFixed(2) : '0.00'}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-white/40">Total Value</p>
              <Tooltip 
                content={
                  <div className="text-xs font-light text-white/70">
                    Quantity × Option Premium × 100 (contract multiplier)
                  </div>
                }
                placement="top"
              >
                <Info className="w-3 h-3 text-white/30 cursor-help" />
              </Tooltip>
            </div>
            <p className="text-sm font-medium text-white">
              ${premium && quantity ? formatNumberWithCommas(Number(premium) * quantity * 100) : '0.00'}
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-white/40">Days to Expiration</p>
                <Tooltip 
                  content={
                    <div className="text-xs font-light text-white/70">
                      {expirationDate ? 
                        `Expires: ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()} UTC` 
                        : 'Expiration date and time in UTC'
                      }
                    </div>
                  }
                  placement="top"
                >
                  <Info className="w-3 h-3 text-white/30 cursor-help" />
                </Tooltip>
              </div>
              <p className="text-sm font-medium text-white">
                {expirationDate ? Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : '-'}
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-white/40">Break-Even Price</p>
                <Tooltip 
                  content={
                    <div className="text-xs font-light text-white/70">
                      {optionType === 'call' ? 'Strike Price + Premium' : 'Strike Price - Premium'}
                    </div>
                  }
                  placement="top"
                >
                  <Info className="w-3 h-3 text-white/30 cursor-help" />
                </Tooltip>
              </div>
              <p className="text-sm font-medium text-white">
                {strikePrice && premium ? 
                  `$${(optionType === 'call' 
                    ? (Number(strikePrice) + Number(premium))
                    : (Number(strikePrice) - Number(premium))).toFixed(2)}` 
                  : '-'
                }
              </p>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-white/40">Est. Max Profit</p>
                <Tooltip 
                  content={
                    <div className="text-xs font-light text-white/70 max-w-xs">
                      Maximum profit earned if the option expires worthless to the buyer. This is an estimate and may not be accurate!
                    </div>
                  }
                  placement="top"
                >
                  <Info className="w-3 h-3 text-white/30 cursor-help" />
                </Tooltip>
              </div>
              <Tooltip 
                content={
                  <div className="text-xs font-light space-y-1">
                    <div>Avg. Daily Yield: <span className="text-green-400">${dailyThetaYield.toFixed(2)}</span></div>
                  </div>
                }
                placement="top"
              >
                <p className="text-sm font-medium text-green-400 cursor-help underline decoration-dotted decoration-green-400/60 hover:decoration-green-400 transition-colors underline-offset-2">
                  {premium && quantity ? `$${formatNumberWithCommas(Number(premium) * quantity * 100)}` : '-'}
                </p>
              </Tooltip>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-white/40">Est. Max Loss</p>
                <Tooltip 
                  content={
                    <div className="text-xs font-light text-white/70 max-w-xs">
                      Maximum potential loss based on collateral provided. This represents the amount at risk if the option expires in-the-money for the buyer.
                    </div>
                  }
                  placement="top"
                >
                  <Info className="w-3 h-3 text-white/30 cursor-help" />
                </Tooltip>
              </div>
              {collateralInfo && Number(collateralInfo.collateralProvided) > 0 ? (
                <Tooltip 
                  content={
                    <div className="text-xs font-light space-y-1">
                      <div>Collateral Provided: <span className="text-red-400">
                        ${formatNumberWithCommas(Number(collateralInfo.collateralProvided) * collateralInfo.collateralPrice)}
                      </span></div>
                      {collateralInfo.borrowCost && daysToExpiration > 0 && (
                        <div>Margin Interest: <span className="text-red-400">${collateralInfo.borrowCost.toFixed(2)}</span></div>
                      )}
                      {collateralInfo.borrowFee && (
                        <div>Borrow Fee: <span className="text-red-400">${collateralInfo.borrowFee.toFixed(2)}</span></div>
                      )}
                    </div>
                  }
                  placement="top"
                >
                  <p className="text-sm font-medium text-red-400 cursor-help underline decoration-dotted decoration-red-400/60 hover:decoration-red-400 transition-colors underline-offset-2">
                    ${formatNumberWithCommas(Number(collateralInfo.collateralProvided) * collateralInfo.collateralPrice)}
                  </p>
                </Tooltip>
              ) : (
                <p className="text-sm font-medium text-red-400">-</p>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
