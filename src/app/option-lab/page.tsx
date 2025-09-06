"use client"

import { useState } from 'react';
import { OptionLabFormPro } from "@/components/option-lab/option-lab-form-pro"
import { OptionLabFormDegen } from "@/components/option-lab/option-lab-form-degen"
import { Switch, cn } from '@heroui/react';
import { motion } from 'framer-motion';

export default function MintOptionPage() {
  const [isProMode, setIsProMode] = useState(false);

  return (
    <div className="py-4 md:py-8 min-h-screen">
      <div className="mb-4 md:mb-6 text-center px-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-thin mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          Option Lab
        </h1>
        <p className="text-sm md:text-base text-white/60 max-w-2xl mx-auto">
          Create, visualize, and mint option contracts to list on Solana OPX
        </p>
        
        {/* Mode Selector */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <span className={cn(
            "text-sm font-medium transition-colors",
            !isProMode ? "text-[#4a85ff]" : "text-white/60"
          )}>
            Degen Mode
          </span>
          <Switch
            isSelected={isProMode}
            onValueChange={setIsProMode}
            size="sm"
            classNames={{
              wrapper: cn(
                "group-data-[selected=true]:bg-gradient-to-r",
                "group-data-[selected=true]:from-[#4a85ff]",
                "group-data-[selected=true]:to-[#5829f2]"
              ),
              thumb: cn(
                "group-data-[selected=true]:ml-6",
                "group-data-[selected=true]:bg-white"
              )
            }}
          />
          <span className={cn(
            "text-sm font-medium transition-colors",
            isProMode ? "text-[#5829f2]" : "text-white/60"
          )}>
            Pro Mode
          </span>
        </motion.div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-white/40 mt-2"
        >
          {isProMode 
            ? "Advanced interface with all options visible at once" 
            : "Simplified step-by-step interface for beginners"}
        </motion.p>
      </div>
      
      {isProMode ? <OptionLabFormPro /> : <OptionLabFormDegen />}
    </div>
  )
}