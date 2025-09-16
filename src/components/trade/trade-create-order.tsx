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
import { X, Plus, Minus, TrendingUp, TrendingDown, Calendar, DollarSign, Settings, Hash } from 'lucide-react'
import { useAssetPriceInfo } from '@/context/asset-price-provider'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { optionsAvailabilityTracker } from './option-data'
import { useMouseGlow } from '@/hooks/useMouseGlow'

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
  
  // Mouse glow effect hook for the main card
  const createOrderCardRef = useMouseGlow();

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <motion.div variants={itemVariants}>
        <Card 
          ref={createOrderCardRef}
          className="bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-slate-700/20 border border-slate-600/20 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out"
          style={{
            background: `
              radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                transparent 75%
              ),
              linear-gradient(to bottom right, 
                rgb(15 23 42 / 0.4), 
                rgb(30 41 59 / 0.3), 
                rgb(51 65 85 / 0.2)
              )
            `,
            transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
          }}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#4a85ff]/20 flex items-center justify-center">
                  <Settings className="w-3 h-3 text-[#4a85ff]" />
                </div>
                <h3 className="text-lg font-semibold text-white">Create Order</h3>
              </div>
              <Chip 
                size="sm" 
                variant="flat" 
                className="bg-white/10 text-white/70 border border-white/20"
              >
                {selectedOptions.length}/{MAX_OPTION_LEGS} legs
              </Chip>
            </div>
          </CardHeader>
          
          <CardBody className="p-3">
            {selectedOptions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="min-h-[80px] flex items-center justify-center"
              >
                <div className="text-center space-y-2">
                  <Hash className="w-8 h-8 text-white/30 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm text-white/60">Select options to build your order</p>
                    <p className="text-xs text-white/40">Add options to create your strategy</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
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
                        <Card className="bg-black/20 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-200">
                          <CardBody className="p-2 space-y-2">
                            {/* Header Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-1 flex-wrap">
                                {option.asset.toUpperCase() === 'SOL' && (
                                  <Image 
                                    src="/token-logos/solana_logo.png" 
                                    alt="Solana" 
                                    width={16} 
                                    height={16}
                                    className="rounded-full"
                                  />
                                )}
                                <span className="text-xs font-medium text-white/80">
                                  {option.asset.toUpperCase()}
                                </span>
                                <Chip 
                                  size="sm" 
                                  variant="flat"
                                  className={cn(
                                    "font-medium text-xs",
                                    option.type === 'bid' 
                                      ? "bg-green-500/20 text-green-400" 
                                      : "bg-red-500/20 text-red-400"
                                  )}
                                  startContent={
                                    option.type === 'bid' ? 
                                      <TrendingUp className="w-2 h-2" /> : 
                                      <TrendingDown className="w-2 h-2" />
                                  }
                                >
                                  {option.type === 'bid' ? 'Long' : 'Short'} {optionType}
                                </Chip>
                                <span className="text-xs text-blue-400 font-medium">
                                  ${option.strike}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-purple-400 font-medium">
                                  {expiryDate}
                                </span>
                                {onRemoveOption && (
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="text-white/60 hover:text-red-400 hover:bg-red-500/10 min-w-6 h-6"
                                    onPress={() => onRemoveOption(index)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <Divider className="bg-white/10" />

                            {/* Quantity and Order Type Row */}
                            <div className="flex items-start justify-between gap-4">
                              {/* Left side - Quantity */}
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-white/60">Qty:</span>
                                  <Input
                                    type="text"
                                    value={getDisplayQuantity(option)}
                                    onChange={(e) => handleQuantityInputChange(e, index)}
                                    size="sm"
                                    variant="flat"
                                    classNames={{
                                      base: "max-w-full",
                                      input: "text-xs text-center text-white py-0",
                                      inputWrapper: "bg-white/5 border-white/20 hover:border-white/30 data-[hover=true]:bg-white/10 data-[focus=true]:!bg-white/10 data-[focus-visible=true]:!bg-white/10 focus:!bg-white/10 w-12 h-6 min-h-6 px-1"
                                    }}
                                  />
                                </div>
                                {/* Available Options aligned with Premium */}
                                <div className="flex items-center gap-1 h-6">
                                  {option.type === 'bid' && (
                                    <>
                                      <span className="text-xs text-white/60">OA:</span>
                                      <span className="text-xs text-white/40">
                                        {getOptionsAvailableDisplay(option)}
                                      </span>
                                    </>
                                  )}
                                  {availabilityWarning && (
                                    <span className="text-amber-400 text-xs">{availabilityWarning}</span>
                                  )}
                                </div>
                              </div>

                              {/* Right side - Order Type and Premium */}
                              <div className="flex flex-col gap-2 items-end">
                                {/* Order Type Buttons */}
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant={orderTypes[legKey] === 'MKT' ? 'solid' : 'bordered'}
                                    className={`h-6 min-w-10 text-xs px-2 ${
                                      orderTypes[legKey] === 'MKT' 
                                        ? 'bg-[#4a85ff]/20 text-[#4a85ff] border-[#4a85ff]/40' 
                                        : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
                                    }`}
                                    onPress={() => handleOrderTypeChange(index, 'MKT')}
                                  >
                                    MKT
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={orderTypes[legKey] === 'LMT' ? 'solid' : 'bordered'}
                                    className={`h-6 min-w-10 text-xs px-2 ${
                                      orderTypes[legKey] === 'LMT' 
                                        ? 'bg-[#4a85ff]/20 text-[#4a85ff] border-[#4a85ff]/40' 
                                        : 'bg-transparent border-white/20 text-white/60 hover:border-white/30'
                                    }`}
                                    onPress={() => handleOrderTypeChange(index, 'LMT')}
                                  >
                                    LMT
                                  </Button>
                                </div>

                                {/* Premium under Order Type Buttons */}
                                <div className="flex items-center gap-2 h-6">
                                  {orderTypes[legKey] === 'MKT' ? (
                                    <div className="flex items-center gap-1 h-6">
                                      <span className="text-xs text-white/60">Premium:</span>
                                      <span className="text-sm font-medium text-[#4a85ff] transition-all duration-300 drop-shadow-[0_0_8px_rgba(74,133,255,0.8)] hover:drop-shadow-[0_0_12px_rgba(74,133,255,1)]">
                                        ${option.price.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 h-6">
                                      <span className="text-xs text-white/60">Premium:</span>
                                      <Input
                                        type="text"
                                        value={inputValues[legKey] || option.price.toFixed(2)}
                                        onChange={(e) => handlePriceInputChange(e, index)}
                                        size="sm"
                                        variant="flat"
                                        classNames={{
                                          base: "max-w-full",
                                          input: cn(
                                            "text-xs py-0",
                                            option.type === 'bid' ? "text-green-400" : "text-red-400"
                                          ),
                                          inputWrapper: "bg-white/5 border-white/20 hover:border-white/30 data-[hover=true]:bg-white/10 data-[focus=true]:!bg-white/10 data-[focus-visible=true]:!bg-white/10 focus:!bg-white/10 w-14 h-6 min-h-6 px-1"
                                        }}
                                        startContent={<span className="text-white/40 text-xs">$</span>}
                                      />
                                    </div>
                                  )}
                                </div>
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
      </motion.div>
    </motion.div>
  )
}