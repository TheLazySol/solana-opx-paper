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
                <Button 
                  variant="bordered"
                  className="w-full bg-transparent border border-[#e5e5e5]/50 dark:border-[#393939]
                    hover:bg-gray-900/50 hover:border-blue-500/50
                    transition-all duration-300"
                  size="md"
                  radius="sm"
                >
                  {card.buttonText}
                </Button>
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
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
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
                  hover:border-[#4a85ff]/40
                  hover:bg-[#4a85ff]/5
                  transition-all duration-300
                  hover:shadow-[0_0_15px_rgba(74,133,255,0.2)]"
              >
                {resource.title}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
