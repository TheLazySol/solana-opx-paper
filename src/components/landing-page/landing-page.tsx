'use client'

import { Card, CardBody, CardHeader, CardFooter } from "@heroui/react"
import { Button } from "@heroui/react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"

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

const stats = [
  {
    label: "Notional Volume",
    value: "-"
  },
  {
    label: "TVL", 
    value: "-"
  },
  {
    label: "Trades",
    value: "-"
  }
]

export default function DashboardFeature() {
  const router = useRouter()
  
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
      className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 scrollbar-hide-delay"
    >
      {/* Main Container with Horizontal Layout */}
      <div className="max-w-7xl mx-auto">


        {/* Hero Content - Horizontal Layout */}
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[60vh]">
          {/* Left Side - Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-8"
          >
            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight"
            >
              Trade
              <br />
              <span className="bg-gradient-to-r from-[#4a85ff] to-[#1851c4] bg-clip-text text-transparent font-bold">
                DeFi Options
              </span>
              <br />
              Like Never Before
            </motion.h1>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-lg md:text-xl text-gray-400 max-w-lg leading-relaxed"
            >
              <strong>OPX</strong> is an options trading protocol built on Solana.
              Experience the next chapter of decentralized finance.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
            <Button
              size="lg"
              className="bg-gradient-to-r from-[#4a85ff] to-[#1851c4] text-white font-semibold px-8 py-3 text-xl
                transition-all duration-200 hover:scale-105 active:scale-95
                hover:shadow-2xl hover:shadow-[#4a85ff]/40
                active:shadow-inner active:shadow-[#4a85ff]/60"
              onPress={() => {
                router.push('/trade')
              }}
            >
              Trade
            </Button>
            </motion.div>
          </motion.div>

          {/* Right Side - Image and Statistics */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="flex flex-col items-center space-y-12"
          >
            {/* OPX Logo Centered */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="flex justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <Image
                  src="/OPX_LOGO_Chrome.png"
                  alt="Solana OPX Logo"
                  width={450}
                  height={112}
                  className="transition-all duration-300"
                />
              </motion.div>
            </motion.div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-3 gap-8 lg:gap-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: 1.4 + index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="text-center"
                >
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {stat.label}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    {stat.value}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Feature Cards Section */}
      <div className="max-w-7xl mx-auto mt-20">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
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
              delay: 1.6 + index * 0.1,
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
                overflow-hidden h-full group"
            >
              <CardHeader className="p-6 pb-2 flex items-center justify-center">
                <motion.h3 
                  className="text-lg font-semibold text-center transition-all duration-300
                    bg-gradient-to-r from-[#4a85ff] to-[#1851c4] 
                    bg-clip-text text-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 + index * 0.1 }}
                >
                  {card.title}
                </motion.h3>
              </CardHeader>
              <CardBody className="p-6 pt-2 pb-4">
                <motion.p 
                  className="text-sm text-muted-foreground text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.9 + index * 0.1 }}
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
                    className="w-full bg-transparent border border-[#4a85ff]/30 
                      hover:bg-gradient-to-r hover:from-[#4a85ff]/20 hover:to-[#1851c4]/20
                      hover:border-[#4a85ff]/70 hover:shadow-lg hover:shadow-[#4a85ff]/25
                      active:bg-gradient-to-r active:from-[#4a85ff]/30 active:to-[#1851c4]/30
                      active:border-[#4a85ff]/80 active:shadow-inner
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
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4a85ff]/20 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                    
                    {/* Click ripple effect */}
                    <motion.div
                      className="absolute inset-0 bg-[#4a85ff]/20 rounded-sm"
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
      </div>

      {/* Additional Resources */}
      <div className="max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.2 }}
        className="flex flex-col items-center gap-4 mt-32"
      >
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.8, delay: 2.4 }}
          className="text-xl font-medium"
        >
          Additional Resources
        </motion.h2>
        <motion.div 
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.6 }}
        >
          {additionalResources.map((resource, index) => (
            <motion.div
              key={resource.title}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.4, 
                delay: 2.8 + index * 0.1,
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
                  hover:border-[#4a85ff]/60 hover:bg-gradient-to-r hover:from-[#4a85ff]/10 hover:to-[#1851c4]/10
                  active:bg-gradient-to-r active:from-[#4a85ff]/20 active:to-[#1851c4]/20
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
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4a85ff]/20 to-transparent"
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
      </div>
    </motion.div>
  )
}
