'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Position } from '@/components/omlp/my-lending-positions'

interface LendingPositionsContextType {
  positions: Position[]
  addPosition: (token: string, amount: number, apy: number) => void
  updatePosition: (token: string, newAmount: number) => void
  removePosition: (token: string) => void
  getPosition: (token: string) => Position | undefined
}

const LendingPositionsContext = createContext<LendingPositionsContextType | undefined>(undefined)

export function LendingPositionsProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<Position[]>([])

  const addPosition = (token: string, amount: number, apy: number) => {
    setPositions(prev => {
      const existingIndex = prev.findIndex(p => p.token === token)
      
      if (existingIndex >= 0) {
        // Update existing position by adding to the amount
        const updated = [...prev]
        const existing = updated[existingIndex]
        updated[existingIndex] = {
          ...existing,
          amount: existing.amount + amount,
          // Recalculate earned based on time and new amount
          earned: existing.earned + (amount * apy / 100 * 0.1) // Mock earned calculation
        }
        return updated
      } else {
        // Create new position
        const newPosition: Position = {
          token,
          amount,
          apy,
          earned: amount * apy / 100 * 0.1 // Mock earned calculation (10% of annual yield)
        }
        return [...prev, newPosition]
      }
    })
  }

  const updatePosition = (token: string, newAmount: number) => {
    setPositions(prev => 
      prev.map(position => 
        position.token === token 
          ? { 
              ...position, 
              amount: newAmount,
              // Keep the same earned ratio when updating amount
              earned: newAmount > 0 ? (position.earned / position.amount) * newAmount : 0
            }
          : position
      ).filter(position => position.amount > 0) // Remove positions with 0 or negative amounts
    )
  }

  const removePosition = (token: string) => {
    setPositions(prev => prev.filter(position => position.token !== token))
  }

  const getPosition = (token: string): Position | undefined => {
    return positions.find(p => p.token === token)
  }

  return (
    <LendingPositionsContext.Provider value={{
      positions,
      addPosition,
      updatePosition,
      removePosition,
      getPosition
    }}>
      {children}
    </LendingPositionsContext.Provider>
  )
}

export function useLendingPositions() {
  const context = useContext(LendingPositionsContext)
  if (context === undefined) {
    throw new Error('useLendingPositions must be used within a LendingPositionsProvider')
  }
  return context
}
