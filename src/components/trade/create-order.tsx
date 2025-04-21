import { FC, useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SelectedOption } from './option-data'
import { formatSelectedOption, MAX_OPTION_LEGS } from '@/constants/constants'
import { X, Plus, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import Image from 'next/image'

interface CreateOrderProps {
  selectedOptions: SelectedOption[]
  onRemoveOption?: (index: number) => void
  onUpdateQuantity?: (index: number, quantity: number) => void
  onUpdateLimitPrice?: (index: number, price: number) => void
}

// Define a type for stable leg identifiers
type LegKey = string; // option.index as string

export const CreateOrder: FC<CreateOrderProps> = ({ 
  selectedOptions = [],
  onRemoveOption,
  onUpdateQuantity,
  onUpdateLimitPrice
}) => {
  // Initialize with empty objects using stable identifiers
  const [orderTypes, setOrderTypes] = useState<Record<LegKey, 'MKT' | 'LMT'>>({});
  const [inputValues, setInputValues] = useState<Record<LegKey, string>>({});
  const [quantityInputs, setQuantityInputs] = useState<Record<LegKey, string>>({});

  // Update all state when options change
  useEffect(() => {
    // Update order types
    setOrderTypes(prev => {
      const newOrderTypes: Record<LegKey, 'MKT' | 'LMT'> = {};
      selectedOptions.forEach((option) => {
        const legKey = option.index.toString();
        newOrderTypes[legKey] = prev[legKey] || 'MKT';
      });
      return newOrderTypes;
    });

    // Update price input values
    setInputValues(prev => {
      const newValues = { ...prev };
      selectedOptions.forEach((option) => {
        const legKey = option.index.toString();
        // Always ensure there's a value
        newValues[legKey] = prev[legKey] || option.price.toFixed(2);
      });
      return newValues;
    });

    // Update quantity inputs
    setQuantityInputs(prev => {
      const newValues = { ...prev };
      selectedOptions.forEach((option) => {
        const legKey = option.index.toString();
        // Always ensure there's a value
        newValues[legKey] = prev[legKey] || option.quantity.toFixed(2);
      });
      return newValues;
    });
  }, [selectedOptions]);

  // Get unique assets from selected options
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uniqueAssets = [...new Set(selectedOptions.map(option => option.asset))];
  
  // Get price for each unique asset
  const { price: firstAssetPrice } = useAssetPriceInfo(uniqueAssets[0] || '');
  const { price: secondAssetPrice } = useAssetPriceInfo(uniqueAssets[1] || '');
  const { price: thirdAssetPrice } = useAssetPriceInfo(uniqueAssets[2] || '');
  const { price: fourthAssetPrice } = useAssetPriceInfo(uniqueAssets[3] || '');
  
  // Create assetPriceMap in useMemo to prevent unnecessary re-renders
  const assetPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    
    if (uniqueAssets[0] && firstAssetPrice) {
      map.set(uniqueAssets[0], firstAssetPrice);
    }
    
    if (uniqueAssets[1] && secondAssetPrice) {
      map.set(uniqueAssets[1], secondAssetPrice);
    }
    
    if (uniqueAssets[2] && thirdAssetPrice) {
      map.set(uniqueAssets[2], thirdAssetPrice);
    }
    
    if (uniqueAssets[3] && fourthAssetPrice) {
      map.set(uniqueAssets[3], fourthAssetPrice);
    }
    
    return map;
  }, [
    uniqueAssets,
    firstAssetPrice,
    secondAssetPrice,
    thirdAssetPrice,
    fourthAssetPrice
  ]);

  const handleQuantityChange = (index: number, delta: number) => {
    if (!onUpdateQuantity) return
    
    const option = selectedOptions[index]
    const currentQuantity = option.quantity || 0.01
    const newQuantity = Math.max(0.01, +(currentQuantity + delta).toFixed(2)) // Ensure quantity doesn't go below 0.01
    onUpdateQuantity(index, newQuantity)
    
    // Update quantity input field using the stable identifier
    const legKey = option.index.toString()
    setQuantityInputs(prev => ({
      ...prev,
      [legKey]: newQuantity.toFixed(2)
    }))
  }

  // Handle direct quantity input changes
  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!onUpdateQuantity) return

    const option = selectedOptions[index]
    const legKey = option.index.toString()
    const inputValue = e.target.value;

    // Allow empty field, numbers, and decimal numbers with up to 2 decimal places
    if (inputValue === '' || /^\d*\.?\d{0,2}$/.test(inputValue)) {
      setQuantityInputs(prev => ({ ...prev, [legKey]: inputValue || '0.01' }));

      // Only update the actual quantity if it's a valid number and at least 0.01
      if (inputValue !== '' && inputValue !== '.') {
        const parsed = parseFloat(inputValue);
        if (!isNaN(parsed) && parsed >= 0.01) {
          onUpdateQuantity(index, parsed);
        }
      }
    }
  }

  // Handle switching between MKT and LMT
  const handleOrderTypeChange = (index: number, type: 'MKT' | 'LMT') => {
    const option = selectedOptions[index]
    const legKey = option.index.toString()
    
    setOrderTypes(prev => ({ ...prev, [legKey]: type }));
    
    if (type === 'MKT') {
      // When switching to MKT, set limit price to current market price
      if (onUpdateLimitPrice) {
        onUpdateLimitPrice(index, option.price);
      }
      // Reset input value to current market price
      setInputValues(prev => ({ 
        ...prev, 
        [legKey]: option.price.toFixed(2) 
      }));
    }
  };

  // Handle price input changes
  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const option = selectedOptions[index]
    const legKey = option.index.toString()
    
    if (!onUpdateLimitPrice || orderTypes[legKey] === 'MKT') return;
    
    const inputValue = e.target.value;
    
    // Don't allow negative numbers
    if (inputValue.startsWith('-')) return;
    
    // Update the display value immediately for all valid inputs
    if (inputValue === '' || /^\d*\.?\d{0,2}$/.test(inputValue)) {
      setInputValues(prev => ({ ...prev, [legKey]: inputValue || '0.00' }));
      
      // Only update the actual price if it's a valid number
      if (inputValue !== '' && inputValue !== '.') {
        const parsed = parseFloat(inputValue);
        if (!isNaN(parsed)) {
          onUpdateLimitPrice(index, parsed);
        }
      }
    }
  };

  // Get the display price for an option
  const getDisplayPrice = (option: SelectedOption): string => {
    const legKey = option.index.toString()
    if (orderTypes[legKey] === 'MKT') {
      return option.price.toFixed(2);
    }
    return inputValues[legKey] || option.price.toFixed(2); // Ensure always a defined value
  };

  // Ensure we have a valid quantity value for display
  const getDisplayQuantity = (option: SelectedOption): string => {
    const legKey = option.index.toString()
    return quantityInputs[legKey] || option.quantity.toFixed(2);
  };

  return (
    <div className="w-full card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 transition-all duration-300 
      hover:bg-transparent shadow-lg rounded-lg p-2 sm:p-4">
      <div className="space-y-2 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold">Create Order</h3>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {selectedOptions.length}/{MAX_OPTION_LEGS} legs
          </div>
        </div>

        {selectedOptions.length === 0 ? (
          <div className="min-h-[80px] sm:min-h-[100px] flex items-center justify-center text-muted-foreground text-sm sm:text-base">
            <p>Select options from the chain above to build your order</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedOptions.map((option, index) => {
              // Format the option display string
              const formattedOption = formatSelectedOption({
                asset: option.asset,
                side: option.side,
                strike: option.strike,
                expiry: option.expiry
              })
              
              // Extract option type (Call/Put) from the formatted string
              const optionType = formattedOption.includes('Call') ? 'Call' : 'Put'
              
              // Extract and format the expiry date
              const expiryDate = option.expiry.split('T')[0] // Assuming ISO date format
              
              // Clean the option name to show asset and strike separately
              const assetName = option.asset
              const strikePrice = `$${option.strike}`
              
              // Determine price color based on option type
              const priceColor = option.type === 'bid' 
                ? 'text-green-500' 
                : 'text-red-500'
                
              // Get the stable leg key for this option
              const legKey = option.index.toString()
              
              return (
                <Card key={`${option.asset}-${option.side}-${option.strike}-${option.expiry}-${option.index}`} className="bg-black/10 border border-white/10">
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex flex-col space-y-2 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                         {assetName.toUpperCase() === 'SOL' && (
                           <Image 
                             src="/token-logos/solana_logo.png" 
                             alt="Solana Logo" 
                             width={20} 
                             height={20} 
                             className="mr-1.5"
                           />
                         )}
                         <Badge variant="grey" className="capitalize">
                            {assetName}
                          </Badge>
                          <Badge variant={option.type === 'bid' ? 'success' : 'destructive'} className="capitalize">
                            {option.type === 'bid' ? 'Long' : 'Short'}
                          </Badge>
                          <Badge variant="blue" className="capitalize">
                            {optionType}
                          </Badge>
                          <Badge variant="blue" className="capitalize">
                            {strikePrice}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <Badge variant="blue" className="capitalize">
                            EXP: {expiryDate}
                          </Badge>
                          {onRemoveOption && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-white"
                              onClick={() => onRemoveOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-6 w-16 px-2 py-0 text-xs ${
                            orderTypes[legKey] === 'MKT' 
                              ? 'bg-[#4a85ff]/10 border border-[#4a85ff]/40 hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60' 
                              : 'bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] hover:bg-[#4a85ff]/10 hover:border-[#4a85ff]/40'
                          } transition-all duration-200`}
                          onClick={() => handleOrderTypeChange(index, 'MKT')}
                        >
                          MKT
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-6 w-16 px-2 py-0 text-xs ${
                            orderTypes[legKey] === 'LMT' 
                              ? 'bg-[#4a85ff]/10 border border-[#4a85ff]/40 hover:bg-[#4a85ff]/20 hover:border-[#4a85ff]/60' 
                              : 'bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939] hover:bg-[#4a85ff]/10 hover:border-[#4a85ff]/40'
                          } transition-all duration-200`}
                          onClick={() => handleOrderTypeChange(index, 'LMT')}
                        >
                          LMT
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {orderTypes[legKey] === 'MKT' ? (
                            // Market Price Display (Text)
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm text-muted-foreground">Current Price:</span>
                              <span className={`text-xs sm:text-sm font-medium ${priceColor}`}>
                                ${option.price.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            // Limit Price Input
                            <>
                              <span className="text-xs sm:text-sm text-muted-foreground">Set Limit Price:</span>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-muted-foreground">$</span>
                                <Input
                                  type="text"
                                  value={inputValues[legKey] || option.price.toFixed(2)}
                                  onChange={(e) => handlePriceInputChange(e, index)}
                                  className={`h-6 w-16 text-xs sm:text-sm pl-5 ${priceColor}`}
                                  placeholder="Enter price"
                                />
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs sm:text-sm text-muted-foreground">Qty:</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(index, -0.01)}
                              title="Decrease by 0.01"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>

                            <div className="relative w-14">
                              <Input
                                type="text"
                                value={getDisplayQuantity(option)}
                                onChange={(e) => handleQuantityInputChange(e, index)}
                                className="h-6 text-xs sm:text-sm text-center px-1"
                                placeholder="Qty"
                              />
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(index, 0.01)}
                              title="Increase by 0.01"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
} 