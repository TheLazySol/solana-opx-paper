'use client'

import { FC, useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { 
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card, 
  CardBody, 
  Input, 
  Button, 
  Select, 
  SelectItem, 
  Tooltip,
  Chip,
  cn
} from '@heroui/react'
import { SelectedOption } from './option-data'
import { motion, AnimatePresence } from 'framer-motion'
import { BASE_ANNUAL_INTEREST_RATE, MAX_LEVERAGE, BORROW_FEE_RATE, ASSET_PRICE_REFRESH_INTERVAL } from '@/constants/constants'
import { Info, AlertTriangle, Zap, Shield, Coins, Check, X, DollarSign } from 'lucide-react'
import { useMouseGlow } from '@/hooks/useMouseGlow'
import { getTokenPrice } from '@/lib/api/getTokenPrice'
import { COLLATERAL_TYPES } from '@/constants/constants'

interface CollateralModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (collateralData: CollateralData) => void
  selectedOptions: SelectedOption[]
  selectedAsset: string
  isDebit: boolean
  externalCollateralNeeded: number
}

export interface CollateralData {
  collateralProvided: string
  collateralType: string
  leverage: number
  borrowedAmount: number
  hasEnoughCollateral: boolean
  shortOptionIds?: string[] // Track which short options this collateral is for
}

// Helper function to format leverage value to 3 decimal places, removing trailing zeros
const formatLeverageValue = (value: number): string => {
  return value.toFixed(3).replace(/\.?0+$/, '');
};

export const CollateralModal: FC<CollateralModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedOptions = [],
  selectedAsset,
  isDebit,
  externalCollateralNeeded
}) => {
  const hasSelectedOptions = selectedOptions.length > 0
  const contractSize = 100 // Each option contract represents 100 units

  // Mouse glow effect hooks for each card
  const collateralCardRef = useMouseGlow();
  const leverageCardRef = useMouseGlow();
  const statusCardRef = useMouseGlow();

  // State for collateral input and leverage
  const [collateralProvided, setCollateralProvided] = useState<string>("0")
  const [leverage, setLeverage] = useState<number>(1)
  const [leverageInputValue, setLeverageInputValue] = useState<string>("1")
  const [collateralType, setCollateralType] = useState<string>(
    COLLATERAL_TYPES.find(type => type.default)?.value || "USDC"
  )
  const [showMaxLeverageAlert, setShowMaxLeverageAlert] = useState<boolean>(false);
  const maxLeverageAlertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [collateralPrice, setCollateralPrice] = useState<number>(1); // Price of selected collateral in USD

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCollateralProvided("0")
      setLeverage(1)
      setLeverageInputValue("1")
      setAutoMode(false)
      setShowMaxLeverageAlert(false)
    }
  }, [isOpen])

  // Fetch SOL price and collateral price
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Always fetch SOL price for fee calculations
        const solPriceData = await getTokenPrice('SOL');
        const finalSolPrice = solPriceData.price > 0 ? solPriceData.price : 100;
        setSolPrice(finalSolPrice);
        
        // Fetch collateral price if it's not USDC
        if (collateralType === 'SOL') {
          setCollateralPrice(finalSolPrice);
        } else {
          setCollateralPrice(1); // USDC is always 1:1 with USD
        }
        
        if (solPriceData.price === 0) {
          console.warn('SOL price API returned 0, using fallback price of $100 for calculations');
        }
      } catch (error) {
        console.error('Error fetching prices:', error);
        setSolPrice(100);
        setCollateralPrice(collateralType === 'SOL' ? 100 : 1);
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, ASSET_PRICE_REFRESH_INTERVAL * 20);
    
    return () => clearInterval(interval);
  }, [collateralType]);

  // Calculate total collateral needed based on option positions
  const calculateCollateralNeeded = useMemo(() => {
    let totalCollateral = 0
    const contractSize = 100 // Each option contract represents 100 units
    
    // Separate options by type
    const shortCalls = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'call')
    const shortPuts = selectedOptions.filter(opt => opt.type === 'ask' && opt.side === 'put')
    const longCalls = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'call')
    const longPuts = selectedOptions.filter(opt => opt.type === 'bid' && opt.side === 'put')

    // Handle short calls with quantity-aware matching
    if (shortCalls.length > 0) {
      // Create array of long calls with remaining quantities for tracking
      const availableLongCalls = longCalls.map(longCall => ({
        ...longCall,
        remainingQuantity: longCall.quantity || 1
      })).sort((a, b) => a.strike - b.strike) // Sort by strike ascending for better matching

      shortCalls.forEach(shortCall => {
        const shortQuantity = shortCall.quantity || 1
        let remainingShortQuantity = shortQuantity
        
        // Try to match with available long calls (strike <= short call strike for coverage)
        for (const availableLongCall of availableLongCalls) {
          if (remainingShortQuantity <= 0) break
          if (availableLongCall.remainingQuantity <= 0) continue
          if (availableLongCall.strike > shortCall.strike) continue // Can't cover
          
          // Calculate how much can be covered by this long call
          const coveredByThisLong = Math.min(remainingShortQuantity, availableLongCall.remainingQuantity)
          
          // Update remaining quantities
          remainingShortQuantity -= coveredByThisLong
          availableLongCall.remainingQuantity -= coveredByThisLong
        }
        
        // Add collateral for any remaining uncovered short quantity
        if (remainingShortQuantity > 0) {
          totalCollateral += shortCall.strike * contractSize * remainingShortQuantity
        }
      })
    }

    // Handle short puts with quantity-aware matching
    if (shortPuts.length > 0) {
      // Create array of long puts with remaining quantities for tracking
      const availableLongPuts = longPuts.map(longPut => ({
        ...longPut,
        remainingQuantity: longPut.quantity || 1
      })).sort((a, b) => b.strike - a.strike) // Sort by strike descending for better matching

      shortPuts.forEach(shortPut => {
        const shortQuantity = shortPut.quantity || 1
        let remainingShortQuantity = shortQuantity
        
        // Try to match with available long puts (strike >= short put strike for coverage)
        for (const availableLongPut of availableLongPuts) {
          if (remainingShortQuantity <= 0) break
          if (availableLongPut.remainingQuantity <= 0) continue
          if (availableLongPut.strike < shortPut.strike) continue // Can't cover
          
          // Calculate how much can be covered by this long put
          const coveredByThisLong = Math.min(remainingShortQuantity, availableLongPut.remainingQuantity)
          
          // Update remaining quantities
          remainingShortQuantity -= coveredByThisLong
          availableLongPut.remainingQuantity -= coveredByThisLong
        }
        
        // Add collateral for any remaining uncovered short quantity
        if (remainingShortQuantity > 0) {
          totalCollateral += shortPut.strike * contractSize * remainingShortQuantity
        }
      })
    }

    return totalCollateral
  }, [selectedOptions])

  // Convert collateral to USD for calculations
  const collateralProvidedUSD = Number(collateralProvided || 0) * collateralPrice;
  
  // Calculate the actual collateral requirement based on strike price and contract quantity
  const actualCollateralRequired = calculateCollateralNeeded;
  
  // Calculate amount borrowed (collateral * (leverage - 1)) in USD
  const amountBorrowed = collateralProvidedUSD * (Number(leverage) - 1);
  
  // Calculate borrow costs
  const dailyBorrowRate = BORROW_FEE_RATE; // This is already daily rate (0.035%)
  const borrowCost = amountBorrowed * dailyBorrowRate; // Daily borrow cost
  const borrowFee = amountBorrowed * 0.001; // 0.1% borrow fee
  
  // Calculate borrowed amount based on collateral and leverage
  const borrowedAmount = useMemo(() => {
    if (!Number(collateralProvided) || leverage <= 1) return 0;
    return collateralProvidedUSD * (leverage - 1);
  }, [collateralProvided, leverage, collateralProvidedUSD]);

  // Calculate total coverage including leverage (collateral + borrowed amount) in USD
  const totalCoverage = collateralProvidedUSD * Number(leverage);
  const collateralPercentage = actualCollateralRequired > 0 
    ? (totalCoverage / actualCollateralRequired) * 100
    : 0;

  // Calculate if enough collateral is provided
  const hasEnoughCollateral = totalCoverage >= calculateCollateralNeeded

  // Calculate maximum leverage that would result in exactly 100% coverage
  const maxLeverageFor100Percent = collateralProvidedUSD > 0 && actualCollateralRequired > 0
    ? Math.max(1, actualCollateralRequired / collateralProvidedUSD)
    : MAX_LEVERAGE;

  // Dynamic max leverage (capped at MAX_LEVERAGE, but limited by 100% coverage and never below 1)
  const dynamicMaxLeverage = Math.min(MAX_LEVERAGE, Math.max(1, maxLeverageFor100Percent));

  const isDisabled = !hasSelectedOptions || (isDebit && externalCollateralNeeded === 0)

  // Handle collateral change
  const handleCollateralChange = useCallback((value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCollateralProvided(value);
      
      // Auto-adjust leverage when in auto mode
      if (autoMode && value !== '' && !isNaN(Number(value)) && actualCollateralRequired > 0) {
        const collateralUSD = Number(value) * collateralPrice;
        if (collateralUSD > 0) {
          // Calculate optimal leverage up to 10x to reach 100% coverage
          const optimalLeverage = Math.min(MAX_LEVERAGE, actualCollateralRequired / collateralUSD);
          const clampedLeverage = Math.max(1, optimalLeverage);
          setLeverage(clampedLeverage);
          setLeverageInputValue(formatLeverageValue(clampedLeverage));
        }
      }
    }
  }, [autoMode, actualCollateralRequired, collateralPrice]);

  // Reset collateral input when collateral type changes
  const collateralTypeRef = useRef(collateralType);
  useEffect(() => {
    if (collateralTypeRef.current !== collateralType) {
      collateralTypeRef.current = collateralType;
      
      // Use setTimeout to prevent cascading updates
      setTimeout(() => {
        setCollateralProvided("0");
        setLeverage(1);
        setLeverageInputValue(formatLeverageValue(1));
        setAutoMode(false); // Also reset auto mode when changing types
      }, 0);
    }
  }, [collateralType]);

  // Handle confirm
  const handleConfirm = () => {
    // Get identifiers for short options to track which positions this collateral is for
    const shortOptionIds = selectedOptions
      .filter(option => option.type === 'ask')
      .map(option => `${option.asset}-${option.side}-${option.strike}-${option.expiry}`)
      .sort();

    const collateralData: CollateralData = {
      collateralProvided,
      collateralType,
      leverage,
      borrowedAmount,
      hasEnoughCollateral,
      shortOptionIds
    }
    onConfirm(collateralData)
    onClose()
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="5xl"
      backdrop="blur"
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1]
            }
          },
          exit: {
            y: -20,
            opacity: 0,
            scale: 0.95,
            transition: {
              duration: 0.2,
              ease: [0.4, 0, 1, 1]
            }
          }
        }
      }}
      classNames={{
        base: "bg-transparent",
        wrapper: "items-center justify-center p-4",
        body: "p-0"
      }}
      hideCloseButton
      isDismissable={false}
      isKeyboardDismissDisabled={true}
    >
      <ModalContent className="bg-gradient-to-br from-gray-950/98 via-gray-900/95 to-gray-800/90 border border-gray-700/30 backdrop-blur-lg max-h-[90vh] overflow-hidden">
        <ModalHeader className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-gray-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#4a85ff]/10 flex items-center justify-center border border-[#4a85ff]/20">
              <Shield className="w-4 h-4 text-[#4a85ff]" />
            </div>
            <h2 className="text-xl font-medium text-white/90">
              Provide Collateral for Short Position
            </h2>
          </div>
          <Button
            isIconOnly
            variant="flat"
            size="sm"
            className="bg-white/5 hover:bg-white/10 border border-white/10"
            onPress={onClose}
          >
            <X className="w-4 h-4 text-white/70" />
          </Button>
        </ModalHeader>

        <ModalBody className="p-6 overflow-y-auto bg-gray-950/70">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Main Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Collateral Input Section */}
              <motion.div variants={itemVariants}>
                <div ref={collateralCardRef}>
                    <Card
                    className={cn(
                      "bg-gradient-to-br from-gray-950/90 via-gray-900/80 to-gray-800/70 border border-gray-700/40 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out",
                      isDisabled && "opacity-50 pointer-events-none"
                    )}
                    style={{
                      background: `
                        radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                          rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                          rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                          rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                          transparent 75%
                        ),
                        linear-gradient(to bottom right, 
                          rgb(17 24 39 / 0.9), 
                          rgb(31 41 55 / 0.8), 
                          rgb(55 65 81 / 0.7)
                        )
                      `,
                      transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
                    }}
                  >
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[#4a85ff]/10 flex items-center justify-center border border-[#4a85ff]/20">
                        <Coins className="w-3 h-3 text-[#4a85ff]" />
                      </div>
                      <h3 className="text-sm font-medium text-white/90">Collateral Amount</h3>
                    </div>
                    <div className="space-y-3">
                      {/* Collateral Type Selector */}
                      <Select
                        label="Collateral Type"
                        selectedKeys={[collateralType]}
                        onSelectionChange={(keys) => setCollateralType(Array.from(keys)[0] as string)}
                        className="w-full"
                        isDisabled={isDisabled}
                        size="sm"
                        classNames={{
                          trigger: "bg-white/5 border-white/10 hover:border-white/20 data-[hover=true]:bg-white/10",
                          value: "text-white/90",
                          label: "text-white/60"
                        }}
                      >
                        {COLLATERAL_TYPES.map(type => (
                          <SelectItem key={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </Select>
                      
                      {/* Collateral Amount Input */}
                      <Input
                        type="text"
                        label="Collateral Amount"
                        placeholder="0.00"
                        value={collateralProvided}
                        onValueChange={handleCollateralChange}
                        isDisabled={isDisabled}
                        size="sm"
                        startContent={
                          collateralType === 'USDC' ? (
                            <div className="pointer-events-none flex items-center">
                              <span className="text-white/60">$</span>
                            </div>
                          ) : null
                        }
                        endContent={
                          <Chip size="sm" variant="flat" className="bg-white/10">
                            {collateralType}
                          </Chip>
                        }
                        classNames={{
                          base: "max-w-full",
                          input: "text-white/90",
                          inputWrapper: "bg-white/5 border-white/10 hover:border-white/20 data-[hover=true]:bg-white/10 data-[focus=true]:!bg-white/10 data-[focus-visible=true]:!bg-white/10 focus:!bg-white/10"
                        }}
                      />
                      
                      {/* Auto Select Buttons */}
                      <div className="flex gap-2 items-center">
                        {/* Auto Mode Toggle */}
                        <Button
                          size="sm"
                          variant={autoMode ? "solid" : "flat"}
                          isDisabled={isDisabled}
                          onPress={() => {
                            const newAutoMode = !autoMode;
                            setAutoMode(newAutoMode);
                            
                            // If turning auto mode ON and there's collateral provided, auto-adjust leverage
                            if (newAutoMode && collateralProvided !== '' && Number(collateralProvided) > 0 && actualCollateralRequired > 0) {
                              const collateralUSD = Number(collateralProvided) * collateralPrice;
                              if (collateralUSD > 0) {
                                // Calculate optimal leverage up to 10x to reach 100% coverage
                                const optimalLeverage = Math.min(MAX_LEVERAGE, actualCollateralRequired / collateralUSD);
                                const clampedLeverage = Math.max(1, optimalLeverage);
                                setLeverage(clampedLeverage);
                                setLeverageInputValue(formatLeverageValue(clampedLeverage));
                              }
                            }
                          }}
                          className={cn(
                            "text-xs transition-all",
                            autoMode 
                              ? "bg-[#4a85ff] text-white shadow-[0_0_12px_rgba(74,133,255,0.6)]" 
                              : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          Auto
                        </Button>
                        
                        {/* Minimum at 10x leverage */}
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={autoMode || isDisabled}
                          onPress={() => {
                            // Calculate exact collateral needed for 100% coverage at 10x leverage + $0.01 buffer
                            const targetLeverage = MAX_LEVERAGE;
                            const minCollateralUSD = (actualCollateralRequired / targetLeverage) + 0.01; // Add $0.01 buffer
                            const minCollateral = (minCollateralUSD / collateralPrice).toFixed(collateralType === 'SOL' ? 4 : 2);
                            
                            setCollateralProvided(minCollateral);
                            setLeverage(targetLeverage);
                            setLeverageInputValue(formatLeverageValue(targetLeverage));
                          }}
                          className={cn(
                            "text-xs",
                            (autoMode || isDisabled)
                              ? "bg-white/5 text-white/40 cursor-not-allowed" 
                              : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          10%
                        </Button>
                        
                        {/* Half at 5x leverage */}
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={autoMode || isDisabled}
                          onPress={() => {
                            // Calculate exact collateral needed for 100% coverage at 5x leverage + $0.01 buffer
                            const targetLeverage = 5;
                            const halfCollateralUSD = (actualCollateralRequired / targetLeverage) + 0.01; // Add $0.01 buffer
                            const halfCollateral = (halfCollateralUSD / collateralPrice).toFixed(collateralType === 'SOL' ? 4 : 2);
                            
                            setCollateralProvided(halfCollateral);
                            setLeverage(targetLeverage);
                            setLeverageInputValue(formatLeverageValue(targetLeverage));
                          }}
                          className={cn(
                            "text-xs",
                            (autoMode || isDisabled)
                              ? "bg-white/5 text-white/40 cursor-not-allowed" 
                              : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          50%
                        </Button>
                        
                        {/* Full at 1x leverage */}
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={autoMode || isDisabled}
                          onPress={() => {
                            // Calculate exact collateral needed for 100% coverage at 1x leverage + $0.01 buffer
                            const targetLeverage = 1;
                            const fullCollateralUSD = actualCollateralRequired + 0.01; // Add $0.01 buffer
                            const fullCollateral = (fullCollateralUSD / collateralPrice).toFixed(collateralType === 'SOL' ? 4 : 2);
                            
                            setCollateralProvided(fullCollateral);
                            setLeverage(targetLeverage);
                            setLeverageInputValue(formatLeverageValue(targetLeverage));
                          }}
                          className={cn(
                            "text-xs",
                            (autoMode || isDisabled)
                              ? "bg-white/5 text-white/40 cursor-not-allowed" 
                              : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          100%
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                  </Card>
                </div>
              </motion.div>

              {/* Leverage Section */}
              <motion.div variants={itemVariants}>
                <div ref={leverageCardRef}>
                    <Card
                    className={cn(
                      "bg-gradient-to-br from-gray-950/90 via-gray-900/80 to-gray-800/70 border border-gray-700/40 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out",
                      isDisabled && "opacity-50 pointer-events-none"
                    )}
                    style={{
                      background: `
                        radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                          rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                          rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                          rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                          transparent 75%
                        ),
                        linear-gradient(to bottom right, 
                          rgb(17 24 39 / 0.9), 
                          rgb(31 41 55 / 0.8), 
                          rgb(55 65 81 / 0.7)
                        )
                      `,
                      transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
                    }}
                  >
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[#4a85ff]/10 flex items-center justify-center border border-[#4a85ff]/20">
                        <Zap className="w-3 h-3 text-[#4a85ff]" />
                      </div>
                      <h3 className="text-sm font-medium text-white/90">Leverage</h3>
                    </div>
                    
                      {/* Leverage Usage Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>1x</span>
                          <span>{MAX_LEVERAGE}x Max</span>
                        </div>
                        <Tooltip 
                          content={
                            <div className="text-xs font-light space-y-1">
                              <div>Current Leverage: <span className="text-[#4a85ff]">{Number(leverage).toFixed(2)}x</span></div>
                              <div>Usage: <span className="text-[#4a85ff]">{((Number(leverage) / MAX_LEVERAGE) * 100).toFixed(1)}%</span></div>
                              <div className="text-white/60">Adjust using input field or auto buttons</div>
                            </div>
                          }
                          placement="top"
                        >
                          <div className="relative h-3 w-full bg-white/10 rounded-full" style={{ padding: '2px' }}>
                            <div 
                              className="absolute left-0 h-full transition-all duration-300 rounded-full"
                              style={{ 
                                width: `${((Number(leverage) - 1) / (MAX_LEVERAGE - 1)) * 100}%`,
                                background: '#4a85ff',
                                boxShadow: `0 0 ${Math.min(20, 6 + (Number(leverage) / MAX_LEVERAGE) * 14)}px rgba(74, 133, 255, ${Math.min(0.9, 0.4 + (Number(leverage) / MAX_LEVERAGE) * 0.5)})`,
                                top: '2px',
                                height: 'calc(100% - 4px)'
                              }}
                            />
                            {/* Marker for current dynamic max if different from MAX_LEVERAGE */}
                            {dynamicMaxLeverage < MAX_LEVERAGE && (
                              <div 
                                className="absolute w-0.5 bg-white/60"
                                style={{ 
                                  left: `${((dynamicMaxLeverage - 1) / (MAX_LEVERAGE - 1)) * 100}%`,
                                  top: '2px',
                                  height: 'calc(100% - 4px)'
                                }}
                              />
                            )}
                          </div>
                        </Tooltip>
                      </div>
                    
                    {/* Leverage Details */}
                    <div className="mt-3 p-3 bg-gray-950/60 rounded-lg border border-white/5">
                      <div className="space-y-3">
                        {/* First Row - Main Details */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">Amount Borrowed</p>
                            <p className="text-xs font-medium text-white/90">
                              {selectedAsset && solPrice > 0 ? (
                                `${(amountBorrowed / solPrice).toFixed(4)} ${selectedAsset || 'SOL'}`
                              ) : (
                                '0.0000 SOL'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">OMLP Route</p>
                            <p className="text-xs font-medium text-white/90">SAP-1 ({selectedAsset || 'SOL'})</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">Leverage</p>
                            <input
                              aria-label="Leverage value"
                              className="w-full px-2 py-1 text-xs font-medium text-white/90 bg-white/5 outline-none transition-colors rounded hover:bg-white/10 focus:bg-white/10"
                              type="text"
                              value={leverageInputValue}
                              disabled={isDisabled}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const v = e.target.value;
                                // Allow empty string, numbers up to 2 digits before decimal, and up to 3 decimal places
                                if (v === '' || /^\d{1,2}(\.\d{0,3})?$/.test(v)) {
                                  setLeverageInputValue(v);
                                  // Auto-sync leverage value while typing (if valid number)
                                  if (v !== '' && !isNaN(Number(v))) {
                                    const inputValue = Number(v);
                                    const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, inputValue));
                                    setLeverage(clampedValue);
                                    
                                    // Clear existing timeout
                                    if (maxLeverageAlertTimeoutRef.current) {
                                      clearTimeout(maxLeverageAlertTimeoutRef.current);
                                    }
                                    
                                    // Show max leverage alert with 50ms delay if we hit the limit
                                    if (clampedValue >= dynamicMaxLeverage && dynamicMaxLeverage < MAX_LEVERAGE) {
                                      maxLeverageAlertTimeoutRef.current = setTimeout(() => {
                                        setShowMaxLeverageAlert(true);
                                        setTimeout(() => setShowMaxLeverageAlert(false), 5000);
                                      }, 50);
                                    }
                                  }
                                }
                              }}
                              onBlur={() => {
                                // Clear existing timeout
                                if (maxLeverageAlertTimeoutRef.current) {
                                  clearTimeout(maxLeverageAlertTimeoutRef.current);
                                }
                                
                                // Format the input value when user finishes editing
                                if (leverageInputValue !== '' && !isNaN(Number(leverageInputValue))) {
                                  const inputValue = Number(leverageInputValue);
                                  const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, inputValue));
                                  setLeverage(clampedValue);
                                  setLeverageInputValue(formatLeverageValue(clampedValue));
                                } else if (leverageInputValue === '') {
                                  // Reset to 1 if empty
                                  setLeverage(1);
                                  setLeverageInputValue(formatLeverageValue(1));
                                }
                              }}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === "Enter" && leverageInputValue !== '' && !isNaN(Number(leverageInputValue))) {
                                  // Clear existing timeout
                                  if (maxLeverageAlertTimeoutRef.current) {
                                    clearTimeout(maxLeverageAlertTimeoutRef.current);
                                  }
                                  
                                  const inputValue = Number(leverageInputValue);
                                  const clampedValue = Math.min(dynamicMaxLeverage, Math.max(1, inputValue));
                                  setLeverage(clampedValue);
                                  setLeverageInputValue(formatLeverageValue(clampedValue));
                                  
                                  // Blur the input to trigger formatting
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="1.0"
                            />
                          </div>
                        </div>
                        
                        {/* Second Row - Costs and Risk */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">Est. Daily Interest</p>
                            <p className="text-xs font-medium text-white/90">${borrowCost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">Borrow Fee</p>
                            <p className="text-xs font-medium text-white/90">${borrowFee.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/40 mb-0.5">Liquidation Risk</p>
                            <Chip
                              size="sm"
                              variant="flat"
                              className={cn(
                                "text-xs",
                                Number(leverage) === 1 ? "bg-green-500/20 text-green-400" :
                                Number(leverage) <= 3 ? "bg-blue-500/20 text-blue-400" :
                                Number(leverage) <= 5 ? "bg-yellow-500/20 text-yellow-400" :
                                Number(leverage) <= 7 ? "bg-orange-500/20 text-orange-400" :
                                "bg-red-500/20 text-red-400"
                              )}
                            >
                              {Number(leverage) === 1 ? 'Minimal' :
                               Number(leverage) <= 3 ? 'Low' :
                               Number(leverage) <= 5 ? 'Medium' :
                               Number(leverage) <= 7 ? 'High' :
                               'Very High'}
                            </Chip>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                  </Card>
                </div>
              </motion.div>
            </div>

            {/* Collateral Status */}
            <motion.div variants={itemVariants}>
              <div ref={statusCardRef}>
                  <Card
                  className={cn(
                    "bg-gradient-to-br from-gray-950/90 via-gray-900/80 to-gray-800/70 border border-gray-700/40 backdrop-blur-sm relative overflow-hidden transition-all duration-300 ease-out",
                    isDisabled && "opacity-50 pointer-events-none"
                  )}
                  style={{
                    background: `
                      radial-gradient(var(--glow-size, 600px) circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                        rgba(74, 133, 255, calc(0.15 * var(--glow-opacity, 0) * var(--glow-intensity, 1))), 
                        rgba(88, 80, 236, calc(0.08 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 25%,
                        rgba(74, 133, 255, calc(0.03 * var(--glow-opacity, 0) * var(--glow-intensity, 1))) 50%,
                        transparent 75%
                      ),
                      linear-gradient(to bottom right, 
                        rgb(17 24 39 / 0.9), 
                        rgb(31 41 55 / 0.8), 
                        rgb(55 65 81 / 0.7)
                      )
                    `,
                    transition: 'var(--glow-transition, all 200ms cubic-bezier(0.4, 0, 0.2, 1))'
                  }}
                >
                <CardBody className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-md bg-[#4a85ff]/10 flex items-center justify-center border border-[#4a85ff]/20">
                      <Shield className="w-3 h-3 text-[#4a85ff]" />
                    </div>
                    <h4 className="text-sm font-medium text-white/90">Collateral Status</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-white/40">Provided</p>
                        {Number(collateralProvided) === 0 ? (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        ) : (
                          <Check className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-white/90">
                        ${collateralProvidedUSD.toFixed(2)}
                        {collateralType !== 'USDC' && Number(collateralProvided) > 0 && (
                          <span className="text-xs text-white/60 ml-1">
                            ({Number(collateralProvided).toFixed(collateralType === 'SOL' ? 4 : 2)} {collateralType})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-white/40">Remaining Coverage Needed</p>
                        {Math.max(0, actualCollateralRequired - totalCoverage) > 0 ? (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        ) : (
                          <Check className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-white/90">
                        ${Math.max(0, actualCollateralRequired - totalCoverage).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-white/40">Coverage</p>
                        {collateralPercentage < 100 ? (
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                        ) : (
                          <Check className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                      <p 
                        className={cn(
                          "text-sm font-medium transition-all duration-300",
                          collateralPercentage >= 100 
                            ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" 
                            : ""
                        )}
                        style={{
                          color: collateralPercentage >= 100 
                            ? 'rgb(34 197 94)' 
                            : `rgb(${255 - (collateralPercentage * 1.21)} ${255 - (collateralPercentage * 0.58)} ${255 - (collateralPercentage * 0.61)})`,
                          filter: collateralPercentage >= 100 
                            ? 'drop-shadow(0 0 8px rgba(34,197,94,0.8))' 
                            : `drop-shadow(0 0 ${collateralPercentage * 0.08}px rgba(34,197,94,${collateralPercentage * 0.008}))`
                        }}
                      >
                        {collateralPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardBody>
                </Card>
              </div>
            </motion.div>

            {/* Max Leverage Alert */}
            <AnimatePresence>
              {Number(leverage) >= dynamicMaxLeverage && dynamicMaxLeverage < MAX_LEVERAGE && showMaxLeverageAlert && (
                <motion.div 
                  key="max-leverage-alert"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-amber-300 font-medium mb-1">
                        Maximum Leverage Reached
                      </p>
                      <p className="text-xs text-amber-300/80">
                        You&apos;ve reached the maximum leverage ({dynamicMaxLeverage.toFixed(2)}x) needed for 100% trade coverage. Add more collateral to increase leverage further.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Warning Message */}
            {!hasEnoughCollateral && Number(collateralProvided) > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-400">
                  Insufficient collateral. Increase amount or leverage to proceed.
                </span>
              </motion.div>
            )}

          </motion.div>
        </ModalBody>

        <ModalFooter className="border-t border-white/5 px-6 py-4 bg-gray-950/80">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-white/60">
              <DollarSign className="w-4 h-4" />
              <span>Required: ${actualCollateralRequired.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="flat"
                onPress={onClose}
                className="bg-white/5 hover:bg-white/10 border border-white/10"
              >
                Cancel
              </Button>
              <Button
                className={cn(
                  "font-semibold transition-all duration-300",
                  hasEnoughCollateral
                    ? "bg-gradient-to-r from-[#4a85ff] to-[#1851c4] text-white shadow-lg shadow-[#4a85ff]/25 hover:shadow-[#4a85ff]/40"
                    : "bg-white/10 text-white/40 border border-white/10"
                )}
                isDisabled={!hasEnoughCollateral}
                onPress={handleConfirm}
              >
                Confirm Collateral
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
