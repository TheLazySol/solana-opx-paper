'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import * as React from 'react'
import {ReactNode, Suspense, useEffect, useRef} from 'react'
import toast, {Toaster} from 'react-hot-toast'
import Image from 'next/image'
import { useTheme } from 'next-themes'

import {AccountChecker} from '../account/account-ui'
import {ClusterChecker, ClusterUiSelect, ExplorerLink} from '../cluster/cluster-ui'
import {WalletButton} from '../solana/solana-provider'
import {ThemeToggle} from '../theme-toggle'

export function UiLayout({ children, links }: { children: ReactNode; links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          <div className="w-[200px]">
            <Link href="/" className="block transition-transform hover:scale-105 duration-200">
              <Image 
                src={theme === 'dark' ? '/epicentral-logo-light.png' : '/epicentral-logo-dark.png'}
                alt="Epicentral Labs Logo"
                width={120}
                height={35}
                className="h-[35px] w-auto object-contain"
                priority
                onError={(e) => {
                  console.error('Error loading image:', e);
                }}
              />
            </Link>
          </div>
          <div className="flex-1 flex justify-center">
            <nav className="flex items-center gap-8">
              {links.map(({ label, path }) => (
                <Link
                  key={path}
                  href={path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname.startsWith(path) ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="w-[200px] flex justify-end items-center space-x-4">
            <ThemeToggle />
            <WalletButton />
            <ClusterUiSelect />
          </div>
        </div>
      </div>
      <ClusterChecker>
        <AccountChecker />
      </ClusterChecker>
      <main className="container mx-auto py-6">
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
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            <span className="text-violet-500">© 2025 Epicentral Labs || Powered by Solana</span>
          </p>
        </div>
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
