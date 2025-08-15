import { FC, useState, useEffect, useMemo } from 'react'
import React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Tooltip,
  Card,
  CardBody,
  Button,
  ScrollShadow
} from "@heroui/react"
import { cn } from "@/utils/utils"
import { GreekFilters } from './option-chain-user-settings'
import { OptionContract, SelectedOption, generateMockOptionData } from './option-data'


import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { MAX_OPTION_LEGS } from '@/constants/constants'
import { toast } from "@/hooks/useToast"

interface OptionChainTableProps {
  assetId?: string
  expirationDate?: string | null
  greekFilters?: GreekFilters
  onOptionsChange?: (options: SelectedOption[]) => void
  initialSelectedOptions?: SelectedOption[]
  useGreekSymbols?: boolean
  onOrderPlaced?: () => void
  onSwitchToCreateOrder?: () => void
}

export const OptionChainTable: FC<OptionChainTableProps> = ({ 
  assetId = 'SOL',
  expirationDate,
  greekFilters = {
    delta: true,
    theta: true,
    gamma: false,
    vega: false,
    rho: false,
    oa: false,
    oi: false,
    volume: true
  },
  onOptionsChange,
  initialSelectedOptions = [],
  useGreekSymbols = false,
  onOrderPlaced,
  onSwitchToCreateOrder
}) => {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([])
  const [hoveredPrice, setHoveredPrice] = useState<{index: number, side: 'call' | 'put', type: 'bid' | 'ask'} | null>(null)
  const visibleGreeks = useMemo(() => greekFilters, [greekFilters])
  const prevInitialOptionsRef = React.useRef<SelectedOption[]>([]);
  const [refreshVolume, setRefreshVolume] = useState(0); // Counter to force refresh

  // Use useMemo to compute the shouldDisableOptionButtons flag
  const shouldDisableOptionButtons = useMemo(
    () => selectedOptions.length >= MAX_OPTION_LEGS,
    [selectedOptions.length]
  );

  // Get the current spot price from the asset price context
  const { price: spotPrice } = useAssetPriceInfo(assetId || '')

  // Helper functions to determine if options are ITM or OTM
  const isCallITM = (strike: number): boolean => {
    return spotPrice !== undefined && spotPrice > strike
  }
  
  const isPutITM = (strike: number): boolean => {
    return spotPrice !== undefined && spotPrice < strike
  }



  // Sync with initialSelectedOptions when they change from the parent
  useEffect(() => {
    // Check if initialSelectedOptions has actually changed
    const prevOptions = prevInitialOptionsRef.current;
    const optionsChanged = 
      prevOptions.length !== initialSelectedOptions.length || 
      !initialSelectedOptions.every((opt, idx) => 
        opt.index === prevOptions[idx]?.index && 
        opt.side === prevOptions[idx]?.side && 
        opt.type === prevOptions[idx]?.type);
        
    if (optionsChanged) {
      setSelectedOptions(initialSelectedOptions);
      // Update ref with current initialSelectedOptions
      prevInitialOptionsRef.current = [...initialSelectedOptions];
    }
  }, [initialSelectedOptions]);

  // Handler for when an order is placed
  const handleOrderPlaced = () => {
    // Increment refresh counter to force option chain to regenerate with updated volumes
    setRefreshVolume(prev => prev + 1);
    
    // Call parent handler if provided
    if (onOrderPlaced) {
      onOrderPlaced();
    }
  };

  // Get mock data using the generator function with the current spot price
  const mockData: OptionContract[] = React.useMemo(() => 
    generateMockOptionData(expirationDate || null, spotPrice || 0, refreshVolume),
    [expirationDate, refreshVolume, spotPrice]
  );

  // Calculate the position for the price indicator line
  const priceIndicatorPosition = useMemo(() => {
    if (spotPrice == null || !mockData.length) return { showLine: false, insertAfterIndex: -1 };
    
    // Find the index after which to show the price line
    for (let i = 0; i < mockData.length; i++) {
      if (spotPrice <= mockData[i].strike) {
        return { showLine: true, insertAfterIndex: i - 1 };
      }
    }
    
    // If spot price is higher than all strikes, show after the last row
    return { showLine: true, insertAfterIndex: mockData.length - 1 };
  }, [spotPrice, mockData]);

  // Renderer function for price indicator row
  const renderPriceIndicatorRow = (key: string) => (
    <TableRow key={key} className="h-0 relative">
      <TableCell colSpan={columns.length} className="p-0 h-0 border-none">
        <div className="absolute inset-x-0 top-0 flex items-center justify-center z-10">
          <div className="flex items-center w-full max-w-4xl mx-auto px-4">
            <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-[#4a85ff]/80 to-[#4a85ff]/80"></div>
            <div className="flex items-center space-x-1.5 bg-gradient-to-r from-[#4a85ff]/20 via-[#4a85ff]/30 to-[#4a85ff]/20 border border-[#4a85ff]/60 rounded-full px-2 py-0.5 backdrop-blur-sm mx-2">
              <div className="w-1.5 h-1.5 bg-[#4a85ff] rounded-full animate-pulse"></div>
              <span className="text-[#4a85ff] font-bold text-xs whitespace-nowrap">
                ${formatPrice(spotPrice)}
              </span>
              <div className="w-1.5 h-1.5 bg-[#4a85ff] rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1 h-0.5 bg-gradient-to-r from-[#4a85ff]/80 to-transparent"></div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );

  const handlePriceClick = (index: number, side: 'call' | 'put', type: 'bid' | 'ask') => {
    const option = mockData[index];
    if (!option) return;
    
    const price = side === 'call' 
      ? (type === 'bid' ? option.callBid : option.callAsk)
      : (type === 'bid' ? option.putBid : option.putAsk)
    
    const newOption: SelectedOption = { 
      index, 
      side, 
      type,
      strike: option.strike,
      expiry: option.expiry,
      asset: assetId,
      price,
      quantity: 0.01 // Set initial quantity to 0.01 (1% of a contract)
    }
    
    setSelectedOptions(prev => {
      // Check if this option is already selected
      const existingIndex = prev.findIndex(
        opt => opt.index === index && opt.side === side && opt.type === type
      )
      
      if (existingIndex >= 0) {
        // Remove if already selected (toggle off)
        const updatedOptions = prev.filter((_, i) => i !== existingIndex);
        return updatedOptions;
      } else {
        // Check if adding this option would exceed the maximum limit
        if (prev.length >= MAX_OPTION_LEGS) {
          // Show a toast notification
          toast({
            title: "Maximum options reached",
            description: `You can only select up to ${MAX_OPTION_LEGS} option legs at a time.`,
            variant: "destructive",
          });
          // Return unchanged selection
          return prev;
        }

        // First remove any other selection for the same index and side (different type)
        const filteredOptions = prev.filter(
          opt => !(opt.index === index && opt.side === side && opt.type !== type)
        )
        
        // Then add the new selection
        return [...filteredOptions, newOption]
      }
    })
    
    // Switch to the create order tab when a price is clicked
    if (onSwitchToCreateOrder) {
      onSwitchToCreateOrder();
    }
  }

  const isOptionSelected = (index: number, side: 'call' | 'put', type: 'bid' | 'ask') => {
    return selectedOptions.some(
      opt => opt.index === index && opt.side === side && opt.type === type
    )
  }

  // Format price consistently with exactly 2 decimal places
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '0.00'
    if (Math.abs(price) < 0.01) return '0.00'
    return Number(Math.round(price * 100) / 100).toFixed(2)
  }

  // Format greek values consistently with appropriate decimal places
  const formatGreek = (value: number | null | undefined, decimals: number = 3) => {
    if (value === null || value === undefined) return '0.000'
    if (Math.abs(value) < 0.001) return '0.000'
    if (decimals === 2) {
      return Number(Math.round(value * 100) / 100).toFixed(2)
    }
    return Number(Math.round(value * 1000) / 1000).toFixed(3)
  }

  // Format volume and open interest as whole numbers
  const formatInteger = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '0'
    // Format with 2 decimal places if number has decimals, otherwise show as whole number
    return Number.isInteger(value) ? Math.round(value).toString() : value.toFixed(2)
  }

  // Notify parent component when selected options change
  useEffect(() => {
    // Only notify parent if the change originated from within this component
    // and not from a parent update via initialSelectedOptions
    if (!onOptionsChange) return;

    // Get a stable JSON representation of both arrays for comparison
    const currentSelectionJson = JSON.stringify(selectedOptions);
    const initialOptionsJson = JSON.stringify(prevInitialOptionsRef.current);
    
    // Only trigger the callback if this is a local change, not from parent props
    if (currentSelectionJson !== initialOptionsJson) {
      // Update our ref to prevent future duplicate notifications
      prevInitialOptionsRef.current = [...selectedOptions];
      onOptionsChange(selectedOptions);
    }
  }, [selectedOptions, onOptionsChange]);

  // Build table columns dynamically based on visible greeks
  const columns = useMemo(() => {
    const cols = [];
    
    // Call side columns
    if (visibleGreeks.volume) cols.push({ key: 'call-volume', label: 'Vol' });
    if (visibleGreeks.oi) cols.push({ key: 'call-oi', label: 'OI' });
    if (visibleGreeks.rho) cols.push({ key: 'call-rho', label: useGreekSymbols ? 'ρ' : 'Rho' });
    if (visibleGreeks.oa) cols.push({ key: 'call-oa', label: 'OA' });
    if (visibleGreeks.vega) cols.push({ key: 'call-vega', label: useGreekSymbols ? 'ν' : 'Vega' });
    if (visibleGreeks.gamma) cols.push({ key: 'call-gamma', label: useGreekSymbols ? 'γ' : 'Gamma' });
    if (visibleGreeks.theta) cols.push({ key: 'call-theta', label: useGreekSymbols ? 'θ' : 'Theta' });
    if (visibleGreeks.delta) cols.push({ key: 'call-delta', label: useGreekSymbols ? 'Δ' : 'Delta' });
    cols.push({ key: 'call-price', label: 'Price' });
    
    // Strike column
    cols.push({ key: 'strike', label: 'Strike' });
    
    // Put side columns
    cols.push({ key: 'put-price', label: 'Price' });
    if (visibleGreeks.delta) cols.push({ key: 'put-delta', label: useGreekSymbols ? 'Δ' : 'Delta' });
    if (visibleGreeks.theta) cols.push({ key: 'put-theta', label: useGreekSymbols ? 'θ' : 'Theta' });
    if (visibleGreeks.gamma) cols.push({ key: 'put-gamma', label: useGreekSymbols ? 'γ' : 'Gamma' });
    if (visibleGreeks.vega) cols.push({ key: 'put-vega', label: useGreekSymbols ? 'ν' : 'Vega' });
    if (visibleGreeks.rho) cols.push({ key: 'put-rho', label: useGreekSymbols ? 'ρ' : 'Rho' });
    if (visibleGreeks.oa) cols.push({ key: 'put-oa', label: 'OA' });
    if (visibleGreeks.oi) cols.push({ key: 'put-oi', label: 'OI' });
    if (visibleGreeks.volume) cols.push({ key: 'put-volume', label: 'Vol' });
    
    return cols;
  }, [visibleGreeks, useGreekSymbols]);

  // Modified price column rendering 
  const renderPriceColumn = (option: OptionContract, index: number, side: 'call' | 'put') => {
    
    return (
      <div className="flex flex-col space-y-0.5">
        <Button
          size="sm"
          variant={isOptionSelected(index, side, 'bid') ? 'solid' : 'bordered'}
          color={isOptionSelected(index, side, 'bid') ? 'success' : 'default'}
          onClick={() => handlePriceClick(index, side, 'bid')}
          onMouseEnter={() => setHoveredPrice({ index, side, type: 'bid' })}
          onMouseLeave={() => setHoveredPrice(null)}
          className={cn(
            "text-green-400 hover:text-green-300 transition-colors min-w-0 h-7 border-[0.5px]",
            (hoveredPrice?.index === index && 
            hoveredPrice?.side === side && 
            hoveredPrice?.type === 'bid') && "bg-green-500/20 border-green-500/50",
            isOptionSelected(index, side, 'bid') && "text-green-300",
            shouldDisableOptionButtons && !isOptionSelected(index, side, 'bid') && "opacity-50"
          )}
          isDisabled={shouldDisableOptionButtons && !isOptionSelected(index, side, 'bid')}
        >
          {formatPrice(side === 'call' ? option.callBid : option.putBid)}
        </Button>
        <Button
          size="sm"
          variant={isOptionSelected(index, side, 'ask') ? 'solid' : 'bordered'}
          color={isOptionSelected(index, side, 'ask') ? 'danger' : 'default'}
          onClick={() => handlePriceClick(index, side, 'ask')}
          onMouseEnter={() => setHoveredPrice({ index, side, type: 'ask' })}
          onMouseLeave={() => setHoveredPrice(null)}
          className={cn(
            "text-red-400 hover:text-red-300 transition-colors min-w-0 h-7 border-[0.5px]",
            (hoveredPrice?.index === index && 
            hoveredPrice?.side === side && 
            hoveredPrice?.type === 'ask') && "bg-red-500/20 border-red-500/50",
            isOptionSelected(index, side, 'ask') && "text-red-300",
            shouldDisableOptionButtons && !isOptionSelected(index, side, 'ask') && "opacity-50"
          )}
          isDisabled={shouldDisableOptionButtons && !isOptionSelected(index, side, 'ask')}
        >
          {formatPrice(side === 'call' ? option.callAsk : option.putAsk)}
        </Button>
      </div>
    );
  };

  const renderCellContent = (item: OptionContract, columnKey: string, index: number) => {

    switch (columnKey) {
      case 'call-volume':
        return <div className="text-center text-white">{formatInteger(item.callVolume)}</div>;
      case 'call-oi':
        return <div className="text-center text-white/60">{formatInteger(item.callOpenInterest)}</div>;
      case 'call-rho':
        return <div className="text-center text-white/60">{formatGreek(item.callGreeks.rho)}</div>;
      case 'call-oa':
        return <div className="text-center text-white/60">{formatInteger(item.callOptionsAvailable)}</div>;
      case 'call-vega':
        return <div className="text-center text-white/60">{formatGreek(item.callGreeks.vega)}</div>;
      case 'call-gamma':
        return <div className="text-center text-white/60">{formatGreek(item.callGreeks.gamma)}</div>;
      case 'call-theta':
        return <div className="text-center text-white">{formatGreek(item.callGreeks.theta)}</div>;
      case 'call-delta':
        return <div className="text-center text-white">{formatGreek(item.callGreeks.delta, 2)}</div>;
      case 'call-price':
        return (
          <div className="font-medium">
            {renderPriceColumn(item, index, 'call')}
          </div>
        );
      case 'strike':
        return (
          <div className="text-center font-bold bg-white/10 text-white py-1 px-2 rounded">
            ${formatPrice(item.strike)}
          </div>
        );
      case 'put-price':
        return (
          <div className="font-medium">
            {renderPriceColumn(item, index, 'put')}
          </div>
        );
      case 'put-delta':
        return <div className="text-center text-white">{formatGreek(item.putGreeks.delta, 2)}</div>;
      case 'put-theta':
        return <div className="text-center text-white">{formatGreek(item.putGreeks.theta)}</div>;
      case 'put-gamma':
        return <div className="text-center text-white/60">{formatGreek(item.putGreeks.gamma)}</div>;
      case 'put-vega':
        return <div className="text-center text-white/60">{formatGreek(item.putGreeks.vega)}</div>;
      case 'put-rho':
        return <div className="text-center text-white/60">{formatGreek(item.putGreeks.rho)}</div>;
      case 'put-oa':
        return <div className="text-center text-white/60">{formatInteger(item.putOptionsAvailable)}</div>;
      case 'put-oi':
        return <div className="text-center text-white/60">{formatInteger(item.putOpenInterest)}</div>;
      case 'put-volume':
        return <div className="text-center text-white">{formatInteger(item.putVolume)}</div>;
      default:
        return null;
    }
  };



  return (
    <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden">
      <CardBody className="p-4 bg-transparent">
        {/* Option legs counter */}
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-white/70">
            Selected: {selectedOptions.length}/{MAX_OPTION_LEGS} legs
          </div>
        </div>

        {/* Add visual header for CALLS and PUTS */}
        <div className="flex items-center justify-center mb-2">
          <div className="flex-1 text-center">
            <span className="text-lg font-bold text-[#4a85ff]">CALLS</span>
          </div>
          <div className="w-[100px] text-center">
            <span className="text-sm font-medium text-white/70">Strike</span>
          </div>
          <div className="flex-1 text-center">
            <span className="text-lg font-bold text-[#4a85ff]">PUTS</span>
          </div>
        </div>

        <div className="relative">
          <ScrollShadow 
            className="max-h-[400px]"
            size={40}
            visibility="both"
          >
            <Table 
              aria-label="Options chain table"
              className="min-h-[400px] bg-transparent"
              classNames={{
                wrapper: "bg-transparent border border-white/10 rounded-md overflow-visible",
                th: "bg-black text-white text-center backdrop-blur-md sticky top-0 z-20",
                td: "text-center bg-transparent border-b border-white/10",
                table: "bg-transparent",
                tbody: "bg-transparent",
                tr: "bg-transparent hover:bg-white/5",
              }}
            >
            <TableHeader>
              {columns.map((column) => (
                <TableColumn 
                  key={column.key} 
                  className={cn(
                    "text-center w-[85px] bg-black text-white backdrop-blur-sm",
                    column.key.startsWith('call-') && column.key !== 'call-price' && "text-[#4a85ff]/80",
                    column.key.startsWith('put-') && column.key !== 'put-price' && "text-[#4a85ff]/80",
                    column.key === 'strike' && "bg-black font-bold text-white"
                  )}
                >
                  {column.key === 'call-price' || column.key === 'put-price' ? (
                    <Tooltip
                      content={
                        <div className="text-center">
                          <div className="text-green-400">Bid</div>
                          <div className="text-red-400">Ask</div>
                        </div>
                      }
                      placement="top"
                    >
                      <span className="underline decoration-dotted decoration-white/50 cursor-help text-white">
                        {column.label}
                      </span>
                    </Tooltip>
                  ) : column.key === 'strike' ? (
                    <span className="text-white">{column.label}</span>
                  ) : (
                    <Tooltip
                      content={getTooltipContent(column.key)}
                      placement="top"
                    >
                      <span className="underline decoration-dotted decoration-white/50 cursor-help text-white">
                        {column.label}
                      </span>
                    </Tooltip>
                  )}
                </TableColumn>
              ))}
            </TableHeader>
            <TableBody emptyContent="No option data available">
              {(() => {
                const rows = [];
                
                // Add price indicator before first row if insertAfterIndex is -1
                if (priceIndicatorPosition.showLine && priceIndicatorPosition.insertAfterIndex === -1) {
                  rows.push(renderPriceIndicatorRow('price-indicator-before'));
                }
                
                // Add data rows with conditional price indicators after each row
                mockData.forEach((option, index) => {
                  // Add the data row
                  rows.push(
                    <TableRow 
                      key={`option-${index}`}
                      className="transition-colors text-white hover:bg-white/5 bg-transparent"
                    >
                      {columns.map((column) => (
                        <TableCell key={`${index}-${column.key}`}>
                          {renderCellContent(option, column.key, index)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                  
                  // Add price indicator after this row if conditions are met
                  if (priceIndicatorPosition.showLine && priceIndicatorPosition.insertAfterIndex === index) {
                    rows.push(renderPriceIndicatorRow(`price-indicator-after-${index}`));
                  }
                });
                
                return rows;
              })()}
            </TableBody>
            </Table>
          </ScrollShadow>
        </div>
      </CardBody>
    </Card>
  );
};

// Helper function for tooltip content
const getTooltipContent = (columnKey: string) => {
  const tooltips: Record<string, string> = {
    'call-volume': 'Volume - Contracts traded today (includes fractional contracts)',
    'call-oi': 'Open Interest - Total open contracts (includes fractional contracts)',
    'call-rho': 'Rho - Sensitivity to interest rate changes',
    'call-oa': 'Options Available - Quantity of options available to trade',
    'call-vega': 'Vega - Sensitivity to volatility changes',
    'call-gamma': 'Gamma - Rate of change in Delta',
    'call-theta': 'Theta - Time decay rate',
    'call-delta': 'Delta - Price change sensitivity',
    'put-delta': 'Delta - Price change sensitivity',
    'put-theta': 'Theta - Time decay rate',
    'put-gamma': 'Gamma - Rate of change in Delta',
    'put-vega': 'Vega - Sensitivity to volatility changes',
    'put-rho': 'Rho - Sensitivity to interest rate changes',
    'put-oa': 'Options Available - Quantity of options available to trade',
    'put-oi': 'Open Interest - Total open contracts (includes fractional contracts)',
    'put-volume': 'Volume - Contracts traded today (includes fractional contracts)',
  };
  
  return tooltips[columnKey] || '';
};