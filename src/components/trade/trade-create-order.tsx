import { FC, useMemo, useState, useEffect } from 'react'
import { 
  Button, 
  Card, 
  CardBody, 
  CardHeader,
  Badge, 
  Input,
  Chip,
  ButtonGroup,
  Tooltip,
  Divider,
  cn
} from '@heroui/react'
import { SelectedOption } from './option-data'
import { formatSelectedOption, MAX_OPTION_LEGS } from '@/constants/constants'
import { X, Plus, Minus, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { optionsAvailabilityTracker } from './option-data'

// Define minimum quantity constant
const MIN_QTY = 0.1 // 1/10th contract

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
  const [maxAvailableOptions, setMaxAvailableOptions] = useState<Record<LegKey, number>>({});

  // Update all state when options change
  useEffect(() => {
    // Create a new state object for max available options
    const newMaxAvailable: Record<LegKey, number> = {};
    
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

    // Update quantity inputs and check max available options
    setQuantityInputs(prev => {
      const newQuantityInputs = { ...prev };
      let needsUpdate = false;
      
      selectedOptions.forEach((option) => {
        const legKey = option.index.toString();
        
        // Preserve existing quantity input or initialize with current option quantity
        if (!newQuantityInputs[legKey]) {
          const safeQuantity = option.quantity || MIN_QTY;
          newQuantityInputs[legKey] = safeQuantity.toFixed(2);
          needsUpdate = true;
        }
        
        // If option type is 'bid', get the maximum available
        if (option.type === 'bid') {
          const availableOptions = optionsAvailabilityTracker.getOptionsAvailable(
            option.strike, 
            option.expiry, 
            option.side
          );
          
          // Store the max available (default to 0 if undefined)
          const safeAvailableOptions = availableOptions ?? 0;
          newMaxAvailable[legKey] = safeAvailableOptions;
          
          // If current quantity is more than available, cap it
          const qtyRequested = option.quantity || MIN_QTY;
          if (qtyRequested > safeAvailableOptions && safeAvailableOptions > 0) {
            // Update the quantity in parent component
            if (onUpdateQuantity) {
              onUpdateQuantity(selectedOptions.findIndex(opt => opt.index === option.index), safeAvailableOptions);
              // Also update the local input value to match
              newQuantityInputs[legKey] = safeAvailableOptions.toFixed(2);
              needsUpdate = true;
            }
          }
        }
      });
      
      // Set the max available options state
      setMaxAvailableOptions(newMaxAvailable);
      
      // Only update if something changed
      return needsUpdate ? newQuantityInputs : prev;
    });
  }, [selectedOptions, onUpdateQuantity]);

  // Get unique assets from selected options
  const uniqueAssets = useMemo(() => {
    return [...new Set(selectedOptions.map(option => option.asset))];
  }, [selectedOptions]);
  
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
    const currentQuantity = option.quantity || MIN_QTY
    let newQuantity = Math.max(MIN_QTY, +(currentQuantity + delta).toFixed(2)) // Ensure quantity doesn't go below MIN_QTY
    
    // If bidding (buying), check maximum available
    const legKey = option.index.toString()
    if (option.type === 'bid') {
      const maxAvailable = maxAvailableOptions[legKey] ?? 0
      if (maxAvailable > 0 && newQuantity > maxAvailable) {
        newQuantity = maxAvailable
      }
    }
    
    // Important: Update only the EXACT option that was modified (by index)
    onUpdateQuantity(index, newQuantity)
    
    // Update quantity input field using the stable identifier
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
      // Only update the actual quantity if it's a valid number and at least MIN_QTY
      if (inputValue !== '' && inputValue !== '.') {
        let parsed = parseFloat(inputValue);
        
        if (!isNaN(parsed) && parsed >= MIN_QTY) {
          // If bidding (buying), check maximum available
          if (option.type === 'bid') {
            const maxAvailable = maxAvailableOptions[legKey] ?? 0
            if (maxAvailable > 0 && parsed > maxAvailable) {
              parsed = maxAvailable
              // Update the input field with the capped value
              setQuantityInputs(prev => ({ ...prev, [legKey]: maxAvailable.toFixed(2) }));
              // Update parent component with capped value - specifically for this leg only
              onUpdateQuantity(index, parsed);
              return; // Exit early since we've already updated everything
            }
          }
          
          // If we didn't hit the cap, update normally - this specific leg only
          setQuantityInputs(prev => ({ ...prev, [legKey]: inputValue }));
          onUpdateQuantity(index, parsed);
        } else {
          // Still update the input field for usability
          setQuantityInputs(prev => ({ ...prev, [legKey]: inputValue }));
        }
      } else {
        // Empty or just a decimal point - update input field only
        setQuantityInputs(prev => ({ ...prev, [legKey]: inputValue }));
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

  // Get available options warning if needed
  const getAvailableOptionsWarning = (option: SelectedOption): string | null => {
    const legKey = option.index.toString()
    if (option.type === 'bid') {
      const availableQty = maxAvailableOptions[legKey] ?? 0
      if (availableQty === 0) {
        return "No options available";
      } else {
        const qtyRequested = option.quantity || MIN_QTY;
        if (qtyRequested > availableQty) {
          return `Max available: ${availableQty.toFixed(2)}`;
        }
      }
    }
    return null;
  };

  // Get available options display
  const getOptionsAvailableDisplay = (option: SelectedOption): string => {
    const legKey = option.index.toString()
    if (option.type === 'bid') {
      const availableQty = maxAvailableOptions[legKey] ?? 0
      return availableQty.toFixed(2);
    }
    return "∞"; // Unlimited for ask options
  };

  return (
    <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Create Order
          </h3>
          <Chip 
            size="sm" 
            variant="flat" 
            className="bg-white/10 text-white/70"
          >
            {selectedOptions.length}/{MAX_OPTION_LEGS} legs
          </Chip>
        </div>
      </CardHeader>
      
      <CardBody className="gap-3">
        {selectedOptions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[120px] flex items-center justify-center"
          >
            <div className="text-center space-y-2">
              <p className="text-white/60">Select options from the chain above to build your order</p>
              <p className="text-sm text-white/40">Start adding options to create your strategy</p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {selectedOptions.map((option, index) => {
                const legKey = option.index.toString()
                const availabilityWarning = getAvailableOptionsWarning(option)
                const optionType = option.side === 'call' ? 'Call' : 'Put'
                const expiryDate = option.expiry.split('T')[0]
                
                return (
                  <motion.div
                    key={`${option.asset}-${option.side}-${option.strike}-${option.expiry}-${option.index}`}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-200">
                      <CardBody className="p-4 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {option.asset.toUpperCase() === 'SOL' && (
                              <Image 
                                src="/token-logos/solana_logo.png" 
                                alt="Solana" 
                                width={24} 
                                height={24}
                                className="rounded-full"
                              />
                            )}
                            <Chip size="sm" variant="flat" className="bg-white/10">
                              {option.asset.toUpperCase()}
                            </Chip>
                            <Chip 
                              size="sm" 
                              variant="flat"
                              className={cn(
                                "font-medium",
                                option.type === 'bid' 
                                  ? "bg-green-500/20 text-green-400" 
                                  : "bg-red-500/20 text-red-400"
                              )}
                              startContent={
                                option.type === 'bid' ? 
                                  <TrendingUp className="w-3 h-3" /> : 
                                  <TrendingDown className="w-3 h-3" />
                              }
                            >
                              {option.type === 'bid' ? 'Long' : 'Short'} {optionType}
                            </Chip>
                            <Chip 
                              size="sm" 
                              variant="flat" 
                              className="bg-blue-500/20 text-blue-400"
                              startContent={<DollarSign className="w-3 h-3" />}
                            >
                              ${option.strike}
                            </Chip>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Chip 
                              size="sm" 
                              variant="flat" 
                              className="bg-purple-500/20 text-purple-400"
                              startContent={<Calendar className="w-3 h-3" />}
                            >
                              {expiryDate}
                            </Chip>
                            {onRemoveOption && (
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="text-white/60 hover:text-red-400 hover:bg-red-500/10"
                                onPress={() => onRemoveOption(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <Divider className="bg-white/10" />

                        {/* Order Type and Price Row */}
                        <div className="flex items-center gap-4">
                          <ButtonGroup size="sm" variant="flat">
                            <Button
                              className={cn(
                                "transition-all",
                                orderTypes[legKey] === 'MKT' 
                                  ? "bg-blue-500/20 text-blue-400 border-blue-400/50" 
                                  : "bg-white/5 text-white/60 hover:bg-white/10"
                              )}
                              onPress={() => handleOrderTypeChange(index, 'MKT')}
                            >
                              MKT
                            </Button>
                            <Button
                              className={cn(
                                "transition-all",
                                orderTypes[legKey] === 'LMT' 
                                  ? "bg-blue-500/20 text-blue-400 border-blue-400/50" 
                                  : "bg-white/5 text-white/60 hover:bg-white/10"
                              )}
                              onPress={() => handleOrderTypeChange(index, 'LMT')}
                            >
                              LMT
                            </Button>
                          </ButtonGroup>

                          <div className="flex items-center gap-2 flex-1">
                            {orderTypes[legKey] === 'MKT' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/60">Market Price:</span>
                                <span className={cn(
                                  "text-sm font-semibold",
                                  option.type === 'bid' ? "text-green-400" : "text-red-400"
                                )}>
                                  ${option.price.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm text-white/60">Limit Price:</span>
                                <Input
                                  type="text"
                                  value={inputValues[legKey] || option.price.toFixed(2)}
                                  onChange={(e) => handlePriceInputChange(e, index)}
                                  size="sm"
                                  variant="flat"
                                  classNames={{
                                    input: cn(
                                      "text-sm font-semibold",
                                      option.type === 'bid' ? "text-green-400" : "text-red-400"
                                    ),
                                    inputWrapper: "bg-white/5 border border-transparent rounded-lg backdrop-blur-sm h-10 hover:bg-white/8 data-[hover=true]:bg-white/8 data-[focus=true]:bg-white/10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none data-[focus=true]:ring-0 data-[focus=true]:shadow-none w-24"
                                  }}
                                  startContent={<span className="text-white/40">$</span>}
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quantity Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/60">Quantity:</span>
                            <ButtonGroup size="sm" variant="flat">
                              <Button
                                isIconOnly
                                className="bg-white/5 hover:bg-white/10"
                                onPress={() => handleQuantityChange(index, -MIN_QTY)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="text"
                                value={getDisplayQuantity(option)}
                                onChange={(e) => handleQuantityInputChange(e, index)}
                                size="sm"
                                variant="flat"
                                classNames={{
                                  input: "text-sm text-center font-medium text-white",
                                  inputWrapper: "bg-white/5 border border-transparent rounded-lg backdrop-blur-sm h-10 hover:bg-white/8 data-[hover=true]:bg-white/8 data-[focus=true]:bg-white/10 focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none data-[focus=true]:ring-0 data-[focus=true]:shadow-none w-20"
                                }}
                              />
                              <Button
                                isIconOnly
                                className="bg-white/5 hover:bg-white/10"
                                onPress={() => handleQuantityChange(index, MIN_QTY)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </ButtonGroup>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {option.type === 'bid' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/40">Available:</span>
                                <span className="text-xs font-medium text-white/60">
                                  {getOptionsAvailableDisplay(option)}
                                </span>
                              </div>
                            )}
                            {availabilityWarning && (
                              <span className="text-xs text-amber-400">{availabilityWarning}</span>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </CardBody>
    </Card>
  )
}