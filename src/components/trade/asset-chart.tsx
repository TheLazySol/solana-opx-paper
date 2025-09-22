import { FC, memo, useState, useEffect } from 'react'
import { TOKENS } from '@/constants/token-list/token-list'

interface AssetChartProps {
  selectedAsset: string
}

const AssetChartComponent: FC<AssetChartProps> = ({ selectedAsset }) => {
  const selectedToken = TOKENS[selectedAsset as keyof typeof TOKENS]
  const [isVisible, setIsVisible] = useState(false)

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100) // Small delay for smoother entry
    
    return () => clearTimeout(timer)
  }, [])
  
  // Only render the chart if the token exists and has a chart available
  if (!selectedToken) {
    return (
      <div className={`w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center text-neutral-400 
        transform transition-all duration-700 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-8 opacity-0'
      }`}>
        Chart not available for this asset
      </div>
    )
  }

  return (
    <div className={`w-full h-[480px] sm:h-[420px] md:h-[480px] lg:h-[540px] relative card-glass backdrop-blur-sm bg-white/5 dark:bg-black/30 
      border-[#e5e5e5]/20 dark:border-white/5 overflow-hidden shadow-lg rounded-lg
      transform transition-all duration-700 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-8 opacity-0 scale-98'
      }`}>
      <iframe 
        className="w-full h-full absolute inset-0"
        src={`https://birdeye.so/tv-widget/${selectedToken.address}?chain=solana&viewMode=pair&chartInterval=15&chartType=Candle&chartTimezone=America%2FNew_York&chartLeftToolbar=hide&theme=dark&cssCustomProperties=--tv-color-pane-background%3A%23040404&cssCustomProperties=--tv-color-platform-background%3A%23040404&chartOverrides=paneProperties.backgroundType%3Asolid&chartOverrides=paneProperties.background%3Argba%284%2C+4%2C+4%2C+1%29`}
        frameBorder="0" 
        allowFullScreen
      />
    </div>
  )
}

export const AssetChart = memo(AssetChartComponent)
AssetChart.displayName = 'AssetChart'