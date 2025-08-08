'use client'

import { Card, CardBody, CardHeader, CardFooter } from "@heroui/react"
import { Button } from "@heroui/react"
import { motion } from "framer-motion"
import Image from "next/image"

const additionalResources = [
  {
    title: "Docs",
    href: "https://docs.epicentrallabs.com/"
  },
  {
    title: "GitHub",
    href: "https://github.com/EpicentralLabs"
  },
  {
    title: "Discord",
    href: "https://discord.gg/5asAuY2sR8"
  }
]

export default function DashboardFeature() {
  const cards = [
    {
      title: "Trade More for Less",
      description: "One contract represents 100x of the underlying asset.",
      buttonText: "Trade Now"
    },
    {
      title: "Hedging Strategies", 
      description: "Allow for more strategic hedging opportunities to help mitigate risks.",
      buttonText: "Learn Options"
    },
    {
      title: "Market Making",
      description: "Short-sell options on margin and collect premiums every 400ms.",
      buttonText: "Mint Options"
    },
    {
      title: "Earn Yield",
      description: "Provide liquidity to the Option Margin Liquidity Pool (OMLP), earn yield.",
      buttonText: "Provide Liquidity"
    }
  ]

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center justify-center 
        min-h-screen py-32 gap-8 
        px-4 sm:px-6 lg:px-8
        scrollbar-hide-delay"
    >
      <motion.div 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative"
      >
        <div className="absolute inset-0 -z-10">
        </div>
        <div className="flex justify-center items-center w-full">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Image
              src="/OPX_LOGO_Chrome.png"
              alt="Solana OPX Logo"
              width={300}
              height={75}
              className="transition-all duration-300"
              priority
            />
          </motion.div>
        </div>
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="text-2xl text-white font-normal tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] -mt-4 -mb-4"
      >
       Onchain Options Trading
      </motion.h1>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16"
      >
        <div className="absolute inset-0 -z-10">
        </div>
        {cards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.8 + index * 0.1,
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 border-[#e5e5e5]/20 dark:border-white/5
                transition-all duration-300
                hover:bg-transparent hover:shadow-2xl hover:shadow-blue-500/10
                overflow-hidden h-full"
            >
              <CardHeader className="p-6 pb-2">
                <motion.h3 
                  className="text-lg font-normal text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + index * 0.1 }}
                >
                  {card.title}
                </motion.h3>
              </CardHeader>
              <CardBody className="p-6 pt-2 pb-4">
                <motion.p 
                  className="text-sm text-muted-foreground text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 + index * 0.1 }}
                >
                  {card.description}
                </motion.p>
              </CardBody>
              <CardFooter className="p-6 pt-0">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="w-full"
                >
                  <Button 
                    variant="bordered"
                    className="w-full bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939]
                      hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20
                      hover:border-blue-500/70 hover:shadow-lg hover:shadow-blue-500/25
                      active:bg-gradient-to-r active:from-blue-600/30 active:to-purple-600/30
                      active:border-blue-600/80 active:shadow-inner
                      transition-all duration-200 ease-out
                      group overflow-hidden relative"
                    size="md"
                    radius="sm"
                    onPress={() => {
                      // Add haptic feedback simulation with visual ripple effect
                      console.log(`${card.buttonText} clicked!`);
                    }}
                  >
                    <motion.span
                      className="relative z-10"
                      initial={{ y: 0 }}
                      whileTap={{ y: 1 }}
                      transition={{ duration: 0.1 }}
                    >
                      {card.buttonText}
                    </motion.span>
                    
                    {/* Animated background shimmer effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                    
                    {/* Click ripple effect */}
                    <motion.div
                      className="absolute inset-0 bg-blue-400/20 rounded-sm"
                      initial={{ scale: 0, opacity: 0 }}
                      whileTap={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Additional Resources */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="flex flex-col items-center gap-4 mt-48"
      >
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="text-xl font-medium"
        >
          Additional Resources
        </motion.h2>
        <motion.div 
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.8 }}
        >
          {additionalResources.map((resource, index) => (
            <motion.div
              key={resource.title}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.4, 
                delay: 2 + index * 0.1,
                type: "spring",
                stiffness: 200
              }}
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.92 }}
            >
              <Button
                as="a"
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                variant="bordered"
                size="sm"
                radius="sm"
                className="px-3 py-1.5 text-sm
                  backdrop-blur-sm bg-white/5 dark:bg-black/20
                  border border-[#4a85ff]/20 
                  hover:border-[#4a85ff]/60 hover:bg-gradient-to-r hover:from-[#4a85ff]/10 hover:to-purple-500/10
                  active:bg-gradient-to-r active:from-[#4a85ff]/20 active:to-purple-500/20
                  active:border-[#4a85ff]/80
                  transition-all duration-200 ease-out
                  hover:shadow-[0_0_20px_rgba(74,133,255,0.3)]
                  active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_0_25px_rgba(74,133,255,0.4)]
                  relative overflow-hidden group"
                onPress={() => {
                  console.log(`${resource.title} link clicked!`);
                }}
              >
                <motion.span
                  className="relative z-10"
                  initial={{ y: 0 }}
                  whileTap={{ y: 0.5 }}
                  transition={{ duration: 0.1 }}
                >
                  {resource.title}
                </motion.span>
                
                {/* Shimmer effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
                
                {/* Click pulse effect */}
                <motion.div
                  className="absolute inset-0 bg-[#4a85ff]/30 rounded-sm"
                  initial={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 1.2, opacity: [0, 1, 0] }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
