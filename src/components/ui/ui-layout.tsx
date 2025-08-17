'use client'

import Link from 'next/link'
import * as React from 'react'
import {ReactNode, Suspense, useEffect, useRef} from 'react'
import toast, {Toaster} from 'react-hot-toast'
import { useTheme } from 'next-themes'
import { useCluster } from '../../solana/clusters/clusterDataAccess'
import {ClusterChecker, ExplorerLink} from '../solana/user-settings/rpc-dropdown-select'
import {WalletBalanceLogger} from '../solana/user-wallet/wallet-balance'
import { Navbar } from './navbar'

export function UiLayout({ children, links }: { children: ReactNode; links: { label: string; path: string }[] }) {
  const { cluster } = useCluster()

  return (
    <div className="min-h-screen bg-background">
      <Navbar links={links} />
      <ClusterChecker>
        <WalletBalanceLogger />
      </ClusterChecker>
      <main className="mx-auto py-6 px-2 sm:px-4 max-w-[1600px] xl:max-w-[1800px] 2xl:max-w-[2000px]">
        <Suspense
          fallback={
            <div className="flex justify-center my-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }
        >
          {children}
        </Suspense>
        <Toaster position="bottom-right" />
      </main>
      <footer className="py-4 text-center text-sm">
        <span className="text-[#4a85ff]">
          © 2025 Epicentral Labs || Powered by{' '}
          <a 
            href="https://solana.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
          >
            Solana
          </a>
        </span>
      </footer>
    </div>
  )
}

export function AppModal({
  children,
  title,
  hide,
  show,
  submit,
  submitDisabled,
  submitLabel,
}: {
  children: ReactNode
  title: string
  hide: () => void
  show: boolean
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    if (!dialogRef.current) return
    if (show) {
      dialogRef.current.showModal()
    } else {
      dialogRef.current.close()
    }
  }, [show, dialogRef])

  return (
    <dialog className="modal" ref={dialogRef}>
      <div className="modal-box space-y-5">
        <h3 className="font-bold text-lg">{title}</h3>
        {children}
        <div className="modal-action">
          <div className="join space-x-2">
            {submit ? (
              <button className="btn btn-xs lg:btn-md btn-primary" onClick={submit} disabled={submitDisabled}>
                {submitLabel || 'Save'}
              </button>
            ) : null}
            <button onClick={hide} className="btn">
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

export function AppHero({
  children,
  title,
  subtitle,
}: {
  children?: ReactNode
  title: ReactNode
  subtitle: ReactNode
}) {
  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          {typeof title === 'string' ? <h1 className="text-5xl font-bold">{title}</h1> : title}
          {typeof subtitle === 'string' ? <p className="py-6">{subtitle}</p> : subtitle}
          {children}
        </div>
      </div>
    </div>
  )
}

export function ellipsify(str = '', len = 4) {
  if (str.length > 30) {
    return str.substring(0, len) + '..' + str.substring(str.length - len, str.length)
  }
  return str
}

export function useTransactionToast() {
  return (signature: string) => {
    toast.success(
      <div className={'text-center'}>
        <div className="text-lg">Transaction sent</div>
        <ExplorerLink path={`tx/${signature}`} label={'View Transaction'} className="btn btn-xs btn-primary" />
      </div>,
    )
  }
}
